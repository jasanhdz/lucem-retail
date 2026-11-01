import { defineConfig, devices } from '@playwright/test';
import { requireE2eDatabaseUrl } from './scripts/e2e/database';

const databaseUrl = requireE2eDatabaseUrl();
const authDir = 'playwright/.auth';

export default defineConfig({
  testDir: './e2e/dev-test-01',
  fullyParallel: false,
  reporter: 'list',
  outputDir: 'test-results/dev-test-01',
  use: { baseURL: 'http://127.0.0.1:3101', trace: 'retain-on-failure' },
  projects: [
    { name: 'setup', testMatch: /setup\.ts/ },
    { name: 'chromium', dependencies: ['setup'], testMatch: /(?:api|browser)\.spec\.ts/, use: { ...devices['Desktop Chrome'] } },
    { name: 'visual-desktop', dependencies: ['setup'], testMatch: /visual\.spec\.ts/, use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 }, storageState: `${authDir}/admin.json` } },
    { name: 'visual-tablet', dependencies: ['setup'], testMatch: /visual\.spec\.ts/, use: { ...devices['Desktop Chrome'], viewport: { width: 768, height: 1024 }, storageState: `${authDir}/admin.json` } },
    { name: 'visual-mobile', dependencies: ['setup'], testMatch: /visual\.spec\.ts/, use: { ...devices['Pixel 5'], viewport: { width: 390, height: 844 }, storageState: `${authDir}/admin.json` } },
  ],
  webServer: {
    command: 'npm run start -- --hostname 127.0.0.1 --port 3101',
    url: 'http://127.0.0.1:3101/login',
    reuseExistingServer: false,
    timeout: 120_000,
    env: { ...process.env, E2E_DATABASE_URL: databaseUrl, DATABASE_URL: databaseUrl },
  },
});
