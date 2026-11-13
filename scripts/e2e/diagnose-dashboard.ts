import { PrismaClient } from '@prisma/client';
import { ids } from './seed';
import { assertE2eDatabaseIdentity, requireE2eDatabaseUrl, safeE2eError } from './database';

async function main() {
  const db = new PrismaClient({ datasources: { db: { url: requireE2eDatabaseUrl() } } });
  try {
    await assertE2eDatabaseIdentity(db);
    const variants = await db.productVariant.findMany({
      where: { businessId: ids.centro, active: true },
      select: {
        id: true,
        productId: true,
        sku: true,
        stock: true,
        lowStockThreshold: true,
        product: { select: { id: true, name: true, archived: true, businessId: true } },
      },
      orderBy: [{ product: { name: 'asc' } }, { sku: 'asc' }],
    });
    const groupAlerts = (predicate: (variant: typeof variants[number]) => boolean) => {
      const products = new Map<string, { id: string; name: string; archived: boolean; skus: string[] }>();
      for (const variant of variants.filter(predicate)) {
        const product = products.get(variant.productId) ?? {
          id: variant.product.id,
          name: variant.product.name,
          archived: variant.product.archived,
          skus: [],
        };
        product.skus.push(variant.sku);
        products.set(variant.productId, product);
      }
      return [...products.values()];
    };
    const outOfStock = groupAlerts((variant) => Number(variant.stock) === 0);
    const lowStock = groupAlerts((variant) => Number(variant.stock) > 0 && Number(variant.stock) <= Number(variant.lowStockThreshold));
    const businessIds = [ids.centro, ids.norte];
    const [businesses, users, memberships, categories, products, allVariants, movements, sales, saleLines] = await Promise.all([
      db.business.count({ where: { id: { in: businessIds } } }),
      db.user.count({ where: { id: { in: [ids.admin, ids.seller, ids.inventory] } } }),
      db.membership.count({ where: { businessId: { in: businessIds }, userId: { in: [ids.admin, ids.seller, ids.inventory] } } }),
      db.category.count({ where: { id: { in: [ids.centroCategory, ids.norteCategory] } } }),
      db.product.count({ where: { businessId: { in: businessIds } } }),
      db.productVariant.count({ where: { businessId: { in: businessIds } } }),
      db.inventoryMovement.findMany({ where: { businessId: { in: businessIds } }, select: { id: true, variantId: true, type: true, quantity: true }, orderBy: { id: 'asc' } }),
      db.sale.findMany({ where: { id: { in: [ids.centroSaleOne, ids.centroSaleTwo] } }, select: { id: true, businessId: true, folio: true, total: true, createdAt: true }, orderBy: { id: 'asc' } }),
      db.saleLine.findMany({ where: { saleId: { in: [ids.centroSaleOne, ids.centroSaleTwo] } }, select: { saleId: true, variantId: true, quantity: true, lineTotal: true }, orderBy: [{ saleId: 'asc' }, { variantId: 'asc' }] }),
    ]);
    const namespaceCounts = { businesses, users, memberships, categories, products, variants: allVariants, movements: movements.length, sales: sales.length, saleLines: saleLines.length };
    process.stdout.write(`${JSON.stringify({
      database: 'lucem_retail_e2e',
      businessId: ids.centro,
      namespaceCounts,
      activeVariantCount: variants.length,
      activeVariants: variants.map((variant) => ({ id: variant.id, sku: variant.sku, stock: variant.stock.toString(), lowStockThreshold: variant.lowStockThreshold.toString() })),
      movements: movements.map((row) => ({ ...row, quantity: row.quantity.toString() })),
      sales: sales.map((row) => ({ ...row, total: row.total.toString(), createdAt: row.createdAt.toISOString() })),
      saleLines: saleLines.map((row) => ({ ...row, quantity: row.quantity.toString(), lineTotal: row.lineTotal.toString() })),
      outOfStock,
      lowStock,
    }, null, 2)}\n`);
  } finally {
    await db.$disconnect();
  }
}

main().catch((error) => {
  process.stderr.write(`BLOCKED: E2E dashboard diagnosis unavailable: ${safeE2eError(error)}\n`);
  process.exitCode = 1;
});
