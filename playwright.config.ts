import { defineConfig, devices } from '@playwright/test';

if (!process.env.PLAYWRIGHT_BROWSERS_PATH) {
  process.env.PLAYWRIGHT_BROWSERS_PATH = '.playwright-browsers';
}

const PORT = 4173;
const BASE_URL = `http://127.0.0.1:${PORT}`;
const ciLikeReporterMode = Boolean(process.env.CI || process.env.PW_JSON_REPORT === '1');

export default defineConfig({
  testDir: './tests/e2e',
  timeout: 30_000,
  expect: {
    timeout: 7_000,
  },
  fullyParallel: true,
  retries: process.env.CI ? 1 : 0,
  reporter: ciLikeReporterMode
    ? [
        ...(process.env.CI ? [['github'] as const] : [['list'] as const]),
        ['html', { open: 'never' }],
        ['json', { outputFile: 'test-results/playwright-report.json' }],
      ]
    : [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: BASE_URL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  outputDir: 'test-results/playwright-artifacts',
  webServer: {
    command: `npx http-server . -p ${PORT} -c-1 --silent`,
    url: BASE_URL,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
  projects: [
    {
      name: 'chromium-desktop',
      use: {
        ...devices['Desktop Chrome'],
      },
    },
    {
      name: 'chromium-mobile',
      use: {
        ...devices['Pixel 5'],
      },
    },
  ],
});
