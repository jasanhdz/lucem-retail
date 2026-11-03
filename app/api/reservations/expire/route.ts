import { getAuth, jsonError, permitted } from '@/lib/auth';
import { db } from '@/lib/db';
import { audit, auditOptionsForRequest } from '@/lib/audit';
import { Role } from '@prisma/client';

export async function POST(req: Request) {
  const auth = await getAuth({ renewCookie: true });
  if (!auth?.business) return jsonError('Sesion requerida', 401);
  if (!permitted(auth.membership?.role, [Role.ADMIN, Role.INVENTORY_MANAGER])) return jsonError('No autorizado', 403);
  const expired = await db.$transaction(async (tx) => {
    const rows = await tx.reservation.findMany({ where: { businessId: auth.business!.id, status: 'ACTIVE', expiresAt: { lte: new Date() } } });
    for (const row of rows) {
      const changed = await tx.reservation.updateMany({ where: { id: row.id, status: 'ACTIVE' }, data: { status: 'EXPIRED' } });
      if (changed.count) {
        await tx.productVariant.update({ where: { id: row.variantId }, data: { stock: { increment: row.quantity } } });
        await tx.inventoryMovement.create({ data: { businessId: auth.business!.id, variantId: row.variantId, userId: auth.user.id, type: 'RELEASE', quantity: row.quantity, reason: 'Apartado vencido', referenceType: 'Reservation', referenceId: row.id } });
      }
    }
    if (rows.length) await audit({ businessId: auth.business!.id, userId: auth.user.id, action: 'EXPIRE', entityType: 'Reservation' }, tx, auditOptionsForRequest(req));
    return rows.length;
  });
  return Response.json({ expired });
}
