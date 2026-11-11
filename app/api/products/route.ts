import { getAuth, jsonError, permitted } from '@/lib/auth';
import { db } from '@/lib/db';
import { audit, auditOptionsForRequest } from '@/lib/audit';
import { Prisma, Role } from '@prisma/client';
import { businessWriteGate, configuredRateLimit, consumeRateLimitBucket, limitedResponse } from '@/lib/abuse-limits';

export async function GET(req: Request) {
  const auth = await getAuth({ renewCookie: true });
  if (!auth?.business) return jsonError('Sesion requerida', 401);
  const params = new URL(req.url).searchParams;
  const q = params.get('q')?.trim() ?? '';
  const categoryId = params.get('categoryId') || undefined;
  const status = params.get('status');
  const available = params.get('available') === 'true';
  const page = Math.max(1, Number.parseInt(params.get('page') ?? '1', 10) || 1);
  // Demo rows have at most two variants; 100 groups bound demo responses to 200 variants.
  const limit = Math.min(100, Math.max(1, Number.parseInt(params.get('limit') ?? '48', 10) || 48));
  const active = status !== 'archived';
  const predicates = [Prisma.sql`p."businessId" = ${auth.business.id}`, Prisma.sql`p.archived = false`, Prisma.sql`v."businessId" = ${auth.business.id}`, Prisma.sql`v.active = ${active}`];
  if (categoryId) predicates.push(Prisma.sql`p."categoryId" = ${categoryId}`);
  if (available) predicates.push(Prisma.sql`v.stock > 0`);
  if (status === 'out') predicates.push(Prisma.sql`v.stock = 0`);
  if (status === 'low') predicates.push(Prisma.sql`v.stock > 0 AND v.stock <= v."lowStockThreshold"`);
  if (q) predicates.push(Prisma.sql`(p.name ILIKE ${`%${q}%`} OR p.location ILIKE ${`%${q}%`} OR EXISTS (SELECT 1 FROM "ProductVariant" qs WHERE qs."productId" = p.id AND qs."businessId" = p."businessId" AND qs.active = ${active} AND (qs.sku ILIKE ${`%${q}%`} OR qs.barcode ILIKE ${`%${q}%`}))`);
  const type = params.get('type');
  if (type === 'single') predicates.push(Prisma.sql`(SELECT count(*) FROM "ProductVariant" tv WHERE tv."productId" = p.id AND tv."businessId" = p."businessId" AND tv.active = ${active}) = 1`);
  if (type === 'multiple') predicates.push(Prisma.sql`(SELECT count(*) FROM "ProductVariant" tv WHERE tv."productId" = p.id AND tv."businessId" = p."businessId" AND tv.active = ${active}) > 1`);
  const where = Prisma.join(predicates, ' AND ');
  const orderBy = params.get('sort') ?? 'name';
  const order = orderBy === 'recent' ? Prisma.sql`p."createdAt" DESC, p.name, p.id`
        : orderBy === 'price-high' ? Prisma.sql`(SELECT max(sv.price) FROM "ProductVariant" sv WHERE sv."productId" = p.id AND sv."businessId" = p."businessId" AND sv.active = ${active}) DESC, p.name, p.id`
      : orderBy === 'price-low' ? Prisma.sql`(SELECT min(sv.price) FROM "ProductVariant" sv WHERE sv."productId" = p.id AND sv."businessId" = p."businessId" AND sv.active = ${active}), p.name, p.id`
        : orderBy === 'stock-high' ? Prisma.sql`(SELECT sum(sv.stock) FROM "ProductVariant" sv WHERE sv."productId" = p.id AND sv."businessId" = p."businessId" AND sv.active = ${active}) DESC, p.name, p.id`
          : orderBy === 'stock-low' ? Prisma.sql`(SELECT sum(sv.stock) FROM "ProductVariant" sv WHERE sv."productId" = p.id AND sv."businessId" = p."businessId" AND sv.active = ${active}), p.name, p.id`
            : Prisma.sql`p.name, p.id`;
  const [matches, countRows, summaryRows, typeSummaryRows, categoryRows] = await Promise.all([
    db.$queryRaw<Array<{ id: string }>>(Prisma.sql`SELECT p.id FROM "Product" p WHERE EXISTS (SELECT 1 FROM "ProductVariant" v WHERE v."productId" = p.id AND ${where}) ORDER BY ${order} OFFSET ${(page - 1) * limit} LIMIT ${limit}`),
    db.$queryRaw<Array<{ total: bigint }>>(Prisma.sql`SELECT count(*) AS total FROM "Product" p WHERE EXISTS (SELECT 1 FROM "ProductVariant" v WHERE v."productId" = p.id AND ${where})`),
    db.$queryRaw<Array<{ skuCount: bigint; available: bigint; low: bigint; out: bigint }>>`SELECT count(*) AS "skuCount", count(*) FILTER (WHERE v.stock > 0) AS available, count(*) FILTER (WHERE v.stock > 0 AND v.stock <= v."lowStockThreshold") AS low, count(*) FILTER (WHERE v.stock = 0) AS out FROM "ProductVariant" v JOIN "Product" p ON p.id = v."productId" WHERE v."businessId" = ${auth.business.id} AND p."businessId" = ${auth.business.id} AND p.archived = false AND v.active = true`,
    db.$queryRaw<Array<{ multiple: bigint; single: bigint }>>`SELECT count(*) FILTER (WHERE variant_count > 1) AS multiple, count(*) FILTER (WHERE variant_count = 1) AS single FROM (SELECT p.id, count(v.id) AS variant_count FROM "Product" p JOIN "ProductVariant" v ON v."productId" = p.id WHERE p."businessId" = ${auth.business.id} AND p.archived = false AND v."businessId" = ${auth.business.id} AND v.active = true GROUP BY p.id) groups`,
    available ? db.$queryRaw<Array<{ categoryId: string; total: bigint }>>`SELECT p."categoryId", count(DISTINCT p.id) AS total FROM "Product" p WHERE p."businessId" = ${auth.business.id} AND p.archived = false AND EXISTS (SELECT 1 FROM "ProductVariant" v WHERE v."productId" = p.id AND v."businessId" = p."businessId" AND v.active = true AND v.stock > 0) GROUP BY p."categoryId"` : Promise.resolve([]),
  ]);
  const productIds = matches.map(({ id }) => id);
  const variantWhere = { businessId: auth.business.id, active, productId: { in: productIds }, ...(available ? { stock: { gt: 0 } } : status === 'out' ? { stock: 0 } : status === 'low' ? { stock: { gt: 0 } } : {}), ...(q ? { OR: [{ sku: { contains: q, mode: 'insensitive' as const } }, { barcode: { contains: q, mode: 'insensitive' as const } }, { product: { name: { contains: q, mode: 'insensitive' as const } } }, { product: { location: { contains: q, mode: 'insensitive' as const } } }] } : {}) };
  const variants = productIds.length ? await db.productVariant.findMany({ where: variantWhere, include: { product: { include: { category: true } } }, orderBy: [{ product: { name: 'asc' } }, { productId: 'asc' }, { sku: 'asc' }] }) : [];
  const filtered = status === 'low' ? variants.filter((v) => v.stock.gt(0) && v.stock.lte(v.lowStockThreshold)) : variants;
  const items = filtered.map((v) => ({ ...v, cost: v.cost.toString(), price: v.price.toString(), promoPrice: v.promoPrice?.toString() ?? null, stock: v.stock.toString(), lowStockThreshold: v.lowStockThreshold.toString() }));
  if (params.has('page') || params.has('limit')) {
    const total = Number(countRows[0]?.total ?? 0);
    const summary = summaryRows[0];
    const types = typeSummaryRows[0];
    return Response.json({ items, page, limit, total, hasMore: page * limit < total, summary: { skuCount: Number(summary.skuCount), available: Number(summary.available), low: Number(summary.low), out: Number(summary.out), multiple: Number(types.multiple), single: Number(types.single) }, categoryCounts: Object.fromEntries(categoryRows.map((row) => [row.categoryId, Number(row.total)])), availableTotal: categoryRows.reduce((sum, row) => sum + Number(row.total), 0) });
  }
  return Response.json(items);
}

export async function POST(req: Request) {
  const auth = await getAuth({ renewCookie: true });
  if (!auth?.business) return jsonError('Sesion requerida', 401);
  if (!permitted(auth.membership?.role, [Role.ADMIN, Role.INVENTORY_MANAGER])) return jsonError('No autorizado', 403);
  const writeGate = await businessWriteGate(auth.business.id, req);
  if (writeGate) return writeGate;
  const body = await req.json();
  const inputs = Array.isArray(body.variants) && body.variants.length ? body.variants : [body];
  if (!body.name || !body.categoryId || inputs.some((input: any) => !input.sku || !Number.isFinite(Number(input.cost)) || Number(input.cost) < 0 || !Number.isFinite(Number(input.price)) || Number(input.price) < 0 || (input.stock !== undefined && (!Number.isFinite(Number(input.stock)) || Number(input.stock) < 0)))) return jsonError('Nombre, SKU, categoria, costo y precio son obligatorios');
  try {
    const limits = await Promise.all([
      consumeRateLimitBucket('product-create-business', auth.business.id, 60 * 60_000, configuredRateLimit('PRODUCT_CREATE_BUSINESS', 200)),
      consumeRateLimitBucket('product-create-global', 'global', 60 * 60_000, configuredRateLimit('PRODUCT_CREATE_GLOBAL', 1000)),
    ]);
    const blocked = limits.find((limit) => !limit.allowed);
    if (blocked) return limitedResponse(429, blocked.retryAfterSeconds);
  } catch {
    return jsonError('Servicio temporalmente no disponible', 503);
  }
  try {
    const product = await db.$transaction(async (tx) => {
      const category = await tx.category.findFirst({ where: { id: body.categoryId, businessId: auth.business!.id, active: true } });
      if (!category) throw new Error('category');
      const created = await tx.product.create({ data: { businessId: auth.business!.id, name: body.name.trim(), photoPath: body.photoPath || null, categoryId: body.categoryId, location: body.location?.trim() || 'Sin ubicacion' } });
      for (const input of inputs) {
        const variant = await tx.productVariant.create({ data: { businessId: auth.business!.id, productId: created.id, sku: input.sku.trim(), barcode: input.barcode?.trim() || null, cost: input.cost, price: input.price, promoPrice: input.promoPrice || null, stock: input.stock || 0, size: input.size || null, color: input.color || null, lowStockThreshold: input.lowStockThreshold || 1 } });
        if (Number(input.stock) > 0) await tx.inventoryMovement.create({ data: { businessId: auth.business!.id, variantId: variant.id, userId: auth.user.id, type: 'INITIAL', quantity: input.stock, reason: 'Alta de producto' } });
      }
      await audit({ businessId: auth.business!.id, userId: auth.user.id, action: 'CREATE', entityType: 'Product', entityId: created.id }, tx, auditOptionsForRequest(req));
      return created;
    });
     return Response.json(product, { status: 201 });
  } catch { return jsonError('SKU duplicado o datos invalidos', 409); }
}
