import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  reporter: 'list',
  use: { baseURL: 'http://127.0.0.1:3101', trace: 'retain-on-failure' },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: 'npm run start -- --hostname 127.0.0.1 --port 3101',
    url: 'http://127.0.0.1:3101/login',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
