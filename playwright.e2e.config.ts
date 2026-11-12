import { defineConfig, devices } from '@playwright/test';
import { requireE2eDatabaseUrl } from './scripts/e2e/database';
import { qaPlaywrightOutputDir } from './scripts/qa/playwright-output';

let databaseUrl: string;
try {
  databaseUrl = requireE2eDatabaseUrl();
} catch (error) {
  console.error(`BLOCKED: E2E PostgreSQL unavailable: ${error instanceof Error ? error.message : String(error)}`);
  throw error;
}
const authDir = 'playwright/.auth';

export default defineConfig({
  testDir: './e2e/dev-test-01',
  fullyParallel: false,
  // These specs share the deterministic DEV-TEST-01 businesses, sessions and inventory.
  workers: 1,
  reporter: 'list',
  globalSetup: './e2e/dev-test-01/setup.ts',
  globalTeardown: './e2e/dev-test-01/teardown.ts',
  outputDir: qaPlaywrightOutputDir('dev-test-01', 'test-results/dev-test-01'),
  use: { baseURL: 'http://127.0.0.1:3101', trace: 'retain-on-failure' },
  projects: [
    { name: 'chromium', testMatch: /(?:api|browser|dashboard-states)\.spec\.ts/, use: { ...devices['Desktop Chrome'] } },
    { name: 'visual-desktop', testMatch: /visual\.spec\.ts/, use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 768 }, storageState: `${authDir}/admin-centro.json` } },
    { name: 'visual-desktop-wide', testMatch: /visual\.spec\.ts/, use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 }, storageState: `${authDir}/admin-centro.json` } },
    { name: 'visual-tablet', testMatch: /visual\.spec\.ts/, use: { ...devices['Desktop Chrome'], viewport: { width: 768, height: 1024 }, storageState: `${authDir}/admin-centro.json` } },
    { name: 'visual-mobile', testMatch: /visual\.spec\.ts/, use: { ...devices['Pixel 5'], viewport: { width: 390, height: 844 }, storageState: `${authDir}/admin-centro.json` } },
  ],
  webServer: {
    command: 'npm run dev -- --hostname 127.0.0.1 --port 3101',
    url: 'http://127.0.0.1:3101/login',
    reuseExistingServer: false,
    timeout: 120_000,
    env: { ...process.env, E2E_DATABASE_URL: databaseUrl, DATABASE_URL: databaseUrl, NEXT_DIST_DIR: '.next-e2e' },
  },
});
