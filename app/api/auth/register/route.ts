import bcrypt from 'bcryptjs';
import { db } from '@/lib/db';
import { audit } from '@/lib/audit';
import { createSession, jsonError, sessionCookie } from '@/lib/auth';

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
  if (await db.user.findUnique({ where: { email }, select: { id: true } })) return jsonError('Este correo ya está registrado.', 409);
  try {
    const user = await db.user.create({ data: { name, email, passwordHash: await bcrypt.hash(password, 12) } });
    const token = await createSession(user.id);
    await audit({ userId: user.id, action: 'REGISTER', entityType: 'User', entityId: user.id });
    const response = Response.json({ user: { id: user.id, name: user.name, email: user.email }, redirect: '/negocios/crear' }, { status: 201 });
    response.headers.append('Set-Cookie', sessionCookie(token));
    return response;
  } catch (error) {
    if (error instanceof Error && error.message.includes('Unique constraint')) return jsonError('Este correo ya está registrado.', 409);
    return jsonError('No fue posible crear la cuenta.', 500);
  }
}
