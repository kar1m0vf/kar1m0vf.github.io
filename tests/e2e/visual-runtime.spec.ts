import { expect, test } from '@playwright/test';

test.describe('Adaptive visual runtime', () => {
  test('starts in lite mode on constrained devices', async ({ page }) => {
    await page.addInitScript(() => {
      const defineNavigatorValue = (key: string, value: unknown) => {
        try {
          Object.defineProperty(Navigator.prototype, key, {
            configurable: true,
            get: () => value,
          });
        } catch (error) {
          // Some browsers expose these as own read-only properties.
        }

        try {
          Object.defineProperty(window.navigator, key, {
            configurable: true,
            get: () => value,
          });
        } catch (error) {
          // The runtime falls back safely when a signal cannot be overridden.
        }
      };

      defineNavigatorValue('deviceMemory', 2);
      defineNavigatorValue('hardwareConcurrency', 2);
      defineNavigatorValue('connection', { saveData: true });
    });

    await page.goto('/');

    const root = page.locator('html');
    await expect(root).toHaveClass(/device-weak/);
    await expect(root).toHaveClass(/perf-lite/);
    await expect(root).toHaveClass(/effects-tier-lite/);
  });
});
