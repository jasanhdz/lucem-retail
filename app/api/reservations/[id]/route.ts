import { getAuth, jsonError, permitted } from '@/lib/auth';
import { audit } from '@/lib/audit';
import { db } from '@/lib/db';
import { Role, ReservationStatus } from '@prisma/client';

async function change(req: Request, id: string, action: 'release' | 'expire' | 'convert') {
  const auth = await getAuth();
  if (!auth?.business) return jsonError('Sesion requerida', 401);
  if (!permitted(auth.membership?.role, [Role.ADMIN, Role.INVENTORY_MANAGER])) return jsonError('No autorizado', 403);
  const body = await req.json().catch(() => ({}));
  if (action !== 'expire' && body.confirmation !== true) return jsonError('Se requiere confirmacion');
  try {
    const result = await db.$transaction(async (tx) => {
      const reservation = await tx.reservation.findFirst({ where: { id, businessId: auth.business!.id } });
      if (!reservation) throw new Error('not-found');
      if (reservation.status !== ReservationStatus.ACTIVE) return reservation;
      const status = action === 'convert' ? ReservationStatus.CONVERTED : action === 'expire' ? ReservationStatus.EXPIRED : ReservationStatus.RELEASED;
      const updated = await tx.reservation.update({ where: { id: reservation.id }, data: { status } });
      if (status !== ReservationStatus.CONVERTED) {
        await tx.productVariant.update({ where: { id: reservation.variantId }, data: { stock: { increment: reservation.quantity } } });
        await tx.inventoryMovement.create({ data: { businessId: auth.business!.id, variantId: reservation.variantId, userId: auth.user.id, type: 'RELEASE', quantity: reservation.quantity, reason: status === ReservationStatus.EXPIRED ? 'Apartado vencido' : 'Apartado liberado', referenceType: 'Reservation', referenceId: reservation.id } });
      }
      return updated;
    });
    await audit({ businessId: auth.business.id, userId: auth.user.id, action: action.toUpperCase(), entityType: 'Reservation', entityId: id });
    return Response.json({ ...result, quantity: result.quantity.toString() });
  } catch (error) {
    return jsonError(error instanceof Error && error.message === 'not-found' ? 'Apartado no encontrado' : 'No fue posible actualizar el apartado', error instanceof Error && error.message === 'not-found' ? 404 : 409);
  }
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const action = new URL(req.url).pathname.endsWith('/release') ? 'release' : new URL(req.url).pathname.endsWith('/convert') ? 'convert' : 'expire';
  return change(req, id, action);
}
