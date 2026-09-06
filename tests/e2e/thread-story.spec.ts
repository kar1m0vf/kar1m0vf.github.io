import { expect, test } from '@playwright/test';

test.describe('The living blue thread', () => {
  test('renders WebGL and follows the story in both scroll directions', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await page.goto('/');
    await expect(page.locator('.site-loader')).toHaveCount(0, { timeout: 20_000 });
    await expect(page.locator('#top .thread-sculpture')).toHaveAttribute('data-renderer', 'ready');
    const canvas = page.locator('#top .thread-sculpture canvas');
    await expect(canvas).toHaveAttribute('data-phase', 'knot');
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();

    const chapters = page.getByRole('navigation', { name: 'Introduction chapters' });
    await chapters.getByRole('button', { name: 'My perspective' }).click();
    await expect(page.getByRole('heading', { name: /More than one dimension/ })).toBeVisible();
    await expect(canvas).toHaveAttribute('data-phase', 'aperture');
    await expect(page.getByRole('link', { name: /Explore my work/ })).toHaveCount(0);

    await chapters.getByRole('button', { name: 'Selected work' }).click();
    await expect(page.getByRole('heading', { name: /Follow the thread/ })).toBeVisible();
    await expect(canvas).toHaveAttribute('data-phase', 'thread');

    await chapters.getByRole('button', { name: 'Meet me' }).click();
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    await expect(canvas).toHaveAttribute('data-phase', 'knot');
    await page.getByRole('link', { name: /Skip intro/ }).click();
    await expect(page).toHaveURL(/#method$/);
    await expect(page.locator('#method')).toBeInViewport();
    expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false);
    expect(errors).toEqual([]);
  });

  test('keeps the introduction usable when WebGL is unavailable', async ({ page }) => {
    await page.addInitScript(() => {
      const original = HTMLCanvasElement.prototype.getContext;
      HTMLCanvasElement.prototype.getContext = function (type: string, ...args: unknown[]) {
        if (type === 'webgl2' || type === 'webgl') return null;
        return Reflect.apply(original, this, [type, ...args]);
      } as typeof original;
    });
    await page.goto('/');
    await expect(page.locator('#top .thread-sculpture')).toHaveAttribute('data-renderer', 'fallback', { timeout: 20_000 });
    await expect(page.locator('#top .thread-sculpture__fallback')).toBeVisible();
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    await page.getByRole('button', { name: 'My perspective' }).click();
    await expect(page.getByRole('heading', { name: /More than one dimension/ })).toBeVisible();
    await page.getByRole('link', { name: /Skip intro/ }).click();
    await expect(page.locator('#method')).toBeInViewport();
  });

  test('shows every introduction chapter in normal flow with reduced motion', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/');
    await expect(page.locator('.site-loader')).toHaveCount(0, { timeout: 20_000 });
    await expect(page.locator('.thread-story__sticky')).toHaveCSS('position', 'relative');
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    const perspective = page.getByRole('heading', { name: /More than one dimension/ });
    await perspective.scrollIntoViewIfNeeded();
    await expect(perspective).toBeInViewport();
    const closing = page.getByRole('heading', { name: /Follow the thread/ });
    await closing.scrollIntoViewIfNeeded();
    await expect(closing).toBeInViewport();
    await expect(page.getByRole('navigation', { name: 'Introduction chapters' })).toHaveCount(0);
    await page.getByRole('link', { name: /Discover the work/ }).click();
    await expect(page.locator('#method')).toBeInViewport();
  });
});
