import bcrypt from 'bcryptjs';
import { db } from '@/lib/db';
import { audit } from '@/lib/audit';
import { jsonError } from '@/lib/auth';
import { configuredRateLimit, consumeRateLimitBucket, limitedResponse, requestClientIp } from '@/lib/abuse-limits';

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const name = typeof body.name === 'string' ? body.name.trim() : '';
  const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
  const password = typeof body.password === 'string' ? body.password : '';
  const confirmation = typeof body.confirmation === 'string' ? body.confirmation : '';
  if (name.length < 2 || name.length > 100) return jsonError('Escribe tu nombre completo.', 400);
  if (!/^\S+@\S+\.\S+$/.test(email)) return jsonError('Escribe un correo válido.', 400);
  if (password.length < 8) return jsonError('La contraseña debe tener al menos 8 caracteres.', 400);
  if (password !== confirmation) return jsonError('Las contraseñas no coinciden.', 400);
  if (body.terms !== true) return jsonError('Acepta los términos para continuar.', 400);
  try {
    const ip = requestClientIp(req);
    const ipGate = await consumeRateLimitBucket('register-ip', ip, 60 * 60_000, configuredRateLimit('REGISTER_IP', 5));
    const emailGate = await consumeRateLimitBucket('register-email', email, 24 * 60 * 60_000, configuredRateLimit('REGISTER_EMAIL', 3));
    const globalGate = await consumeRateLimitBucket('register-global', 'global', 60 * 60_000, configuredRateLimit('REGISTER_GLOBAL', 20));
    if (!ipGate.allowed || !emailGate.allowed || !globalGate.allowed) {
      const gate = !ipGate.allowed ? ipGate : !emailGate.allowed ? emailGate : globalGate;
      return limitedResponse(429, gate.retryAfterSeconds);
    }
  } catch {
    return jsonError('Solicitud no disponible', 503);
  }
  const accepted = () => Response.json({ message: 'Registro recibido. Inicia sesión para continuar.' }, { status: 202 });
  if (await db.user.findUnique({ where: { email }, select: { id: true } })) {
    await bcrypt.hash(password, 12);
    return accepted();
  }
  try {
    const user = await db.user.create({ data: { name, email, passwordHash: await bcrypt.hash(password, 12) } });
    await audit({ userId: user.id, action: 'REGISTER', entityType: 'User', entityId: user.id });
    return accepted();
  } catch (error) {
    if (error instanceof Error && error.message.includes('Unique constraint')) return accepted();
    return jsonError('No fue posible crear la cuenta.', 500);
  }
}
