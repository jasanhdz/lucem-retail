import { getAuth, jsonError, permitted } from '@/lib/auth';
import { db } from '@/lib/db';
import { audit } from '@/lib/audit';
import { Role } from '@prisma/client';

export async function GET(req: Request) {
  const auth = await getAuth();
  if (!auth?.business) return jsonError('Sesion requerida', 401);
  const params = new URL(req.url).searchParams;
  const q = params.get('q')?.trim() ?? '';
  const categoryId = params.get('categoryId') || undefined;
  const status = params.get('status');
  const available = params.get('available') === 'true';
  const variants = await db.productVariant.findMany({
    where: {
      businessId: auth.business.id,
      active: status !== 'archived',
      ...(available ? { stock: { gt: 0 } } : {}),
      product: { archived: false, ...(categoryId ? { categoryId } : {}) },
      ...(status === 'out' ? { stock: 0 } : {}),
      ...(q ? { OR: [{ sku: { contains: q, mode: 'insensitive' } }, { product: { name: { contains: q, mode: 'insensitive' } } }] } : {}),
    },
    include: { product: { include: { category: true } } },
    orderBy: { product: { name: 'asc' } },
  });
  const filtered = status === 'low' ? variants.filter((v) => v.stock.gt(0) && v.stock.lte(v.lowStockThreshold)) : variants;
  return Response.json(filtered.map((v) => ({ ...v, cost: v.cost.toString(), price: v.price.toString(), promoPrice: v.promoPrice?.toString() ?? null, stock: v.stock.toString(), lowStockThreshold: v.lowStockThreshold.toString() })));
}

export async function POST(req: Request) {
  const auth = await getAuth();
  if (!auth?.business) return jsonError('Sesion requerida', 401);
  if (!permitted(auth.membership?.role, [Role.ADMIN, Role.INVENTORY_MANAGER])) return jsonError('No autorizado', 403);
  const body = await req.json();
  if (!body.name || !body.sku || !body.categoryId || !Number.isFinite(Number(body.cost)) || Number(body.cost) < 0 || !Number.isFinite(Number(body.price)) || Number(body.price) < 0 || (body.stock !== undefined && (!Number.isFinite(Number(body.stock)) || Number(body.stock) < 0))) return jsonError('Nombre, SKU, categoria, costo y precio son obligatorios');
  try {
    const product = await db.$transaction(async (tx) => {
      const category = await tx.category.findFirst({ where: { id: body.categoryId, businessId: auth.business!.id, active: true } });
      if (!category) throw new Error('category');
      const created = await tx.product.create({ data: { businessId: auth.business!.id, name: body.name.trim(), categoryId: body.categoryId, location: body.location?.trim() || 'Sin ubicacion' } });
      const variant = await tx.productVariant.create({ data: { businessId: auth.business!.id, productId: created.id, sku: body.sku.trim(), barcode: body.barcode?.trim() || null, cost: body.cost, price: body.price, promoPrice: body.promoPrice || null, stock: body.stock || 0, size: body.size || null, color: body.color || null, lowStockThreshold: body.lowStockThreshold || 1 } });
      if (Number(body.stock) > 0) await tx.inventoryMovement.create({ data: { businessId: auth.business!.id, variantId: variant.id, userId: auth.user.id, type: 'INITIAL', quantity: body.stock, reason: 'Alta de producto' } });
      return created;
    });
    await audit({ businessId: auth.business.id, userId: auth.user.id, action: 'CREATE', entityType: 'Product', entityId: product.id });
    return Response.json(product, { status: 201 });
  } catch { return jsonError('SKU duplicado o datos invalidos', 409); }
}
