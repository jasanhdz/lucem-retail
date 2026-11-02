import type { FullConfig } from '@playwright/test';
import { PrismaClient } from '@prisma/client';

export default async function teardown(_config: FullConfig) {
  const db = new PrismaClient();
  try {
    const users = await db.user.findMany({ where: { email: { endsWith: '@dev09.invalid.test' } }, select: { id: true } });
    const userIds = users.map(user => user.id);
    const businesses = await db.business.findMany({ where: { memberships: { some: { userId: { in: userIds } } } }, select: { id: true } });
    const businessIds = businesses.map(business => business.id);
    await db.$transaction(async tx => {
      const sales = await tx.sale.findMany({ where: { businessId: { in: businessIds } }, select: { id: true } });
      const saleIds = sales.map(sale => sale.id);
      const returns = await tx.return.findMany({ where: { businessId: { in: businessIds } }, select: { id: true } });
      const returnIds = returns.map(row => row.id);
      await tx.returnLine.deleteMany({ where: { returnId: { in: returnIds } } });
      await tx.saleIdempotency.deleteMany({ where: { businessId: { in: businessIds } } });
      await tx.saleLine.deleteMany({ where: { saleId: { in: saleIds } } });
      await tx.return.deleteMany({ where: { id: { in: returnIds } } });
      await tx.sale.deleteMany({ where: { id: { in: saleIds } } });
      await tx.reservation.deleteMany({ where: { businessId: { in: businessIds } } });
      await tx.inventoryMovement.deleteMany({ where: { businessId: { in: businessIds } } });
      await tx.auditLog.deleteMany({ where: { businessId: { in: businessIds } } });
      await tx.session.deleteMany({ where: { OR: [{ userId: { in: userIds } }, { activeBusinessId: { in: businessIds } }] } });
      await tx.productVariant.deleteMany({ where: { businessId: { in: businessIds } } });
      await tx.product.deleteMany({ where: { businessId: { in: businessIds } } });
      await tx.category.deleteMany({ where: { businessId: { in: businessIds } } });
      await tx.membership.deleteMany({ where: { OR: [{ userId: { in: userIds } }, { businessId: { in: businessIds } }] } });
      await tx.business.deleteMany({ where: { id: { in: businessIds } } });
      await tx.user.deleteMany({ where: { id: { in: userIds } } });
    });
  } finally { await db.$disconnect(); }
}
