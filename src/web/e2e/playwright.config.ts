import { defineConfig, devices } from '@playwright/test';
import { adminState } from './support/admin';

const port = Number(process.env['E2E_ADMIN_PORT'] ?? 19443);
const baseURL = `https://127.0.0.1:${port}`;

export default defineConfig({
  testDir: '.',
  outputDir: '../test-results',
  fullyParallel: false,
  workers: 1,
  forbidOnly: !!process.env['CI'],
  retries: process.env['CI'] ? 1 : 0,
  reporter: process.env['CI']
    ? [['list'], ['html', { open: 'never', outputFolder: '../playwright-report' }]]
    : 'list',
  use: {
    baseURL,
    ignoreHTTPSErrors: true,
    trace: 'retain-on-failure',
  },
  projects: [
    { name: 'setup', testMatch: /setup\.setup\.ts/, use: { ...devices['Desktop Chrome'] } },
    {
      name: 'chromium',
      dependencies: ['setup'],
      use: { ...devices['Desktop Chrome'], storageState: adminState },
    },
  ],
  webServer: {
    command: 'node support/server.mjs',
    url: `${baseURL}/health/ready`,
    ignoreHTTPSErrors: true,
    timeout: 180_000,
    reuseExistingServer: false,
    stdout: 'ignore',
    stderr: 'pipe',
  },
});
