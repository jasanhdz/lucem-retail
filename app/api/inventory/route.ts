import { getAuth, jsonError, permitted } from '@/lib/auth';
import { db } from '@/lib/db';
import { Role } from '@prisma/client';

export async function GET() {
  const auth = await getAuth();
  if (!auth?.business) return jsonError('Sesion requerida', 401);
  const variants = await db.productVariant.findMany({ where: { businessId: auth.business.id }, include: { product: true }, orderBy: { stock: 'asc' } });
  return Response.json(variants.map((variant) => ({ ...variant, stock: variant.stock.toString(), cost: variant.cost.toString(), price: variant.price.toString() })));
}

export async function POST(req: Request) {
  const auth = await getAuth();
  if (!auth?.business) return jsonError('Sesion requerida', 401);
  if (!permitted(auth.membership?.role, [Role.ADMIN, Role.INVENTORY_MANAGER])) return jsonError('No autorizado', 403);
  const body = await req.json();
  const amount = Number(body.quantity);
  if (!body.variantId || !Number.isFinite(amount) || amount <= 0 || !body.reason?.trim()) return jsonError('Variante, cantidad y motivo son obligatorios');
  if (!['PURCHASE', 'ADJUSTMENT_IN', 'ADJUSTMENT_OUT', 'CORRECTION'].includes(body.type)) return jsonError('Tipo de movimiento invalido');
  const quantity = body.type === 'ADJUSTMENT_OUT' ? -amount : amount;
  try {
    const updated = await db.$transaction(async (tx) => {
      const changed = await tx.productVariant.updateMany({ where: { id: body.variantId, businessId: auth.business!.id, ...(quantity < 0 ? { stock: { gte: amount } } : {}) }, data: { stock: { increment: quantity } } });
      if (changed.count !== 1) throw new Error('stock');
      const variant = await tx.productVariant.findUniqueOrThrow({ where: { id: body.variantId } });
      await tx.inventoryMovement.create({ data: { businessId: auth.business!.id, variantId: body.variantId, userId: auth.user.id, type: body.type ?? 'CORRECTION', quantity, reason: body.reason.trim() } });
      return variant;
    });
    return Response.json({ stock: updated.stock.toString() });
  } catch { return jsonError('Existencia insuficiente o variante no encontrada', 409); }
}
