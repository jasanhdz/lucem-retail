import { defineConfig, devices } from '@playwright/test';
import { qaPlaywrightOutputDir } from './scripts/qa/playwright-output';

const readOnlyDatabaseUrl = 'postgresql://lucem_qa:read-only-placeholder@127.0.0.1:55433/lucem_qa?schema=public';
export default defineConfig({
  testDir: './e2e/qa-01',
  testMatch: /audit\.spec\.ts/,
  grep: /@qa-observe|@qa-axe|@qa-performance/,
  fullyParallel: false,
  workers: 1,
  reporter: [['list'], ['html', { outputFolder: process.env.QA_PLAYWRIGHT_REPORT_DIR || 'test-results/qa-01/readonly-report', open: 'never' }]],
  outputDir: qaPlaywrightOutputDir('readonly-browser', 'test-results/qa-01/readonly-playwright'),
  snapshotPathTemplate: '{testDir}/../../qa/visual-baselines/{arg}{ext}',
  use: { baseURL: 'http://127.0.0.1:3113', viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce', trace: 'off' },
  projects: [{ name: 'qa-readonly-chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: 'npm run dev -- --hostname 127.0.0.1 --port 3113',
    url: 'http://127.0.0.1:3113/login',
    reuseExistingServer: false,
    timeout: 120_000,
    env: { ...process.env, QA_READ_ONLY: '1', DATABASE_URL: readOnlyDatabaseUrl, NEXT_DIST_DIR: '.next-qa-readonly', CLOUDFLARE_QUICK_TUNNEL_ENABLED: 'false' },
  },
});
