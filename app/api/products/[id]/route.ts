import { getAuth, jsonError, permitted } from '@/lib/auth';
import { db } from '@/lib/db';
import { audit } from '@/lib/audit';
import { Role } from '@prisma/client';

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await getAuth();
  if (!auth?.business) return jsonError('Sesion requerida', 401);
  if (!permitted(auth.membership?.role, [Role.ADMIN, Role.INVENTORY_MANAGER])) return jsonError('No autorizado', 403);
  const body = await req.json();
  const { id } = await params;
  try {
    const result = await db.$transaction(async (tx) => {
      const product = await tx.product.findFirst({ where: { id, businessId: auth.business!.id }, include: { variants: true } });
      if (!product) throw new Error('not-found');
      const updated = await tx.product.update({ where: { id }, data: { name: body.name?.trim() || product.name, categoryId: body.categoryId || product.categoryId, location: body.location?.trim() || product.location } });
      for (const input of body.variants ?? []) {
        const current = product.variants.find((variant) => variant.id === input.id);
        if (!current) continue;
        const data = { sku: input.sku?.trim() || current.sku, cost: input.cost ?? current.cost, price: input.price ?? current.price, promoPrice: input.promoPrice === '' ? null : (input.promoPrice ?? current.promoPrice), size: input.size ?? current.size, color: input.color ?? current.color, lowStockThreshold: input.lowStockThreshold ?? current.lowStockThreshold };
        await tx.productVariant.update({ where: { id: current.id }, data });
        for (const [field, oldValue, newValue] of [['COST', current.cost, data.cost], ['PRICE', current.price, data.price], ['PROMO_PRICE', current.promoPrice, data.promoPrice] ] as const) {
          if (String(oldValue ?? '') !== String(newValue ?? '')) await tx.priceCostHistory.create({ data: { businessId: auth.business!.id, variantId: current.id, userId: auth.user.id, field, oldValue, newValue, reason: body.reason?.trim() || 'Edicion de producto' } });
        }
      }
      return updated;
    });
    await audit({ businessId: auth.business.id, userId: auth.user.id, action: 'UPDATE', entityType: 'Product', entityId: id });
    return Response.json(result);
  } catch (error) { return jsonError(error instanceof Error && error.message === 'not-found' ? 'Producto no encontrado' : 'SKU duplicado o datos invalidos', error instanceof Error && error.message === 'not-found' ? 404 : 409); }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await getAuth();
  if (!auth?.business) return jsonError('Sesion requerida', 401);
  if (!permitted(auth.membership?.role, [Role.ADMIN, Role.INVENTORY_MANAGER])) return jsonError('No autorizado', 403);
  const { id } = await params;
  const result = await db.product.updateMany({ where: { id, businessId: auth.business.id }, data: { archived: true, updatedAt: new Date() } });
  if (!result.count) return jsonError('Producto no encontrado', 404);
  await audit({ businessId: auth.business.id, userId: auth.user.id, action: 'ARCHIVE', entityType: 'Product', entityId: id });
  return Response.json({ archived: true });
}
