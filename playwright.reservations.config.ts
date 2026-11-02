import { defineConfig, devices } from '@playwright/test';
import { requireE2eDatabaseUrl } from './scripts/e2e/database';

const databaseUrl = requireE2eDatabaseUrl();
export default defineConfig({ testDir: './e2e/dev-06', fullyParallel: false, workers: 1, reporter: 'list', globalSetup: './e2e/dev-test-01/setup.ts', globalTeardown: './e2e/dev-test-01/teardown.ts', outputDir: 'test-results/dev-06', use: { baseURL: 'http://127.0.0.1:3106', trace: 'retain-on-failure' }, projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'], storageState: 'playwright/.auth/admin-centro.json' } }], webServer: { command: 'npm run dev -- --hostname 127.0.0.1 --port 3106', url: 'http://127.0.0.1:3106/login', reuseExistingServer: false, timeout: 120000, env: { ...process.env, E2E_DATABASE_URL: databaseUrl, DATABASE_URL: databaseUrl } } });
