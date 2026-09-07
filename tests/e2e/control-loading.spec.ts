import { expect, test, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

async function ready(page: Page, hash = '') {
  await page.goto(`/${hash}`);
  await expect(page.locator('.site-loader')).toHaveCount(0, { timeout: 22_000 });
}
const trigger = (page: Page) => page.getByRole('button', { name: 'Open K Control', exact: true });
const dialog = (page: Page) => page.getByRole('dialog', { name: 'K Control', exact: true });

test('loader waits for media, then reveals the introduction without Skip intro', async ({ page }) => {
  let release!: () => void;
  const gate = new Promise<void>((resolve) => { release = resolve; });
  await page.route('**/media/**', async (route) => { await gate; await route.continue(); });
  try {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('.site-loader')).toBeVisible();
    await expect(page.locator('.site')).toHaveAttribute('inert', '');
    await expect(trigger(page)).toBeHidden();
    await expect(page.locator('.site-loader__readout')).toContainText('Loading portfolio');
    await expect(page.locator('.site-loader__readout output')).not.toHaveText('100%');
  } finally { release(); }
  await expect(page.locator('.site-loader')).toHaveCount(0, { timeout: 22_000 });
  await expect(page.locator('.site')).not.toHaveAttribute('inert', '');
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  await expect(page.getByText('Skip intro', { exact: false })).toHaveCount(0);
  await expect(page.locator('.skip-link')).toHaveText('Skip to content');
});

test('K Control routes through all seven chapters and preserves keyboard focus', async ({ page }) => {
  await ready(page, '#nar');
  await trigger(page).focus();
  await page.keyboard.press('Control+k');
  const destinations = dialog(page).getByRole('navigation', { name: 'K Control destinations' });
  await expect(destinations.getByRole('link')).toHaveCount(7);
  await expect(destinations.getByRole('link', { name: 'Nar Patisserie', exact: true })).toBeFocused();
  await page.keyboard.press('End');
  await expect(destinations.getByRole('link', { name: 'Contact', exact: true })).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(dialog(page)).toBeHidden();
  await expect(page).toHaveURL(/#contact$/);
  await expect(page.locator('#contact h2')).toBeFocused();
  await page.keyboard.press('Control+k');
  await expect(destinations.getByRole('link', { name: 'Contact', exact: true })).toHaveAttribute('aria-current', 'location');
  await expect(destinations.getByRole('link', { name: 'Contact', exact: true })).toBeFocused();
  await page.keyboard.press('Home');
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(/#method$/);
  await expect(page.locator('#method h2').first()).toBeFocused();
  await page.keyboard.press('Control+k');
  await page.keyboard.press('Escape');
  await expect(page.locator('#method h2').first()).toBeFocused();
  await trigger(page).click();
  await page.getByRole('button', { name: 'Close K Control', exact: true }).click();
  await expect(trigger(page)).toBeFocused();
});

test('settings stay open, apply immediately and survive a reload', async ({ page }) => {
  await ready(page, '#nar');
  await trigger(page).click();
  const builder = page.getByRole('switch', { name: 'Builder Mode', exact: true });
  const sound = page.getByRole('switch', { name: 'Interface Sound', exact: true });
  await builder.click();
  await expect(builder).toHaveAttribute('aria-checked', 'true');
  await expect(dialog(page)).toBeVisible();
  await expect(page.locator('html')).toHaveAttribute('data-builder-mode', 'true');
  await sound.click();
  await expect(sound).toHaveAttribute('aria-checked', 'false');
  await page.reload();
  await expect(page.locator('.site-loader')).toHaveCount(0, { timeout: 22_000 });
  await trigger(page).click();
  await expect(builder).toHaveAttribute('aria-checked', 'true');
  await expect(sound).toHaveAttribute('aria-checked', 'false');
  await builder.click();
  await expect(page.locator('html')).toHaveAttribute('data-builder-mode', 'false');
});

test('modal traps focus, ignores input shortcuts, and remains accessible on short screens', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await ready(page, '#trendyol');
  await page.getByRole('slider', { name: 'Your target price', exact: true }).focus();
  await page.keyboard.press('Control+k');
  await expect(dialog(page)).toBeHidden();
  await trigger(page).click();
  await expect(page.getByRole('button', { name: 'Close K Control', exact: true })).toBeFocused();
  await page.keyboard.press('Shift+Tab');
  await expect(dialog(page).getByRole('link', { name: 'LinkedIn', exact: true })).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(page.getByRole('button', { name: 'Close K Control', exact: true })).toBeFocused();
  await expect(dialog(page).getByRole('link', { name: 'Email', exact: true })).toHaveAttribute('href', 'mailto:kamil16092006@gmail.com');
  expect((await new AxeBuilder({ page }).include('#k-control-dialog').analyze()).violations).toEqual([]);
  await page.setViewportSize({ width: 360, height: 640 });
  await expect(dialog(page)).toBeVisible();
  expect(await dialog(page).evaluate((el) => el.scrollWidth > el.clientWidth)).toBe(false);
  expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false);
  await dialog(page).getByRole('link', { name: 'LinkedIn', exact: true }).focus();
  await expect(dialog(page).getByRole('link', { name: 'LinkedIn', exact: true })).toBeInViewport();
  await page.keyboard.press('Escape');
  await expect(trigger(page)).toBeFocused();
  await trigger(page).click();
  await page.mouse.click(180, 2);
  await expect(dialog(page)).toBeHidden();
  await expect(trigger(page)).toBeFocused();
  expect(errors).toEqual([]);
});

test('reduced motion and blocked storage keep controls and game icons usable', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.addInitScript(() => {
    Storage.prototype.getItem = () => { throw new DOMException('Blocked', 'SecurityError'); };
    Storage.prototype.setItem = () => { throw new DOMException('Blocked', 'SecurityError'); };
  });
  await ready(page, '#nar');
  const favourite = page.getByRole('button', { name: 'Save chocolate cake', exact: true });
  await expect(favourite.locator('svg')).toHaveCount(1);
  await favourite.click();
  await expect(page.getByRole('button', { name: 'Chocolate cake saved', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await trigger(page).click();
  await expect(dialog(page)).toHaveCSS('animation-name', 'none');
  await page.getByRole('switch', { name: 'Builder Mode', exact: true }).click();
  await expect(page.locator('html')).toHaveAttribute('data-builder-mode', 'true');
  await dialog(page).getByRole('link', { name: 'Blaster', exact: true }).click();
  const game = page.locator('.mini-blaster');
  await game.getByRole('button', { name: 'Play 15-second run', exact: true }).click();
  await expect(game).toHaveAttribute('data-phase', 'running');
  const pause = game.getByRole('button', { name: 'Pause Mini Blaster', exact: true });
  await expect(pause.locator('svg')).toHaveCount(1);
  await pause.click();
  await expect(game).toHaveAttribute('data-phase', 'paused');
  await game.getByRole('button', { name: 'Resume Mini Blaster', exact: true }).click();
  await expect(game).toHaveAttribute('data-phase', 'running');
  await trigger(page).click();
  await expect(game).toHaveAttribute('data-phase', 'paused');
  await page.keyboard.press('Escape');
  await expect(game).toHaveAttribute('data-phase', 'paused');
  await game.getByRole('button', { name: /Restart/ }).click();
  await expect(game).toHaveAttribute('data-phase', 'running');
});
