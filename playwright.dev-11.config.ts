import { defineConfig, devices } from '@playwright/test';
import { requireE2eDatabaseUrl } from './scripts/e2e/database';

const databaseUrl = requireE2eDatabaseUrl();
process.env.DATABASE_URL = databaseUrl;

export default defineConfig({
  testDir: './e2e/dev-11',
  timeout: 120_000,
  fullyParallel: false,
  workers: 1,
  reporter: 'list',
  globalSetup: './e2e/dev-test-01/setup.ts',
  globalTeardown: './e2e/dev-test-01/teardown.ts',
  outputDir: 'test-results/dev-11',
  use: { baseURL: 'http://127.0.0.1:3111', trace: 'retain-on-failure', storageState: 'playwright/.auth/admin-centro.json' },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: { command: 'npm run dev -- --hostname 127.0.0.1 --port 3111', url: 'http://127.0.0.1:3111/login', reuseExistingServer: false, timeout: 120_000, env: { ...process.env, E2E_DATABASE_URL: databaseUrl, DATABASE_URL: databaseUrl } },
});
