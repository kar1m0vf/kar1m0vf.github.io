import { expect, test } from '@playwright/test';

test.describe('Projects page modal', () => {
  test('keeps the close control above the scrollable modal content', async ({ page }) => {
    await page.goto('/projects.html');

    await page.locator('[data-project-card]').first().click();

    const modal = page.locator('[data-project-modal]');
    const closeButton = page.locator('.project-modal-close');
    const content = page.locator('[data-project-modal-content]');

    await expect(modal).toHaveAttribute('aria-hidden', 'false');
    await expect(closeButton).toBeVisible();
    await expect(content).toBeVisible();

    const closeBox = await closeButton.boundingBox();
    const contentBox = await content.boundingBox();

    expect(closeBox).not.toBeNull();
    expect(contentBox).not.toBeNull();
    expect(closeBox!.y).toBeLessThan(contentBox!.y);

    await closeButton.click();
    await expect(modal).toBeHidden();
  });
});

test.describe('Projects page modal on mobile', () => {
  test.use({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });

  test('keeps the close control reachable after scrolling modal content', async ({ page }) => {
    await page.goto('/projects.html');

    await page.locator('[data-project-card]').first().click();

    const modal = page.locator('[data-project-modal]');
    const closeButton = page.locator('.project-modal-close');
    const content = page.locator('[data-project-modal-content]');

    await expect(modal).toHaveAttribute('aria-hidden', 'false');
    await expect(closeButton).toBeVisible();

    await content.evaluate((node) => {
      node.scrollTop = node.scrollHeight;
    });

    await expect(closeButton).toBeVisible();

    const closeBox = await closeButton.boundingBox();
    expect(closeBox).not.toBeNull();
    expect(closeBox!.y).toBeGreaterThanOrEqual(0);
    expect(closeBox!.x + closeBox!.width).toBeLessThanOrEqual(390);

    await closeButton.click();
    await expect(modal).toBeHidden();
  });
});
