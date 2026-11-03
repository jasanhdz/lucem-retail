import { cookies } from 'next/headers';
import crypto from 'node:crypto';
import bcrypt from 'bcryptjs';
import { db } from './db';
import { Role } from '@prisma/client';
const COOKIE = 'lucem_session';
const SESSION_IDLE_MS = 30 * 60 * 1000;
const COOKIE_RENEWAL_WINDOW_MS = 5 * 60 * 1000;
const hash = (v: string) => crypto.createHash('sha256').update(v).digest('hex');
const cookieOptions = { httpOnly: true, sameSite: 'lax' as const, secure: process.env.NODE_ENV === 'production', maxAge: SESSION_IDLE_MS / 1000, path: '/' };
export async function createSession(userId: string, businessId?: string) { const token=crypto.randomBytes(32).toString('hex'); await db.session.create({data:{userId,activeBusinessId:businessId,tokenHash:hash(token),expiresAt:new Date(Date.now()+SESSION_IDLE_MS)}}); (await cookies()).set(COOKIE,token,cookieOptions); }
export async function getAuth(options: { renewCookie?: boolean } = {}) {
  const token = (await cookies()).get(COOKIE)?.value;
  if (!token) return null;
  const now = new Date();
  const session = await db.session.findUnique({ where: { tokenHash: hash(token) }, include: { user: { include: { memberships: { include: { business: true } } } }, activeBusiness: true } });
  if (!session || !session.user.active || session.expiresAt <= now) return null;
  const membership = session.user.memberships.find((item) => item.businessId === session.activeBusinessId);
  const shouldRenew = session.expiresAt.getTime() - now.getTime() <= COOKIE_RENEWAL_WINDOW_MS;
  if (shouldRenew && options.renewCookie) {
    const expiresAt = new Date(now.getTime() + SESSION_IDLE_MS);
    const updated = await db.session.updateMany({ where: { id: session.id, expiresAt: { gt: now } }, data: { lastActivityAt: now, expiresAt } });
    if (updated.count === 1) (await cookies()).set(COOKIE, token, cookieOptions);
  }
  return { session, user: session.user, business: session.activeBusiness && membership ? session.activeBusiness : undefined, membership };
}
export async function logout(){const token=(await cookies()).get(COOKIE)?.value;if(token)await db.session.deleteMany({where:{tokenHash:hash(token)}});(await cookies()).delete(COOKIE);}
export async function authenticate(email:string,password:string){const user=await db.user.findUnique({where:{email:email.trim().toLowerCase()},include:{memberships:true}});if(!user||!user.active||!(await bcrypt.compare(password,user.passwordHash)))return null;return user;}
export function permitted(role:Role|undefined, allowed:Role[]){return !!role&&allowed.includes(role);}
export function jsonError(message:string,status=400){return Response.json({error:message},{status});}
