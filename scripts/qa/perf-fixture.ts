import { PrismaClient } from '@prisma/client';
import { qaChildEnv } from './database';
import { ids } from '../e2e/seed';

const count = 10_000;
const prefix = 'qa-lab-perf';
function productId(index: number) { return `${prefix}-product-${String(index + 1).padStart(5, '0')}`; }

export async function prepareQaPerformanceFixture() {
  const env = await qaChildEnv(); Object.assign(process.env, env);
  const url = env.QA_DATABASE_URL!; const db = new PrismaClient({ datasources: { db: { url } } });
  try {
    const identity = await db.$queryRaw<Array<{ database: string; user: string }>>`SELECT current_database() AS database, current_user AS user`;
    if (identity[0]?.database !== 'lucem_qa' || identity[0]?.user !== 'lucem_qa') throw new Error('Refusing performance fixture outside lucem_qa.');
    const [business, category] = await Promise.all([
      db.business.findUnique({ where: { id: ids.centro }, select: { id: true } }),
      db.category.findUnique({ where: { id: ids.centroCategory }, select: { id: true, businessId: true } }),
    ]);
    if (!business || !category || category.businessId !== business.id) throw new Error('Isolated E2E seed fixtures are required before QA performance data.');
    const existing = await db.product.count({ where: { businessId: business.id, id: { startsWith: `${prefix}-product-` } } });
    if (existing !== 0) {
      const productIds = Array.from({ length: count }, (_, index) => productId(index));
      await db.$transaction(async (tx) => {
        await tx.productVariant.deleteMany({ where: { businessId: business.id, productId: { in: productIds } } });
        await tx.product.deleteMany({ where: { businessId: business.id, id: { in: productIds } } });
      });
    }
    for (let offset = 0; offset < count; offset += 500) {
      const length = Math.min(500, count - offset);
      const products = Array.from({ length }, (_, i) => {
        const index = offset + i; const id = productId(index);
        return { id, businessId: business.id, name: `${prefix.toUpperCase()} Product ${String(index + 1).padStart(5, '0')}`, photoPath: null, categoryId: category.id, location: 'QA perf fixture', archived: false };
      });
      const variants = products.map((product, i) => {
        const index = offset + i;
        return { id: `${prefix}-variant-${String(index + 1).padStart(5, '0')}`, businessId: business.id, productId: product.id, sku: `${prefix.toUpperCase()}-${String(index + 1).padStart(5, '0')}`, barcode: null, cost: 5, price: 15, stock: 0, lowStockThreshold: 2, active: true };
      });
      await db.$transaction(async (tx) => {
        await tx.product.createMany({ data: products });
        await tx.productVariant.createMany({ data: variants });
      }, { timeout: 30_000 });
    }
    const [products, variants] = await Promise.all([
      db.product.count({ where: { businessId: business.id, id: { startsWith: `${prefix}-product-` } } }),
      db.productVariant.count({ where: { businessId: business.id, sku: { startsWith: `${prefix.toUpperCase()}-` } } }),
    ]);
    if (products !== count || variants !== count) throw new Error(`QA perf fixture counts mismatch: ${products} products / ${variants} variants.`);
    process.stdout.write(`Prepared isolated QA performance dataset: ${products} products, ${variants} variants.\n`);
    return { products, variants };
  } finally { await db.$disconnect(); }
}
