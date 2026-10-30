import { getAuth, jsonError, permitted } from '@/lib/auth';
import { audit } from '@/lib/audit';
import { db } from '@/lib/db';
import { Role } from '@prisma/client';

const roles = [Role.ADMIN, Role.INVENTORY_MANAGER];

export async function GET() {
  const auth = await getAuth();
  if (!auth?.business) return jsonError('Sesion requerida', 401);
  const rows = await db.reservation.findMany({
    where: { businessId: auth.business.id },
    include: { variant: { include: { product: true } }, user: { select: { name: true } } },
    orderBy: { createdAt: 'desc' },
  });
  return Response.json(rows.map((row) => ({ ...row, quantity: row.quantity.toString(), deposit: row.deposit?.toString() ?? null })));
}

export async function POST(req: Request) {
  const auth = await getAuth();
  if (!auth?.business) return jsonError('Sesion requerida', 401);
  if (!permitted(auth.membership?.role, roles)) return jsonError('No autorizado', 403);
  const body = await req.json();
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
      return created;
    });
    await audit({ businessId: auth.business.id, userId: auth.user.id, action: 'CREATE', entityType: 'Reservation', entityId: reservation.id });
    return Response.json({ ...reservation, quantity: reservation.quantity.toString(), deposit: reservation.deposit?.toString() ?? null }, { status: 201 });
  } catch (error) {
    return jsonError(error instanceof Error && error.message === 'stock' ? 'Existencia insuficiente' : 'No fue posible crear el apartado', error instanceof Error && error.message === 'stock' ? 409 : 400);
  }
}
