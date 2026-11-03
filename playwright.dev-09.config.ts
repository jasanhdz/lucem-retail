import { defineConfig, devices } from '@playwright/test';
import { requireE2eDatabaseUrl } from './scripts/e2e/database';

const databaseUrl = requireE2eDatabaseUrl();
process.env.DATABASE_URL = databaseUrl;

export default defineConfig({
  testDir: './e2e/dev-09',
  timeout: 60_000,
  fullyParallel: false,
  workers: 1,
  reporter: 'list',
  globalSetup: './e2e/dev-09/setup.ts',
  globalTeardown: './e2e/dev-09/teardown.ts',
  outputDir: 'test-results/dev-09',
  use: { baseURL: 'http://127.0.0.1:3109', trace: 'retain-on-failure' },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: { command: 'npm run dev -- --hostname 127.0.0.1 --port 3109', url: 'http://127.0.0.1:3109/login', reuseExistingServer: false, timeout: 120_000, env: { ...process.env, E2E_DATABASE_URL: databaseUrl, E2E_AUDIT_FAILURES: '1', DATABASE_URL: databaseUrl, NEXT_DIST_DIR: '.next-e2e' } },
});
