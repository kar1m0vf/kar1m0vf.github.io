import { expect, test } from '@playwright/test';

const loaded = async (page: import('@playwright/test').Page, hash: string) => {
  await page.goto(`/${hash}`);
  await expect(page.locator('.site-loader')).toHaveCount(0, { timeout: 20_000 });
};

test('personal perspectives work with keyboard and retain a clear next step', async ({ page }) => {
  await loaded(page, '#method');
  const about = page.locator('#method');
  const scrollScene = await page.evaluate(() => matchMedia('(min-width:960px) and (min-height:650px) and (prefers-reduced-motion:no-preference)').matches);
  if (scrollScene) await expect(about.locator('.personal-intro__sticky')).toHaveCSS('position', 'sticky');
  const first = about.getByRole('tab', { name: /Make something useful/ });
  await first.click();
  await first.press('ArrowDown');
  await expect(about.getByRole('tab', { name: /Understand the details/ })).toBeFocused();
  await expect(about.getByRole('tabpanel')).toContainText('The interesting part is often the question.');
  await about.getByRole('tab', { name: /Understand the details/ }).press('End');
  await expect(about.getByRole('tabpanel')).toContainText('Good things happen with other people.');
  await about.getByRole('link', { name: 'A little beyond the work' }).click();
  await expect(page).toHaveURL(/#journey$/);
  await expect(page.locator('#journey')).toBeInViewport();
  if (scrollScene) {
    await page.setViewportSize({ width: 390, height: 844 });
    await about.scrollIntoViewIfNeeded();
    await about.getByRole('tab', { name: /Make something useful/ }).click();
    await expect(about.getByRole('tabpanel')).toContainText('A small frustration. A reason to build.');
  }
});

test('Nar remembers a visitor’s choice across reloads', async ({ page }) => {
  await loaded(page, '#nar');
  await page.getByRole('button', { name: 'Save chocolate cake' }).click();
  await expect(page.getByRole('button', { name: 'Chocolate cake saved' })).toHaveAttribute('aria-pressed', 'true');
  await page.reload();
  await expect(page.locator('.site-loader')).toHaveCount(0, { timeout: 20_000 });
  await expect(page.getByRole('button', { name: 'Chocolate cake saved' })).toHaveAttribute('aria-pressed', 'true');
  await page.getByRole('button', { name: 'Chocolate cake saved' }).click();
  await expect(page.getByRole('button', { name: 'Save chocolate cake' })).toHaveAttribute('aria-pressed', 'false');
});

test('price checks show progress before a result and reset when rules change', async ({ page }) => {
  test.setTimeout(60_000);
  await loaded(page, '#trendyol');
  const world = page.locator('.signal-world');
  const preview = world.locator('.signal-world__outcome');
  const current = page.getByRole('slider', { name: 'Illustrative current price', exact: true });
  const target = page.getByRole('slider', { name: 'Your target price', exact: true });
  const quiet = page.getByRole('button', { name: /Quiet hours/ });
  const expectIdle = async () => {
    await expect(world).toHaveAttribute('data-check-status', 'idle');
    await expect(world).toHaveAttribute('data-outcome', 'idle');
    await expect(preview).toContainText('Waiting for your check.');
    await expect(preview).not.toContainText('Your price is here.');
    await expect(page.getByRole('button', { name: 'Check price', exact: true })).toBeEnabled();
  };
  const expectChecking = async () => {
    await expect(world).toHaveAttribute('data-check-status', 'checking');
    await expect(world).toHaveAttribute('data-outcome', 'checking');
    await expect(page.getByRole('button', { name: 'Checking…', exact: true })).toBeDisabled();
    await expect(current).toBeDisabled();
    await expect(target).toBeDisabled();
    await expect(quiet).toBeDisabled();
  };

  await expectIdle();
  await target.fill('1000');
  await expectIdle();
  await page.getByRole('button', { name: 'Check price', exact: true }).click();
  await expectChecking();
  await expect(preview).not.toContainText('Not at your target yet.');
  await expect(world).toHaveAttribute('data-check-status', 'complete');
  await expect(world).toHaveAttribute('data-outcome', 'memory');
  await expect(preview).toContainText('Not at your target yet.');
  await expect(preview).toContainText('₺1,099');
  await expect(preview).toContainText('₺1,000');

  await target.fill('1300');
  await expectIdle();
  await expect(preview).not.toContainText('Not at your target yet.');
  await page.getByRole('button', { name: 'Check price', exact: true }).click();
  await expectChecking();
  await expect(world).toHaveAttribute('data-check-status', 'complete');
  await expect(world).toHaveAttribute('data-outcome', 'held');
  await expect(preview).toContainText('Quiet hours are on.');
  await expect(preview).toContainText('07:00');

  await quiet.click();
  await expectIdle();
  await expect(preview).not.toContainText('Quiet hours are on.');
  await page.getByRole('button', { name: 'Check price', exact: true }).click();
  await expectChecking();
  await expect(preview).not.toContainText('Your price is here.');
  await expect(world).toHaveAttribute('data-check-status', 'complete');
  await expect(world).toHaveAttribute('data-outcome', 'released');
  await expect(preview).toContainText('Your price is here.');
  await expect(preview).toContainText('no real message is sent');
  await expect(current).toBeEnabled();
  await expect(target).toBeEnabled();
  await expect(quiet).toBeEnabled();

  await page.getByRole('button', { name: 'Check again', exact: true }).click();
  await expectChecking();
  await expect(world).toHaveAttribute('data-check-status', 'complete');
  await expect(world).toHaveAttribute('data-outcome', 'released');
  await expect(preview).toContainText('Your price is here.');
  await expect(page.getByRole('button', { name: 'Check again', exact: true })).toBeEnabled();
});

test('narrow reduced-motion price checks still progress and clear a changed price', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await loaded(page, '#trendyol');
  const world = page.locator('.signal-world');
  const preview = world.locator('.signal-world__outcome');
  const current = page.getByRole('slider', { name: 'Illustrative current price', exact: true });

  await expect(preview).toContainText('Waiting for your check.');
  await page.getByRole('button', { name: /Quiet hours/ }).click();
  await page.getByRole('button', { name: 'Check price', exact: true }).click();
  await expect(world).toHaveAttribute('data-check-status', 'checking');
  await expect(preview).not.toContainText('Your price is here.');
  await expect(world).toHaveAttribute('data-check-status', 'complete');
  await expect(world).toHaveAttribute('data-outcome', 'released');
  await expect(preview).toContainText('Your price is here.');

  await current.fill('1350');
  await expect(world).toHaveAttribute('data-check-status', 'idle');
  await expect(world).toHaveAttribute('data-outcome', 'idle');
  await expect(preview).toContainText('Waiting for your check.');
  await expect(preview).not.toContainText('Your price is here.');
  await page.getByRole('button', { name: 'Check price', exact: true }).click();
  await expect(world).toHaveAttribute('data-check-status', 'checking');
  await expect(world).toHaveAttribute('data-check-status', 'complete');
  await expect(world).toHaveAttribute('data-outcome', 'memory');
  await expect(preview).toContainText('Not at your target yet.');
  await expect(preview).toContainText('₺1,350');
  expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false);
});

test('Blaster stays compact on desktop and plays and pauses in place', async ({ page }) => {
  await loaded(page, '#blaster');
  const game = page.locator('.mini-blaster');
  await expect(game).toBeVisible();
  await expect(page.getByRole('button', { name: 'Expand game', exact: true })).toHaveCount(0);
  const arena = game.getByRole('group', { name: 'Mini Blaster play area' });
  const size = await arena.boundingBox();
  const viewport = page.viewportSize()!;
  if (viewport.width >= 960) expect(size!.width / viewport.width).toBeLessThan(0.6);
  else expect(size!.width / viewport.width).toBeGreaterThan(0.8);
  await game.getByRole('button', { name: 'Play 15 seconds', exact: true }).click();
  await expect(game).toHaveAttribute('data-phase', 'running');
  await game.getByRole('button', { name: 'Pause Mini Blaster' }).click();
  await expect(game).toHaveAttribute('data-phase', 'paused');
  await game.getByRole('button', { name: 'Resume Mini Blaster' }).click();
  await expect(game).toHaveAttribute('data-phase', 'running');
  await expect(arena).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(page.locator('.mini-blaster')).toHaveAttribute('data-phase', 'paused');
  await expect(page.locator('#journey')).not.toHaveAttribute('inert', '');
  await expect(page.locator('body')).not.toHaveCSS('overflow', 'hidden');
  expect((await arena.boundingBox())!.width).toBe(size!.width);
});

test('Blaster keeps a real completed run’s best score', async ({ page }) => {
  // Software-rendered CI can run the animation clock more slowly than wall time.
  test.setTimeout(90_000);
  await loaded(page, '#blaster');
  const game = page.locator('.mini-blaster');
  await game.getByRole('button', { name: 'Play 15 seconds', exact: true }).click();
  await expect(game).toHaveAttribute('data-phase', /complete|failed/, { timeout: 60_000 });
  const best = game.locator('.mini-blaster__metric--best strong');
  const value = Number(await best.innerText());
  expect(value).toBeGreaterThan(0);
  await page.reload();
  await expect(page.locator('.site-loader')).toHaveCount(0, { timeout: 20_000 });
  await expect(best).toHaveText(String(value).padStart(5, '0'));
});

test('new story stays usable with reduced motion and blocked storage', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.addInitScript(() => {
    Storage.prototype.setItem = () => { throw new DOMException('Blocked', 'SecurityError'); };
    Storage.prototype.getItem = () => { throw new DOMException('Blocked', 'SecurityError'); };
    Storage.prototype.removeItem = () => { throw new DOMException('Blocked', 'SecurityError'); };
  });
  await loaded(page, '#method');
  await expect(page.locator('.personal-intro__sticky')).not.toHaveCSS('position', 'sticky');
  await page.getByRole('tab', { name: /Be part of it/ }).click();
  await expect(page.getByRole('tabpanel', { name: /Be part of it/ })).toContainText('Good things happen');
  await page.getByRole('button', { name: 'Save chocolate cake' }).click();
  await expect(page.getByRole('button', { name: 'Chocolate cake saved' })).toBeVisible();
  await page.locator('#contact').scrollIntoViewIfNeeded();
  await expect(page.locator('#contact').getByRole('link', { name: 'Email Kamil Kerimov' })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false);
});
