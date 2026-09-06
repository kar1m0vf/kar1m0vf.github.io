import { expect, test } from '@playwright/test';

test('one middle canvas follows project anchors and a reversible scroll passage', async ({ page }) => {
  await page.goto('/#connections');
  await expect(page.locator('.site-loader')).toHaveCount(0, { timeout: 20_000 });
  const canvas = page.locator('.continuity-canvas canvas');
  await expect(page.locator('.continuous-story')).toHaveAttribute('data-renderer', 'ready');
  await expect(canvas).toHaveCount(1);
  await expect(canvas).toHaveAttribute('data-phase', 'connections');
  // Resolve document coordinates from the live rectangle, independent of containing blocks.
  await page.evaluate(() => {
    const el = document.getElementById('connections')!;
    window.scrollTo({ top: el.getBoundingClientRect().top + scrollY + (el.offsetHeight - innerHeight) * 0.75, behavior: 'instant' });
  });
  await expect(canvas).toHaveAttribute('data-phase', 'through');
  await page.evaluate(() => document.getElementById('connections')!.scrollIntoView({ behavior: 'instant' }));
  await expect(canvas).toHaveAttribute('data-phase', 'connections');
  await page.getByRole('link', { name: 'Next · Trendyol Price Tracker' }).click();
  await expect(page).toHaveURL(/#trendyol$/);
  await expect(page.getByRole('slider', { name: 'Your target price', exact: true })).toBeAttached();
  await expect(canvas).toHaveCount(1);
  expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false);
});

test('middle content and the next-project link survive unavailable WebGL', async ({ page }) => {
  await page.addInitScript(() => {
    const original = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (type: string, ...args: unknown[]) {
      if (type === 'webgl2' || type === 'webgl' || type === 'experimental-webgl') return null;
      return original.apply(this, [type, ...args] as Parameters<typeof original>);
    } as typeof original;
  });
  await page.goto('/#connections');
  await expect(page.locator('.site-loader')).toHaveCount(0, { timeout: 20_000 });
  await expect(page.locator('.continuous-story')).toHaveAttribute('data-renderer', 'fallback');
  await expect(page.locator('.thread-passage__sticky')).not.toHaveCSS('position', 'sticky');
  await page.getByRole('link', { name: 'Next · Trendyol Price Tracker' }).click();
  await expect(page).toHaveURL(/#trendyol$/);
  await page.getByRole('slider', { name: 'Your target price', exact: true }).fill('1300');
  await expect(page.locator('.signal-world__outcome')).toContainText('tell you at 07:00.');
});
