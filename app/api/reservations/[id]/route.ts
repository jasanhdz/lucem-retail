import { getAuth, jsonError, permitted } from '@/lib/auth';
import { audit, auditOptionsForRequest } from '@/lib/audit';
import { db } from '@/lib/db';
import { PaymentMethod, Role, ReservationStatus } from '@prisma/client';
import { businessWriteGate, commercialWriteGate } from '@/lib/abuse-limits';

async function change(req: Request, id: string, action: 'release' | 'expire' | 'convert') {
  const auth = await getAuth({ renewCookie: true });
  if (!auth?.business) return jsonError('Sesion requerida', 401);
  if (!permitted(auth.membership?.role, [Role.ADMIN, Role.INVENTORY_MANAGER])) return jsonError('No autorizado', 403);
  const writeGate = await businessWriteGate(auth.business.id, req);
  if (writeGate) return writeGate;
  const commercialGate = await commercialWriteGate(auth.business.id);
  if (commercialGate) return commercialGate;
  const body = await req.json().catch(() => ({}));
  if (action !== 'expire' && body.confirmation !== true) return jsonError('Se requiere confirmacion');
  const paymentMethod = body.paymentMethod;
  const receivedAmount = Number(body.receivedAmount);
  if (action === 'convert' && (!Object.values(PaymentMethod).includes(paymentMethod) || (paymentMethod === PaymentMethod.CASH && !Number.isFinite(receivedAmount)))) return jsonError('Metodo de pago y efectivo recibido son obligatorios');
  try {
    const result = await db.$transaction(async (tx) => {
      const reservation = await tx.reservation.findFirst({ where: { id, businessId: auth.business!.id } });
      if (!reservation) throw new Error('not-found');
      if (reservation.deposit && reservation.deposit.gt(0)) throw new Error('manual-review');
      if (reservation.status !== ReservationStatus.ACTIVE) {
        if (action === 'convert' && reservation.status === ReservationStatus.CONVERTED) {
          if (!reservation.saleId) throw new Error('conversion-missing');
          return { reservation, saleId: reservation.saleId };
        }
        return { reservation, saleId: null };
      }
      const status = action === 'convert' ? ReservationStatus.CONVERTED : action === 'expire' ? ReservationStatus.EXPIRED : ReservationStatus.RELEASED;
      let updated = await tx.reservation.update({ where: { id: reservation.id }, data: { status } });
      if (status === ReservationStatus.CONVERTED) {
        const variant = await tx.productVariant.findUnique({ where: { id: reservation.variantId } });
        if (!variant) throw new Error('not-found');
        const price = Number(variant.promoPrice ?? variant.price);
        const subtotal = price * Number(reservation.quantity);
        if (paymentMethod === PaymentMethod.CASH && receivedAmount < subtotal) throw new Error('cash');
        const previous = await tx.sale.findFirst({ where: { businessId: auth.business!.id }, orderBy: { folio: 'desc' } });
        const sale = await tx.sale.create({ data: { businessId: auth.business!.id, userId: auth.user.id, folio: (previous?.folio ?? 0) + 1, paymentMethod, subtotal, total: subtotal, receivedAmount: paymentMethod === PaymentMethod.CASH ? receivedAmount : null, changeAmount: paymentMethod === PaymentMethod.CASH ? receivedAmount - subtotal : 0, lines: { create: { variantId: variant.id, quantity: reservation.quantity, unitPrice: price, unitCost: variant.cost, lineTotal: subtotal } } } });
        updated = await tx.reservation.update({ where: { id: reservation.id }, data: { saleId: sale.id } });
        await tx.productVariant.update({ where: { id: variant.id }, data: { stock: { increment: reservation.quantity } } });
        await tx.inventoryMovement.create({ data: { businessId: auth.business!.id, variantId: variant.id, userId: auth.user.id, type: 'RELEASE', quantity: reservation.quantity, reason: 'Apartado convertido', referenceType: 'Reservation', referenceId: reservation.id } });
        const changed = await tx.productVariant.updateMany({ where: { id: variant.id, businessId: auth.business!.id, stock: { gte: reservation.quantity } }, data: { stock: { decrement: reservation.quantity } } });
        if (changed.count !== 1) throw new Error('stock');
        await tx.inventoryMovement.create({ data: { businessId: auth.business!.id, variantId: variant.id, userId: auth.user.id, type: 'SALE', quantity: -Number(reservation.quantity), reason: 'Venta de apartado', referenceType: 'Reservation', referenceId: reservation.id } });
        await audit({ businessId: auth.business!.id, userId: auth.user.id, action: action.toUpperCase(), entityType: 'Reservation', entityId: id }, tx, auditOptionsForRequest(req));
        return { reservation: updated, saleId: sale.id };
      }
      await tx.productVariant.update({ where: { id: reservation.variantId }, data: { stock: { increment: reservation.quantity } } });
      await tx.inventoryMovement.create({ data: { businessId: auth.business!.id, variantId: reservation.variantId, userId: auth.user.id, type: 'RELEASE', quantity: reservation.quantity, reason: status === ReservationStatus.EXPIRED ? 'Apartado vencido' : 'Apartado liberado', referenceType: 'Reservation', referenceId: reservation.id } });
      await audit({ businessId: auth.business!.id, userId: auth.user.id, action: action.toUpperCase(), entityType: 'Reservation', entityId: id }, tx, auditOptionsForRequest(req));
      return { reservation: updated, saleId: null };
    }, { isolationLevel: 'Serializable' });
     return Response.json({ ...result.reservation, quantity: result.reservation.quantity.toString(), saleId: result.saleId });
  } catch (error) {
    const message = error instanceof Error ? error.message : '';
    return jsonError(message === 'not-found' ? 'Apartado no encontrado' : message === 'cash' ? 'El efectivo recibido es insuficiente' : message === 'conversion-missing' ? 'El apartado convertido no tiene una venta asociada' : message === 'manual-review' ? 'Este apartado tiene un anticipo histórico; requiere revisión manual antes de continuar.' : 'No fue posible actualizar el apartado', message === 'not-found' ? 404 : 409);
  }
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const action = new URL(req.url).pathname.endsWith('/release') ? 'release' : new URL(req.url).pathname.endsWith('/convert') ? 'convert' : 'expire';
  return change(req, id, action);
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await getAuth({ renewCookie: true });
  if (!auth?.business) return jsonError('Sesion requerida', 401);
  if (!permitted(auth.membership?.role, [Role.ADMIN, Role.INVENTORY_MANAGER])) return jsonError('No autorizado', 403);
  const writeGate = await businessWriteGate(auth.business.id, req);
  if (writeGate) return writeGate;
  const commercialGate = await commercialWriteGate(auth.business.id);
  if (commercialGate) return commercialGate;
  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const expiresAt = new Date(body.expiresAt);
  if (Number.isNaN(expiresAt.getTime()) || expiresAt <= new Date()) return jsonError('Selecciona una nueva fecha de vencimiento valida.');
  const reservation = await db.reservation.findFirst({ where: { id, businessId: auth.business.id } });
  if (!reservation) return jsonError('Apartado no encontrado', 404);
  if (reservation.status !== ReservationStatus.ACTIVE) return jsonError('Solo puedes modificar la fecha de un apartado activo.', 409);
  const updated = await db.reservation.update({ where: { id }, data: { expiresAt } });
  await audit({ businessId: auth.business.id, userId: auth.user.id, action: 'UPDATE', entityType: 'Reservation', entityId: id, metadata: { field: 'expiresAt', expiresAt: expiresAt.toISOString() } }, undefined, auditOptionsForRequest(req));
  return Response.json({ ...updated, quantity: updated.quantity.toString(), deposit: updated.deposit?.toString() ?? null });
}
