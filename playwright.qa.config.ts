import { defineConfig, devices } from '@playwright/test';
import { requireE2eDatabaseUrl } from './scripts/e2e/database';
import { qaPlaywrightOutputDir } from './scripts/qa/playwright-output';

if (!process.env.QA_DATABASE_URL) throw new Error('BLOCKED: QA_DATABASE_URL required; QA browser/server will not start.');
process.env.QA_RUN = '1';
process.env.E2E_DATABASE_URL = process.env.QA_DATABASE_URL;
process.env.E2E_DATABASE_USER = 'lucem_qa';
const databaseUrl = requireE2eDatabaseUrl();

export default defineConfig({
  testDir: './e2e',
  testMatch: [/dev-01-auth\.spec\.ts$/, /qa-01\/audit\.spec\.ts$/],
  fullyParallel: false,
  workers: 1,
  reporter: [['list'], ['html', { outputFolder: process.env.QA_PLAYWRIGHT_REPORT_DIR || 'test-results/qa-01/playwright-report', open: 'never' }]],
  outputDir: qaPlaywrightOutputDir('qa-browser', 'test-results/qa-01/playwright'),
  globalSetup: './e2e/dev-test-01/setup.ts',
  globalTeardown: './e2e/dev-test-01/teardown.ts',
  use: { baseURL: 'http://127.0.0.1:3113', trace: 'retain-on-failure', screenshot: 'only-on-failure', video: 'off' },
  projects: [{ name: 'qa-chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: 'npx tsx scripts/qa/start-server.ts',
    url: 'http://127.0.0.1:3113/login',
    reuseExistingServer: false,
    timeout: 120_000,
    env: { ...process.env, QA_RUN: '1', QA_DATABASE_URL: databaseUrl, E2E_DATABASE_URL: databaseUrl, E2E_DATABASE_USER: 'lucem_qa', DATABASE_URL: databaseUrl },
  },
});
