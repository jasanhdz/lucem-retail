import { getAuth, jsonError, permitted } from '@/lib/auth';
import { audit, auditOptionsForRequest } from '@/lib/audit';
import { db } from '@/lib/db';
import { Role } from '@prisma/client';

const roles = [Role.ADMIN, Role.INVENTORY_MANAGER];

export async function GET() {
  const auth = await getAuth({ renewCookie: true });
  if (!auth?.business) return jsonError('Sesion requerida', 401);
  const rows = await db.reservation.findMany({
    where: { businessId: auth.business.id },
    include: { variant: { include: { product: true } }, user: { select: { name: true } } },
    orderBy: { createdAt: 'desc' },
  });
  return Response.json(rows.map((row) => ({ ...row, quantity: row.quantity.toString(), deposit: row.deposit?.toString() ?? null })));
}

export async function POST(req: Request) {
  const auth = await getAuth({ renewCookie: true });
  if (!auth?.business) return jsonError('Sesion requerida', 401);
  if (!permitted(auth.membership?.role, roles)) return jsonError('No autorizado', 403);
  const body = await req.json();
  if (Object.hasOwn(body, 'deposit') && body.deposit !== null && body.deposit !== '' && (typeof body.deposit !== 'number' && typeof body.deposit !== 'string' || !/^\d+(\.\d{1,2})?$/.test(String(body.deposit)) || Number(body.deposit) !== 0)) return jsonError('Los anticipos no están habilitados; crea el apartado sin deposit');
  if (Array.isArray(body.items)) {
    if (!body.items.length) return jsonError('Agrega al menos un producto');
    const expiresAt = new Date(body.expiresAt);
    if (!Number.isFinite(expiresAt.getTime()) || expiresAt <= new Date()) return jsonError('Vencimiento válido obligatorio');
    try {
      const reservations = await db.$transaction(async tx => {
        const result = [];
        for (const item of body.items) {
          const quantity = Number(item.quantity);
          if (!item.variantId || !Number.isFinite(quantity) || quantity <= 0) throw new Error('invalid');
          const variant = await tx.productVariant.findFirst({ where: { id: item.variantId, businessId: auth.business!.id, active: true } });
          if (!variant) throw new Error('not-found');
          const changed = await tx.productVariant.updateMany({ where: { id: variant.id, businessId: auth.business!.id, stock: { gte: quantity } }, data: { stock: { decrement: quantity } } });
          if (changed.count !== 1) throw new Error('stock');
          const reservation = await tx.reservation.create({ data: { businessId: auth.business!.id, variantId: variant.id, userId: auth.user.id, quantity, customerName: body.customerName?.trim() || null, expiresAt, notes: item.notes?.trim() || null } });
          await tx.inventoryMovement.create({ data: { businessId: auth.business!.id, variantId: variant.id, userId: auth.user.id, type: 'RESERVATION', quantity: -quantity, reason: 'Apartado', referenceType: 'Reservation', referenceId: reservation.id } });
          await audit({ businessId: auth.business!.id, userId: auth.user.id, action: 'CREATE', entityType: 'Reservation', entityId: reservation.id }, tx, auditOptionsForRequest(req));
          result.push(reservation);
        }
        return result;
      }, { isolationLevel: 'Serializable' });
      return Response.json({ reservations: reservations.map(reservation => ({ ...reservation, quantity: reservation.quantity.toString(), deposit: null })) }, { status: 201 });
    } catch (error) { const message = error instanceof Error ? error.message : ''; return jsonError(message === 'stock' ? 'Existencia insuficiente' : 'No fue posible crear el apartado completo', message === 'stock' ? 409 : 400); }
  }
  const quantity = Number(body.quantity);
  const expiresAt = new Date(body.expiresAt);
  if (!body.variantId || !Number.isFinite(quantity) || quantity <= 0 || !Number.isFinite(expiresAt.getTime()) || expiresAt <= new Date()) return jsonError('Variante, cantidad y vencimiento validos son obligatorios');
  try {
    const reservation = await db.$transaction(async (tx) => {
      const variant = await tx.productVariant.findFirst({ where: { id: body.variantId, businessId: auth.business!.id, active: true } });
      if (!variant) throw new Error('not-found');
      const changed = await tx.productVariant.updateMany({ where: { id: variant.id, businessId: auth.business!.id, stock: { gte: quantity } }, data: { stock: { decrement: quantity } } });
      if (changed.count !== 1) throw new Error('stock');
      const created = await tx.reservation.create({ data: { businessId: auth.business!.id, variantId: variant.id, userId: auth.user.id, quantity, customerName: body.customerName?.trim() || null, expiresAt, deposit: body.deposit == null || body.deposit === '' ? null : body.deposit, notes: body.notes?.trim() || null } });
      await tx.inventoryMovement.create({ data: { businessId: auth.business!.id, variantId: variant.id, userId: auth.user.id, type: 'RESERVATION', quantity: -quantity, reason: 'Apartado', referenceType: 'Reservation', referenceId: created.id } });
      await audit({ businessId: auth.business!.id, userId: auth.user.id, action: 'CREATE', entityType: 'Reservation', entityId: created.id }, tx, auditOptionsForRequest(req));
      return created;
    });
     return Response.json({ ...reservation, quantity: reservation.quantity.toString(), deposit: reservation.deposit?.toString() ?? null }, { status: 201 });
  } catch (error) {
    return jsonError(error instanceof Error && error.message === 'stock' ? 'Existencia insuficiente' : 'No fue posible crear el apartado', error instanceof Error && error.message === 'stock' ? 409 : 400);
  }
}
