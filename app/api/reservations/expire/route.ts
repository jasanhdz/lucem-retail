import { getAuth, jsonError } from '@/lib/auth';
import { db } from '@/lib/db';
import { audit } from '@/lib/audit';

export async function POST() {
  const auth = await getAuth();
  if (!auth?.business) return jsonError('Sesion requerida', 401);
  const expired = await db.$transaction(async (tx) => {
    const rows = await tx.reservation.findMany({ where: { businessId: auth.business!.id, status: 'ACTIVE', expiresAt: { lte: new Date() } } });
    for (const row of rows) {
      const changed = await tx.reservation.updateMany({ where: { id: row.id, status: 'ACTIVE' }, data: { status: 'EXPIRED' } });
      if (changed.count) {
        await tx.productVariant.update({ where: { id: row.variantId }, data: { stock: { increment: row.quantity } } });
        await tx.inventoryMovement.create({ data: { businessId: auth.business!.id, variantId: row.variantId, userId: auth.user.id, type: 'RELEASE', quantity: row.quantity, reason: 'Apartado vencido', referenceType: 'Reservation', referenceId: row.id } });
      }
    }
    return rows.length;
  });
  if (expired) await audit({ businessId: auth.business.id, userId: auth.user.id, action: 'EXPIRE', entityType: 'Reservation' });
  return Response.json({ expired });
}
