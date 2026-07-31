import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

test.describe('The Whole Loop portfolio', () => {
  test('renders the complete story and follows in-page navigation', async ({ page }) => {
    const consoleErrors: string[] = [];
    page.on('console', (message) => {
      if (message.type() === 'error') consoleErrors.push(message.text());
    });

    await page.goto('/');

    await expect(page).toHaveTitle(/Kamil Kerimov/);
    await expect(page.getByRole('heading', { level: 1, name: 'Kamil Kerimov' })).toBeVisible();
    await expect(page.getByText('I build the whole loop.')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Nar Patisserie', exact: true })).toBeAttached();
    await expect(page.getByRole('heading', { name: 'Trendyol Price Tracker', exact: true })).toBeAttached();
    await expect(page.getByRole('heading', { name: 'Blaster', exact: true })).toBeAttached();

    const menuButton = page.getByRole('button', { name: 'Open navigation' });
    if (await menuButton.isVisible()) await menuButton.click();
    await page.getByRole('link', { name: 'Journey', exact: true }).click();
    await expect(page).toHaveURL(/#journey$/);
    await expect(page.getByRole('heading', { name: /Map.*Build.*Break.*Test.*Ship/i })).toBeInViewport();

    expect(consoleErrors).toEqual([]);
  });

  test('exposes accessible project evidence and contact destinations', async ({ page }) => {
    await page.goto('/');

    await expect(page.getByAltText('Nar Patisserie home page').first()).toBeVisible();
    await expect(page.getByRole('link', { name: /View live demo/ })).toHaveAttribute('target', '_blank');
    await expect(page.getByRole('link', { name: /Open live bot/ })).toHaveAttribute('href', 'https://t.me/trendyolpw_bot');
    await expect(page.getByRole('link', { name: /Email me/ })).toHaveAttribute('href', 'mailto:kamil16092006@gmail.com');

    const results = await new AxeBuilder({ page }).analyze();
    expect(results.violations).toEqual([]);
  });

  test('keeps project captures uncropped and opens the full-view gallery', async ({ page }) => {
    await page.goto('/#nar');

    const captures = page.locator('#nar .media-shot img, #blaster .media-shot img');
    await captures.first().scrollIntoViewIfNeeded();
    await captures.evaluateAll((images) => Promise.all((images as HTMLImageElement[]).map((image) => image.decode())));

    const ratios = await captures.evaluateAll((images) => (images as HTMLImageElement[]).map((image) => {
      const bounds = image.getBoundingClientRect();
      return {
        displayed: bounds.width / bounds.height,
        natural: image.naturalWidth / image.naturalHeight,
      };
    }));

    for (const ratio of ratios) {
      expect(Math.abs(ratio.displayed - ratio.natural)).toBeLessThan(0.01);
    }

    await page.locator('#nar .media-shot').first().click();
    await expect(page.getByRole('dialog', { name: /image viewer/i })).toBeVisible();
    await page.getByRole('button', { name: /close/i }).click();
    await expect(page.getByRole('dialog', { name: /image viewer/i })).toHaveCount(0);
  });

  test('keeps the complete story with reduced motion and without canvas', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/');
    await expect(page.locator('canvas')).toHaveCount(0);
    await expect(page.getByText('When the happy path works, I ask what breaks next.').first()).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Blaster', exact: true })).toBeAttached();
  });

  test('remains understandable without the decorative K trace', async ({ page }) => {
    await page.goto('/');
    await page.addStyleTag({ content: '.loop-trace, .contact__signature { display: none !important; }' });
    await expect(page.getByRole('heading', { level: 1, name: 'Kamil Kerimov' })).toBeVisible();
    await expect(page.getByText('React interfaces people use. Python workflows they don’t see. Tests that keep both honest.')).toBeVisible();
    await expect(page.getByRole('link', { name: /Email me/ })).toBeAttached();
  });
});

test.describe('Mobile portfolio', () => {
  test.use({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });

  test('opens the compact navigation and never overflows horizontally', async ({ page }) => {
    await page.goto('/');

    const menu = page.getByRole('button', { name: 'Open navigation' });
    await expect(menu).toBeVisible();
    await menu.click();
    await expect(page.getByRole('button', { name: 'Close navigation' })).toHaveAttribute('aria-expanded', 'true');
    await page.getByRole('link', { name: 'Contact', exact: true }).click();
    await expect(page).toHaveURL(/#contact$/);

    const overflows = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
    expect(overflows).toBe(false);
  });
});
