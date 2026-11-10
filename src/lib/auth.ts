import { cookies } from 'next/headers';
import crypto from 'node:crypto';
import bcrypt from 'bcryptjs';
import { db } from './db';
import { Role } from '@prisma/client';
const COOKIE = 'lucem_session';
const SESSION_IDLE_MS = 30 * 60 * 1000;
const COOKIE_RENEWAL_WINDOW_MS = 5 * 60 * 1000;
const hash = (v: string) => crypto.createHash('sha256').update(v).digest('hex');
const DUMMY_PASSWORD_HASH = bcrypt.hashSync(crypto.randomUUID(), 10);
const cookieOptions = { httpOnly: true, sameSite: 'lax' as const, secure: process.env.NODE_ENV === 'production', maxAge: SESSION_IDLE_MS / 1000, path: '/' };
export async function createSession(userId: string, businessId?: string) { const token=crypto.randomBytes(32).toString('hex'); await db.session.create({data:{userId,activeBusinessId:businessId,tokenHash:hash(token),expiresAt:new Date(Date.now()+SESSION_IDLE_MS)}}); return token; }
export function sessionCookie(token: string) {
  // Never infer TLS from client-controlled forwarded headers. The explicit override
  // exists only for the isolated HTTP loopback Playwright server.
  const secure = cookieOptions.secure && process.env.E2E_HTTP_LOOPBACK !== 'true';
  return `${COOKIE}=${token}; Path=/; Max-Age=${SESSION_IDLE_MS / 1000}; HttpOnly; SameSite=Lax${secure ? '; Secure' : ''}`;
}
export async function getAuth(options: { renewCookie?: boolean } = {}) {
  const token = (await cookies()).get(COOKIE)?.value;
  if (!token) return null;
  const now = new Date();
  const session = await db.session.findUnique({ where: { tokenHash: hash(token) }, include: { user: { include: { memberships: { include: { business: true } } } }, activeBusiness: true } });
  if (!session || !session.user.active || session.expiresAt <= now) return null;
  let activeBusinessId = session.activeBusinessId;
  let membership = session.user.memberships.find((item) => item.businessId === activeBusinessId);
  if (!membership && session.user.memberships.length > 0) {
    const fallbackMembership = [...session.user.memberships].sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime() || a.businessId.localeCompare(b.businessId))[0];
    const selected = await db.session.updateMany({
      where: { id: session.id, activeBusinessId },
      data: { activeBusinessId: fallbackMembership.businessId },
    });
    if (selected.count === 1) {
      activeBusinessId = fallbackMembership.businessId;
      membership = fallbackMembership;
    } else {
      const latest = await db.session.findUnique({ where: { id: session.id }, select: { activeBusinessId: true } });
      activeBusinessId = latest?.activeBusinessId ?? null;
      membership = session.user.memberships.find((item) => item.businessId === activeBusinessId);
    }
  }
  const shouldRenew = session.expiresAt.getTime() - now.getTime() <= COOKIE_RENEWAL_WINDOW_MS;
  if (shouldRenew && options.renewCookie) {
    const expiresAt = new Date(now.getTime() + SESSION_IDLE_MS);
    const updated = await db.session.updateMany({ where: { id: session.id, expiresAt: { gt: now } }, data: { lastActivityAt: now, expiresAt } });
    if (updated.count === 1) (await cookies()).set(COOKIE, token, cookieOptions);
  }
  return { session: { ...session, activeBusinessId }, user: session.user, business: membership?.business, membership };
}
export async function logout(){const token=(await cookies()).get(COOKIE)?.value;if(token)await db.session.deleteMany({where:{tokenHash:hash(token)}});(await cookies()).delete(COOKIE);}
export async function authenticate(email: string, password: string) {
  const user = await db.user.findUnique({ where: { email: email.trim().toLowerCase() }, include: { memberships: true } });
  const passwordMatches = await bcrypt.compare(password, user?.passwordHash ?? DUMMY_PASSWORD_HASH);
  if (!user || !user.active || !passwordMatches) return null;
  return user;
}
export function permitted(role:Role|undefined, allowed:Role[]){return !!role&&allowed.includes(role);}
export function jsonError(message:string,status=400){return Response.json({error:message},{status});}
