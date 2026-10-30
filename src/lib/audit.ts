import { db } from './db';
export async function audit(data:{businessId?:string;userId?:string;action:string;entityType:string;entityId?:string;metadata?:object}) { await db.auditLog.create({data:{...data,metadata:data.metadata ?? {}}}); }
