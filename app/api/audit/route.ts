import { getAuth, jsonError, permitted } from '@/lib/auth';
import { db } from '@/lib/db';
import { Role } from '@prisma/client';

export async function GET() {
  const auth = await getAuth({ renewCookie: true });
  if (!auth?.business) return jsonError('Sesion requerida', 401);
  if (!permitted(auth.membership?.role, [Role.ADMIN])) return jsonError('No autorizado', 403);

  const rows = await db.auditLog.findMany({
    where: { businessId: auth.business.id },
    select: {
      id: true,
      businessId: true,
      userId: true,
      action: true,
      entityType: true,
      entityId: true,
      metadata: true,
      createdAt: true,
      user: { select: { id: true, name: true, email: true, active: true } },
    },
    orderBy: { createdAt: 'desc' },
    take: 100,
  });
  return Response.json(rows);
}
