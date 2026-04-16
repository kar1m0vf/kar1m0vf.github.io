import { expect, test } from '@playwright/test';

test.describe('Homepage core UX', () => {
  test('renders flagship surface and supports tab switching', async ({ page }) => {
    await page.goto('/');

    await expect(page.getByRole('heading', { name: 'Kamil Kerimov' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Trendyol Price Tracker' })).toBeVisible();

    const alertsTab = page.locator('[data-flagship-tab="alerts"]');
    await alertsTab.click();
    await expect(alertsTab).toHaveAttribute('aria-selected', 'true');
    await expect(page.locator('#flagship-panel-alerts')).toBeVisible();
    await expect(page.locator('[data-flagship-copy="alerts"]')).toBeVisible();
  });

  test('ops surface allows manual step selection and feed sync', async ({ page }) => {
    await page.goto('/');

    const parseStep = page.locator('[data-ops-step]').filter({ hasText: 'Parse' });
    await parseStep.click();

    await expect(parseStep).toHaveClass(/is-active/);
    await expect(page.locator('[data-ops-events]')).toContainText('Parser normalized product payload');
  });
});

test.describe('Mobile navigation', () => {
  test.use({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });

  test('opens and closes burger menu with body scroll lock', async ({ page }) => {
    await page.goto('/');

    const menuToggle = page.locator('.menu-toggle');
    await expect(menuToggle).toBeVisible();
    await menuToggle.click();

    await expect(page.locator('.topbar')).toHaveClass(/menu-open/);
    await expect(page.locator('body')).toHaveClass(/nav-menu-open/);

    await page.keyboard.press('Escape');
    await expect(page.locator('.topbar')).not.toHaveClass(/menu-open/);
  });
});
