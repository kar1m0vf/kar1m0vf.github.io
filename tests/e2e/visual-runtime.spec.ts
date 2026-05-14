import { expect, test } from '@playwright/test';

test.describe('Adaptive visual runtime', () => {
  test('uses balanced effects by default without starting the canvas layer', async ({ page }, testInfo) => {
    await page.goto('/');

    const isMobileProject = testInfo.project.name.includes('mobile');
    const root = page.locator('html');
    await expect(root).toHaveClass(/effects-tier-balanced/);
    await expect(root).toHaveClass(/ambient-lite/);
    await expect(root).not.toHaveClass(/has-global-pointer-effects/);
    if (!isMobileProject) {
      await expect(root).toHaveClass(/has-pointer-effects/);
    }
    await expect(page.locator('.bg-particles-canvas')).toHaveCount(0);
  });

  test('allows full visual runtime through the effects query parameter', async ({ page }, testInfo) => {
    await page.goto('/?effects=full');

    const isMobileProject = testInfo.project.name.includes('mobile');
    const root = page.locator('html');
    await expect(root).toHaveClass(/effects-tier-full/);
    await expect(root).toHaveClass(/ambient-full/);
    if (!isMobileProject) {
      await expect(root).toHaveClass(/has-global-pointer-effects/);
    }
    await expect(page.locator('.bg-particles-canvas')).toHaveCount(1);
  });

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
