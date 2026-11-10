import { authenticate, createSession, jsonError, sessionCookie } from '@/lib/auth';
import { db } from '@/lib/db';
import { audit } from '@/lib/audit';
import { checkRateLimitBucket, configuredRateLimit, consumeRateLimitBucket, limitedResponse, requestClientIp } from '@/lib/abuse-limits';

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const email = typeof body.email === 'string' ? body.email : '';
  const normalizedEmail = email.trim().toLowerCase().slice(0, 320) || 'invalid-email';
  let user;
  try {
    const ip = requestClientIp(req);
    const ipGate = await checkRateLimitBucket('login-ip', ip, 15 * 60_000, configuredRateLimit('LOGIN_IP', 10));
    user = await authenticate(email, typeof body.password === 'string' ? body.password : '');
    if (!user) {
      if (!ipGate.allowed) return limitedResponse(429, ipGate.retryAfterSeconds);
      const [failedIp, failedEmail] = await Promise.all([
        consumeRateLimitBucket('login-ip', ip, 15 * 60_000, configuredRateLimit('LOGIN_IP', 10)),
        consumeRateLimitBucket('login-email', normalizedEmail, 15 * 60_000, configuredRateLimit('LOGIN_EMAIL', 5)),
      ]);
      if (!failedIp.allowed) return limitedResponse(429, failedIp.retryAfterSeconds);
      if (!failedEmail.allowed) return jsonError('Credenciales invalidas', 401);
      return jsonError('Credenciales invalidas', 401);
    }
  } catch {
    return jsonError('Servicio temporalmente no disponible', 503);
  }
  if (!user) {
    return jsonError('Credenciales invalidas', 401);
  }
  const memberships = await db.membership.findMany({ where: { userId: user.id }, include: { business: true } });
  const token = await createSession(user.id, memberships.length === 1 ? memberships[0].businessId : undefined);
  await audit({ userId: user.id, businessId: memberships[0]?.businessId, action: 'LOGIN', entityType: 'Session' });
  const response = Response.json({ user: { id: user.id, name: user.name, email: user.email }, businesses: memberships.map(membership => ({ id: membership.businessId, name: membership.business.name })), redirect: memberships.length > 1 ? '/negocios' : memberships.length === 1 ? '/dashboard' : '/negocios/crear' });
  response.headers.append('Set-Cookie', sessionCookie(token));
  return response;
}
