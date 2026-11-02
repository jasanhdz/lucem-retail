import { defineConfig, devices } from '@playwright/test';
import { requireE2eDatabaseUrl } from './scripts/e2e/database';

const databaseUrl = requireE2eDatabaseUrl();
const authDir = 'playwright/.auth';

export default defineConfig({
  testDir: './e2e/dev-03',
  fullyParallel: false,
  reporter: 'list',
  globalSetup: './e2e/dev-test-01/setup.ts',
  globalTeardown: './e2e/dev-test-01/teardown.ts',
  outputDir: 'test-results/dev-03',
  use: { baseURL: 'http://127.0.0.1:3103', trace: 'retain-on-failure' },
  projects: [
    { name: 'chromium', grepInvert: /@visual/, use: { ...devices['Desktop Chrome'], storageState: `${authDir}/admin-centro.json` } },
    { name: 'visual-desktop', grep: /@visual/, use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 }, storageState: `${authDir}/admin-centro.json` } },
    { name: 'visual-tablet', grep: /@visual/, use: { ...devices['Desktop Chrome'], viewport: { width: 768, height: 1024 }, storageState: `${authDir}/admin-centro.json` } },
    { name: 'visual-mobile', grep: /@visual/, use: { ...devices['Pixel 5'], viewport: { width: 390, height: 844 }, storageState: `${authDir}/admin-centro.json` } },
  ],
  webServer: {
    command: 'npm run dev -- --hostname 127.0.0.1 --port 3103',
    url: 'http://127.0.0.1:3103/login',
    reuseExistingServer: false,
    timeout: 120_000,
    env: { ...process.env, E2E_DATABASE_URL: databaseUrl, DATABASE_URL: databaseUrl },
  },
});
