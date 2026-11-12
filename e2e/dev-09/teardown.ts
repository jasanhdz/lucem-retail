import type { FullConfig } from '@playwright/test';
import { PrismaClient } from '@prisma/client';
import { clearOwnedFixtures } from '../../scripts/e2e/seed';

export default async function teardown(_config: FullConfig) {
  const db = new PrismaClient();
  try {
    const users = await db.user.findMany({ where: { email: { endsWith: '@dev09.invalid.test' } }, select: { id: true } });
    const userIds = users.map(user => user.id);
    const businesses = await db.business.findMany({ where: { memberships: { some: { userId: { in: userIds } } } }, select: { id: true } });
    await clearOwnedFixtures(db, { businessIds: businesses.map(business => business.id), userIds });
  } finally { await db.$disconnect(); }
}
