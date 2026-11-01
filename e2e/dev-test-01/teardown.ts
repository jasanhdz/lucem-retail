import fs from 'node:fs/promises';
import path from 'node:path';
import type { FullConfig } from '@playwright/test';

export default async function teardown(_config: FullConfig) {
  await fs.rm(path.resolve('playwright/.auth'), { recursive: true, force: true });
  await fs.rm(path.resolve('e2e-artifacts/dev-test-01-tmp'), { recursive: true, force: true });
}
