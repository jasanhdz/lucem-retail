import { cookies } from 'next/headers';
import crypto from 'node:crypto';
import bcrypt from 'bcryptjs';
import { db } from './db';
import { Role } from '@prisma/client';
const COOKIE = 'lucem_session';
const hash = (v: string) => crypto.createHash('sha256').update(v).digest('hex');
export async function createSession(userId: string, businessId?: string) { const token=crypto.randomBytes(32).toString('hex'); await db.session.create({data:{userId,activeBusinessId:businessId,tokenHash:hash(token),expiresAt:new Date(Date.now()+30*60*1000)}}); (await cookies()).set(COOKIE,token,{httpOnly:true,sameSite:'lax',secure:process.env.NODE_ENV==='production',maxAge:1800,path:'/'}); }
export async function getAuth() { const token=(await cookies()).get(COOKIE)?.value; if(!token)return null; const session=await db.session.findUnique({where:{tokenHash:hash(token)},include:{user:{include:{memberships:{include:{business:true}}}},activeBusiness:true}}); if(!session||session.expiresAt<new Date())return null; await db.session.update({where:{id:session.id},data:{lastActivityAt:new Date(),expiresAt:new Date(Date.now()+30*60*1000)}}); const membership=session.user.memberships.find(m=>m.businessId===session.activeBusinessId) ?? session.user.memberships[0]; return {session,user:session.user,business:session.activeBusiness ?? membership?.business,membership}; }
export async function logout(){const token=(await cookies()).get(COOKIE)?.value;if(token)await db.session.deleteMany({where:{tokenHash:hash(token)}});(await cookies()).delete(COOKIE);}
export async function authenticate(email:string,password:string){const user=await db.user.findUnique({where:{email},include:{memberships:true}});if(!user||!user.active||!(await bcrypt.compare(password,user.passwordHash)))return null;return user;}
export function permitted(role:Role|undefined, allowed:Role[]){return !!role&&allowed.includes(role);}
export function jsonError(message:string,status=400){return Response.json({error:message},{status});}
