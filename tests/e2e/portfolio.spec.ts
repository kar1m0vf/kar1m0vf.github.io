import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Locator } from '@playwright/test';

async function expectLoadedAndContained(image: Locator) {
  await image.scrollIntoViewIfNeeded();
  await expect(image).toBeVisible();
  await expect.poll(
    () => image.evaluate((node) => {
      const value = node as HTMLImageElement;
      return value.complete && value.naturalWidth > 0 && value.naturalHeight > 0;
    }),
    { message: 'project capture should finish loading' },
  ).toBe(true);
  await expect(image).toHaveCSS('object-fit', 'contain');

  const box = await image.boundingBox();
  expect(box?.width ?? 0).toBeGreaterThan(0);
  expect(box?.height ?? 0).toBeGreaterThan(0);
}

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
    const primaryNav = page.getByRole('navigation', { name: 'Primary navigation' });
    await primaryNav.getByRole('link', { name: 'Journey', exact: true }).click();
    await expect(page).toHaveURL(/#journey$/);
    const journey = page.locator('#journey');
    await expect(journey).toBeInViewport();
    await expect(journey.getByRole('heading', { level: 2, name: /Kamil Kerimov’s software journey/i })).toBeAttached();
    await expect(journey.getByText('A software path, built from Baku.', { exact: true })).toBeVisible();

    expect(consoleErrors).toEqual([]);
  });

  test('exposes accessible project evidence and contact destinations', async ({ page }) => {
    await page.goto('/');

    await expect(page.getByAltText('Nar Patisserie home page').first()).toBeVisible();
    await expect(page.getByRole('link', { name: /View live demo/ })).toHaveAttribute('target', '_blank');
    await expect(page.getByRole('link', { name: /Open live bot/ })).toHaveAttribute('href', 'https://t.me/trendyolpw_bot');
    await expect(page.locator('#contact').getByRole('link', { name: /Email Kamil Kerimov/i }))
      .toHaveAttribute('href', 'mailto:kamil16092006@gmail.com');

    const results = await new AxeBuilder({ page }).analyze();
    expect(results.violations).toEqual([]);
  });

  test('keeps project captures uncropped and opens the full-view gallery', async ({ page }) => {
    await page.goto('/#nar');
    await expect(page.locator('.site-loader')).toHaveCount(0, { timeout: 20_000 });

    const narCapture = page.locator('#nar .media-shot img').first();
    await expectLoadedAndContained(narCapture);

    await page.locator('#nar .media-shot').first().click();
    const lightbox = page.getByRole('dialog', { name: /image viewer/i });
    await expect(lightbox).toBeVisible();
    await expectLoadedAndContained(lightbox.locator('img'));
    await page.getByRole('button', { name: /close/i }).click();
    await expect(lightbox).toHaveCount(0);

    const blasterCaptures = page.locator('#blaster .blaster-evidence__shot img');
    await expect(blasterCaptures).toHaveCount(3);
    for (let index = 0; index < await blasterCaptures.count(); index += 1) {
      await expectLoadedAndContained(blasterCaptures.nth(index));
    }
  });

  test('keeps the complete story with reduced motion', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/');
    await expect.poll(() => page.evaluate(() => matchMedia('(prefers-reduced-motion: reduce)').matches)).toBe(true);
    await expect(page.getByRole('heading', { level: 1, name: 'Kamil Kerimov' })).toBeVisible();
    await expect(page.locator('#method').getByRole('heading', {
      level: 2,
      name: /The junction.*One signal.*Three ways to build/i,
    })).toBeAttached();

    const blaster = page.locator('#blaster');
    await expect(blaster.getByRole('heading', { name: 'Blaster', exact: true })).toBeAttached();
    await blaster.scrollIntoViewIfNeeded();
    const miniBlaster = blaster.locator('.mini-blaster');
    await expect(miniBlaster).toHaveAttribute('data-reduced-effects', 'true');
    await expect(miniBlaster.getByText('Reduced visual effects', { exact: true })).toBeVisible();
    await expect(page.locator('canvas:not([aria-hidden="true"])')).toHaveCount(0);
  });

  test('remains understandable without the decorative thread', async ({ page }) => {
    await page.goto('/');
    await page.addStyleTag({ content: '.thread-sculpture, .loop-trace, .contact__signal-canvas { display: none !important; }' });
    await expect(page.getByRole('heading', { level: 1, name: 'Kamil Kerimov' })).toBeVisible();
    await expect(page.locator('#top').getByText(
      /I turn ideas into useful experiences\. Curious about people, design, and what technology can make possible\./i,
    )).toBeVisible();
    await expect(page.locator('#method').getByRole('heading', {
      name: /The junction.*One signal.*Three ways to build/i,
    })).toBeAttached();
    await expect(page.locator('#contact').getByRole('link', { name: /Email Kamil Kerimov/i })).toBeAttached();
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
