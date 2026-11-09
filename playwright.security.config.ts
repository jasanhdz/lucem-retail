import { defineConfig, devices } from '@playwright/test';
import { requireE2eDatabaseUrl } from './scripts/e2e/database';

let databaseUrl: string;
try {
  databaseUrl = requireE2eDatabaseUrl();
} catch (error) {
  console.error(`BLOCKED: E2E PostgreSQL unavailable: ${error instanceof Error ? error.message : String(error)}`);
  throw error;
}

export default defineConfig({
  testDir: './e2e/dev-sec-01',
  fullyParallel: false,
  workers: 1,
  reporter: 'list',
  globalSetup: './e2e/dev-test-01/setup.ts',
  globalTeardown: './e2e/dev-test-01/teardown.ts',
  outputDir: 'test-results/dev-sec-01',
  use: { baseURL: 'http://127.0.0.1:3101', trace: 'retain-on-failure' },
  projects: [{ name: 'chromium', testMatch: /(?:audit|security-controls)\.spec\.ts/, use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: 'npm run start -- --hostname 127.0.0.1 --port 3101',
    url: 'http://127.0.0.1:3101/login',
    reuseExistingServer: false,
    timeout: 120_000,
    env: { ...process.env, E2E_DATABASE_URL: databaseUrl, DATABASE_URL: databaseUrl, E2E_HTTP_LOOPBACK: 'true' },
  },
});
