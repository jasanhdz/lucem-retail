import { authenticate, clearLoginFailures, createSession, isLoginRateLimited, jsonError, recordLoginFailure, sessionCookie } from '@/lib/auth';
import { db } from '@/lib/db';
import { audit } from '@/lib/audit';

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const email = typeof body.email === 'string' ? body.email : '';
  const limited = isLoginRateLimited(email);
  const user = limited ? null : await authenticate(email, typeof body.password === 'string' ? body.password : '');
  if (!user) {
    recordLoginFailure(email);
    return jsonError('Credenciales invalidas', 401);
  }
  clearLoginFailures(email);
  const memberships = await db.membership.findMany({ where: { userId: user.id }, include: { business: true } });
  const token = await createSession(user.id, memberships.length === 1 ? memberships[0].businessId : undefined);
  await audit({ userId: user.id, businessId: memberships[0]?.businessId, action: 'LOGIN', entityType: 'Session' });
  const response = Response.json({ user: { id: user.id, name: user.name, email: user.email }, businesses: memberships.map(membership => ({ id: membership.businessId, name: membership.business.name })), redirect: memberships.length > 1 ? '/negocios' : memberships.length === 1 ? '/dashboard' : '/negocios/crear' });
  response.headers.append('Set-Cookie', sessionCookie(token));
  return response;
}
