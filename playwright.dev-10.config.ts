import { defineConfig, devices } from '@playwright/test';
import { requireE2eDatabaseUrl } from './scripts/e2e/database';
import { qaPlaywrightOutputDir } from './scripts/qa/playwright-output';

const databaseUrl = requireE2eDatabaseUrl();
process.env.DATABASE_URL = databaseUrl;

export default defineConfig({
  testDir: './e2e/dev-10',
  fullyParallel: false,
  workers: 1,
  reporter: 'list',
  globalSetup: './e2e/dev-09/setup.ts',
  globalTeardown: './e2e/dev-09/teardown.ts',
  outputDir: qaPlaywrightOutputDir('dev-10', 'test-results/dev-10'),
  use: { baseURL: 'http://127.0.0.1:3110', trace: 'retain-on-failure' },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: { command: 'npm run dev -- --hostname 127.0.0.1 --port 3110', url: 'http://127.0.0.1:3110/login', reuseExistingServer: false, timeout: 120_000, env: { ...process.env, E2E_DATABASE_URL: databaseUrl, E2E_AUDIT_FAILURES: '1', DATABASE_URL: databaseUrl } },
});
