import type { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { requireE2eDatabaseUrl, requirePasswords } from './database';

export const ids = {
  centro: 'dev-test-01-centro', norte: 'dev-test-01-norte',
  admin: 'dev-test-01-admin', seller: 'dev-test-01-seller', inventory: 'dev-test-01-inventory',
  centroCategory: 'dev-test-01-centro-category', norteCategory: 'dev-test-01-norte-category',
  centroZero: 'dev-test-01-centro-zero', centroLow: 'dev-test-01-centro-low', centroNormal: 'dev-test-01-centro-normal', norteProduct: 'dev-test-01-norte-product',
  centroSaleOne: 'dev-test-01-centro-sale-one', centroSaleTwo: 'dev-test-01-centro-sale-two',
  centroAudit: 'dev-test-01-centro-audit', norteAudit: 'dev-test-01-norte-audit',
};
const emails = { admin: 'dev-test-01-admin@invalid.test', seller: 'dev-test-01-seller@invalid.test', inventory: 'dev-test-01-inventory@invalid.test' };

export async function clearE2eData(db: PrismaClient) {
  const qaRun = process.env.QA_RUN === '1';
  const businessRows = await db.business.findMany({ where: { OR: [{ id: { in: [ids.centro, ids.norte] } }, { name: { in: ['DEV-TEST-01 Centro', 'DEV-TEST-01 Norte'] } }] }, select: { id: true } });
  const userWhere = { OR: [{ email: { in: Object.values(emails) } }, { email: { startsWith: 'dev-test-01-public-' } }] };
  const userRows = await db.user.findMany({ where: userWhere, select: { id: true } });
  const businesses = businessRows.map(row => row.id);
  const users = userRows.map(row => row.id);
  if (businesses.length || users.length) {
    await db.$transaction(async tx => {
      const sales = await tx.sale.findMany({ where: { businessId: { in: businesses } }, select: { id: true } });
      const saleIds = sales.map(sale => sale.id);
      const returns = await tx.return.findMany({ where: { businessId: { in: businesses } }, select: { id: true } });
      await tx.returnLine.deleteMany({ where: { returnId: { in: returns.map(row => row.id) } } });
      await tx.saleIdempotency.deleteMany({ where: { businessId: { in: businesses } } });
      await tx.saleLine.deleteMany({ where: { saleId: { in: saleIds } } });
      await tx.return.deleteMany({ where: { id: { in: returns.map(row => row.id) } } });
      await tx.sale.deleteMany({ where: { id: { in: saleIds } } });
      await tx.reservationBatchIdempotency.deleteMany({ where: { businessId: { in: businesses } } });
      await tx.reservation.deleteMany({ where: { businessId: { in: businesses } } });
      await tx.priceCostHistory.deleteMany({ where: { businessId: { in: businesses } } });
      await tx.inventoryMovement.deleteMany({ where: { businessId: { in: businesses } } });
      await tx.auditLog.deleteMany({ where: { OR: [{ businessId: { in: businesses } }, { userId: { in: users } }] } });
      await tx.session.deleteMany({ where: { OR: [{ userId: { in: users } }, { activeBusinessId: { in: businesses } }] } });
      await tx.productVariant.deleteMany({ where: { businessId: { in: businesses } } });
      await tx.product.deleteMany({ where: { businessId: { in: businesses } } });
      await tx.category.deleteMany({ where: { businessId: { in: businesses } } });
      await tx.membership.deleteMany({ where: { OR: [{ userId: { in: users } }, { businessId: { in: businesses } }] } });
      await tx.business.deleteMany({ where: { id: { in: businesses } } });
      await tx.user.deleteMany({ where: { id: { in: users } } });
    });
  }
  // The legacy E2E database is disposable and may clear its global test state.
  // QA Lab preserves unowned global buckets/orphan audit history and cleans only
  // rows associated with its named synthetic users/businesses.
  if (!qaRun) {
    await db.auditLog.deleteMany({ where: { action: 'REGISTER', entityType: 'User', businessId: null, userId: null } });
    await db.abuseRateLimitBucket.deleteMany({});
    await db.uploadQuotaCounter.deleteMany({});
  }
  const remaining = await Promise.all([
    db.business.count({ where: { id: { in: [ids.centro, ids.norte] }, name: { startsWith: 'DEV-TEST-01-' } } }),
    db.user.count({ where: userWhere }),
    db.category.count({ where: { name: { startsWith: 'DEV-TEST-01-' } } }),
    db.product.count({ where: { name: { startsWith: 'DEV-TEST-01-' } } }),
    db.productVariant.count({ where: { sku: { startsWith: 'DEV-TEST-01-' } } }),
    db.sale.count({ where: { id: { in: [ids.centroSaleOne, ids.centroSaleTwo] } } }),
    ...(qaRun ? [db.uploadQuotaCounter.count({ where: { businessId: { in: businesses } } })] : [
      db.auditLog.count({ where: { action: 'REGISTER', entityType: 'User', businessId: null, userId: null } }),
      db.abuseRateLimitBucket.count(),
      db.uploadQuotaCounter.count(),
    ]),
  ]);
  if (remaining.some(count => count !== 0)) throw new Error(`E2E cleanup left namespace rows: ${remaining.join(',')}`);
}

export async function seedE2e() {
  process.env.DATABASE_URL = requireE2eDatabaseUrl();
  const passwords = requirePasswords();
  const { PrismaClient, Role, SaleStatus, PaymentMethod } = await import('@prisma/client');
  const db = new PrismaClient();
  try {
    if (process.env.QA_RUN === '1') {
      const identity = await db.$queryRaw<Array<{ database: string; user: string }>>`SELECT current_database() AS database, current_user AS user`;
      if (identity[0]?.database !== 'lucem_qa' || identity[0]?.user !== 'lucem_qa') throw new Error('Refusing QA fixture mutation: connected database identity is not lucem_qa/lucem_qa.');
    }
    await clearE2eData(db);
    const [adminHash, sellerHash, inventoryHash] = await Promise.all([bcrypt.hash(passwords.admin, 10), bcrypt.hash(passwords.seller, 10), bcrypt.hash(passwords.inventory, 10)]);
    await db.$transaction(async tx => {
      await tx.business.createMany({ data: [{ id: ids.centro, name: 'DEV-TEST-01 Centro', currency: 'MXN' }, { id: ids.norte, name: 'DEV-TEST-01 Norte', currency: 'MXN' }] });
      await tx.user.createMany({ data: [
        { id: ids.admin, email: emails.admin, name: 'DEV-TEST-01 Admin', passwordHash: adminHash },
        { id: ids.seller, email: emails.seller, name: 'DEV-TEST-01 Seller', passwordHash: sellerHash },
        { id: ids.inventory, email: emails.inventory, name: 'DEV-TEST-01 Inventory', passwordHash: inventoryHash },
      ] });
      await tx.membership.createMany({ data: [
        { userId: ids.admin, businessId: ids.centro, role: Role.ADMIN }, { userId: ids.admin, businessId: ids.norte, role: Role.ADMIN },
        { userId: ids.seller, businessId: ids.centro, role: Role.SELLER }, { userId: ids.inventory, businessId: ids.centro, role: Role.INVENTORY_MANAGER },
      ] });
      await tx.category.createMany({ data: [{ id: ids.centroCategory, businessId: ids.centro, name: 'DEV-TEST-01 Centro Category' }, { id: ids.norteCategory, businessId: ids.norte, name: 'DEV-TEST-01 Norte Category' }] });
      await tx.product.createMany({ data: [
        { id: 'dev-test-01-centro-product', businessId: ids.centro, categoryId: ids.centroCategory, name: 'DEV-TEST-01 Centro Catalog', location: 'E2E-CENTRO' },
        { id: ids.norteProduct, businessId: ids.norte, categoryId: ids.norteCategory, name: 'DEV-TEST-01 Norte Catalog', location: 'E2E-NORTE' },
      ] });
      await tx.productVariant.createMany({ data: [
        { id: ids.centroZero, businessId: ids.centro, productId: 'dev-test-01-centro-product', sku: 'DEV-TEST-01-ZERO', cost: 10, price: 20, stock: 0, lowStockThreshold: 1 },
        { id: ids.centroLow, businessId: ids.centro, productId: 'dev-test-01-centro-product', sku: 'DEV-TEST-01-LOW', cost: 20, price: 50, stock: 2, lowStockThreshold: 2 },
        { id: ids.centroNormal, businessId: ids.centro, productId: 'dev-test-01-centro-product', sku: 'DEV-TEST-01-NORMAL', cost: 40, price: 100, stock: 10, lowStockThreshold: 2 },
        { id: ids.norteProduct + '-variant', businessId: ids.norte, productId: ids.norteProduct, sku: 'DEV-TEST-01-NORTE', cost: 5, price: 15, stock: 4, lowStockThreshold: 1 },
      ] });
      await tx.inventoryMovement.createMany({ data: [
        { businessId: ids.centro, variantId: ids.centroLow, userId: ids.inventory, type: 'INITIAL', quantity: 2, reason: 'DEV-TEST-01 seed' },
        { businessId: ids.centro, variantId: ids.centroNormal, userId: ids.inventory, type: 'INITIAL', quantity: 10, reason: 'DEV-TEST-01 seed' },
        { businessId: ids.norte, variantId: ids.norteProduct + '-variant', userId: ids.admin, type: 'INITIAL', quantity: 4, reason: 'DEV-TEST-01 seed' },
      ] });
      const today = new Date(); today.setHours(10, 0, 0, 0);
      await tx.sale.create({ data: { id: ids.centroSaleOne, businessId: ids.centro, userId: ids.seller, folio: 901, status: SaleStatus.CONFIRMED, paymentMethod: PaymentMethod.CARD, subtotal: 200, total: 200, changeAmount: 0, createdAt: today, lines: { create: { variantId: ids.centroNormal, quantity: 2, unitPrice: 100, unitCost: 40, lineTotal: 200 } } } });
      const later = new Date(today.getTime() + 60_000);
      await tx.sale.create({ data: { id: ids.centroSaleTwo, businessId: ids.centro, userId: ids.seller, folio: 902, status: SaleStatus.CONFIRMED, paymentMethod: PaymentMethod.CASH, subtotal: 50, total: 50, receivedAmount: 50, changeAmount: 0, createdAt: later, lines: { create: { variantId: ids.centroLow, quantity: 1, unitPrice: 50, unitCost: 20, lineTotal: 50 } } } });
      await tx.productVariant.update({ where: { id: ids.centroNormal }, data: { stock: 8 } });
      await tx.productVariant.update({ where: { id: ids.centroLow }, data: { stock: 1 } });
      await tx.auditLog.createMany({ data: [
        { id: ids.centroAudit, businessId: ids.centro, userId: ids.admin, action: 'DEV_TEST', entityType: 'DEV-TEST-01', entityId: ids.centroAudit, metadata: { namespace: 'DEV-TEST-01', fixture: 'Centro' }, createdAt: new Date('2026-01-01T10:00:00.000Z') },
        { id: ids.norteAudit, businessId: ids.norte, userId: ids.admin, action: 'DEV_TEST', entityType: 'DEV-TEST-01', entityId: ids.norteAudit, metadata: { namespace: 'DEV-TEST-01', fixture: 'Norte' }, createdAt: new Date('2026-01-01T11:00:00.000Z') },
      ] });
    });
  } finally { await db.$disconnect(); }
}

if (require.main === module) seedE2e().catch(error => { console.error(`BLOCKED: E2E PostgreSQL unavailable: ${error instanceof Error ? error.message : String(error)}`); process.exitCode = 1; });
