import { defineConfig, devices } from '@playwright/test';
import { requireE2eDatabaseUrl } from './scripts/e2e/database';
import { qaPlaywrightOutputDir } from './scripts/qa/playwright-output';

const databaseUrl = requireE2eDatabaseUrl();
process.env.DATABASE_URL = databaseUrl;

export default defineConfig({
  testDir: './e2e/dev-08',
  fullyParallel: false,
  reporter: 'list',
  globalSetup: './e2e/dev-08/setup.ts',
  globalTeardown: './e2e/dev-08/teardown.ts',
  outputDir: qaPlaywrightOutputDir('dev-08', 'test-results/dev-08'),
  use: { baseURL: 'http://127.0.0.1:3102', trace: 'retain-on-failure' },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: { command: 'npm run start -- --hostname 127.0.0.1 --port 3102', url: 'http://127.0.0.1:3102/registro', reuseExistingServer: false, timeout: 120_000, env: { ...process.env, E2E_DATABASE_URL: databaseUrl, DATABASE_URL: databaseUrl } },
});
