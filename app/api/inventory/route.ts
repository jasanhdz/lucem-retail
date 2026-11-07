import { getAuth, jsonError, permitted } from '@/lib/auth';
import { db } from '@/lib/db';
import { audit, auditOptionsForRequest } from '@/lib/audit';
import { Role } from '@prisma/client';

export async function GET() {
  const auth = await getAuth({ renewCookie: true });
  if (!auth?.business) return jsonError('Sesion requerida', 401);
  const where = { businessId: auth.business.id, status: 'ACTIVE' as const };
  const [variants, reservations] = await Promise.all([
    db.productVariant.findMany({ where: { businessId: auth.business.id, active: true }, include: { product: { include: { category: true } } }, orderBy: { stock: 'asc' } }),
    db.reservation.groupBy({ by: ['variantId'], where, _sum: { quantity: true } }),
  ]);
  const reservedByVariant = new Map(reservations.map((row) => [row.variantId, row._sum.quantity ?? 0]));
  return Response.json(variants.map((variant) => {
    const reserved = reservedByVariant.get(variant.id) ?? 0;
    const available = variant.stock;
    const physical = available.plus(reserved);
    return { ...variant, stock: available.toString(), available: available.toString(), reserved: reserved.toString(), physical: physical.toString(), cost: variant.cost.toString(), price: variant.price.toString() };
  }));
}

export async function POST(req: Request) {
  const auth = await getAuth({ renewCookie: true });
  if (!auth?.business) return jsonError('Sesion requerida', 401);
  if (!permitted(auth.membership?.role, [Role.ADMIN, Role.INVENTORY_MANAGER])) return jsonError('No autorizado', 403);
  const body = await req.json();
  const amount = Number(body.quantity);
  if (!body.variantId || !Number.isFinite(amount) || amount <= 0 || !Number.isInteger(amount * 100) || !body.reason?.trim()) return jsonError('Variante, cantidad positiva de hasta dos decimales y motivo son obligatorios');
  if (!['PURCHASE', 'ADJUSTMENT_IN', 'ADJUSTMENT_OUT', 'CORRECTION'].includes(body.type)) return jsonError('Tipo de movimiento invalido');
  const quantity = body.type === 'ADJUSTMENT_OUT' ? -amount : amount;
  try {
    const updated = await db.$transaction(async (tx) => {
      const changed = await tx.productVariant.updateMany({ where: { id: body.variantId, businessId: auth.business!.id, ...(quantity < 0 ? { stock: { gte: amount } } : {}) }, data: { stock: { increment: quantity } } });
      if (changed.count !== 1) throw new Error('stock');
       const variant = await tx.productVariant.findUniqueOrThrow({ where: { id: body.variantId } });
       const active = await tx.reservation.aggregate({ where: { businessId: auth.business!.id, variantId: body.variantId, status: 'ACTIVE' }, _sum: { quantity: true } });
       const reserved = active._sum.quantity ?? 0;
        const movement = await tx.inventoryMovement.create({ data: { businessId: auth.business!.id, variantId: body.variantId, userId: auth.user.id, type: body.type ?? 'CORRECTION', quantity, reason: body.reason.trim() } });
        await audit({ businessId: auth.business!.id, userId: auth.user.id, action: 'CREATE', entityType: 'InventoryMovement', entityId: movement.id, metadata: { type: body.type ?? 'CORRECTION' } }, tx, auditOptionsForRequest(req));
        return { variant, movement, reserved };
     });
     const available = updated.variant.stock;
     return Response.json({ movementId: updated.movement.id, stock: available.toString(), available: available.toString(), reserved: updated.reserved.toString(), physical: available.plus(updated.reserved).toString() });
  } catch { return jsonError('Existencia insuficiente o variante no encontrada', 409); }
}
