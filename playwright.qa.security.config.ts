import { defineConfig, devices } from '@playwright/test';
import { requireE2eDatabaseUrl } from './scripts/e2e/database';
import { qaPlaywrightOutputDir } from './scripts/qa/playwright-output';

if (!process.env.QA_DATABASE_URL) throw new Error('BLOCKED: QA_DATABASE_URL is required.');
process.env.QA_RUN = '1'; process.env.E2E_DATABASE_URL = process.env.QA_DATABASE_URL; process.env.E2E_DATABASE_USER = 'lucem_qa';
const databaseUrl = requireE2eDatabaseUrl();
export default defineConfig({
  testDir: './e2e/dev-sec-01', fullyParallel: false, workers: 1, reporter: 'list',
  globalSetup: './e2e/dev-test-01/setup.ts', globalTeardown: './e2e/dev-test-01/teardown.ts', outputDir: qaPlaywrightOutputDir('security', 'test-results/qa-01/security'),
  use: { baseURL: 'http://127.0.0.1:3114', trace: 'retain-on-failure' },
  projects: [{ name: 'qa-security-chromium', testMatch: /(?:audit|security-controls|product-pagination)\.spec\.ts/, use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: 'npx tsx scripts/qa/start-server.ts', url: 'http://127.0.0.1:3114/login', reuseExistingServer: false, timeout: 120_000,
    env: {
      ...process.env, QA_RUN: '1', QA_SERVER_PORT: '3114', QA_DATABASE_URL: databaseUrl, E2E_DATABASE_URL: databaseUrl, E2E_DATABASE_USER: 'lucem_qa', DATABASE_URL: databaseUrl,
      E2E_HTTP_LOOPBACK: 'true', E2E_RATE_LIMIT_TEST: 'true', CLOUDFLARE_QUICK_TUNNEL_ENABLED: 'false', E2E_UPLOAD_QUOTA_TEST: 'true',
      E2E_LUCEM_RATE_LIMIT_BUSINESS_CREATE_USER: '2', E2E_LUCEM_RATE_LIMIT_PRODUCT_CREATE_BUSINESS: '2', E2E_LUCEM_RATE_LIMIT_INVENTORY_WRITE: '2',
      E2E_LUCEM_RATE_LIMIT_COMMERCIAL_WRITE: '2', E2E_LUCEM_RATE_LIMIT_COMMERCIAL_READ: '2',
      E2E_LUCEM_UPLOAD_GLOBAL_MAX_BYTES: '128', E2E_LUCEM_UPLOAD_BUSINESS_MAX_BYTES: '128', E2E_LUCEM_UPLOAD_MIN_FREE_BYTES: '0',
    },
  },
});
