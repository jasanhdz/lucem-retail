import type { FullConfig } from '@playwright/test';
import { PrismaClient } from '@prisma/client';

export default async function teardown(_config: FullConfig) {
  const db = new PrismaClient();
  try {
    const users = await db.user.findMany({ where: { email: { endsWith: '@dev08.invalid.test' } }, select: { id: true } });
    const ids = users.map(user => user.id);
    const businesses = await db.business.findMany({ where: { memberships: { some: { userId: { in: ids } } } }, select: { id: true } });
    await db.$transaction(async tx => {
      await tx.business.deleteMany({ where: { id: { in: businesses.map(business => business.id) } } });
      await tx.user.deleteMany({ where: { id: { in: ids } } });
    });
  } finally { await db.$disconnect(); }
}
