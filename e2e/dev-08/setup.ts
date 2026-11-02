import type { FullConfig } from '@playwright/test';
import { seedE2e } from '../../scripts/e2e/seed';

export default async function setup(_config: FullConfig) {
  process.env.DATABASE_URL = process.env.E2E_DATABASE_URL;
  await seedE2e();
}
