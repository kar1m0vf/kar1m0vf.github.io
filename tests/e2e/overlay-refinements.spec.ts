import { expect, test, type Locator, type Page } from '@playwright/test';

const ready = async (page: Page, hash: string) => {
  await page.goto(`/${hash}`);
  await expect(page.locator('.site-loader')).toHaveCount(0, { timeout: 30_000 });
};

test('selected K Control ink remains attached to the animated wave across the row', async ({ page }) => {
  test.setTimeout(60_000);
  await page.setViewportSize({ width: 390, height: 740 });
  await ready(page, '#nar');
  await page.getByRole('button', { name: 'Open K Control', exact: true }).click();
  const dialog = page.locator('#k-control-dialog');
  const spine = dialog.locator('.k-control__spine');
  const wave = spine.locator('.k-control__wave');
  await expect(spine).toHaveAttribute('data-ready', 'true');
  await dialog.evaluate(async el => { await Promise.all(el.getAnimations().map(animation => animation.finished)); });
  const geometry = () => spine.evaluate(element => {
    const svg = element as SVGSVGElement;
    const wave = svg.querySelector<SVGPathElement>('.k-control__wave')!;
    const selection = svg.querySelector<SVGPathElement>('.k-control__selection')!;
    const edge = svg.querySelector<SVGPathElement>('.k-control__selection-edge')!;
    const row = svg.parentElement!.querySelector<HTMLElement>('[aria-current="location"]')!;
    const pointAtY = (y: number) => {
      let low = 0, high = wave.getTotalLength();
      for (let i = 0; i < 35; i++) {
        const middle = (low + high) / 2;
        if (wave.getPointAtLength(middle).y < y) low = middle;
        else high = middle;
      }
      return wave.getPointAtLength((low + high) / 2);
    };
    const contacts = [.05, .25, .5, .75, .95].map(fraction => {
      const point = pointAtY(row.offsetTop + row.offsetHeight * fraction);
      return { left: selection.isPointInFill({ x: point.x - .6, y: point.y }), right: selection.isPointInFill({ x: point.x + .6, y: point.y }) };
    });
    const end = pointAtY(row.offsetTop + row.offsetHeight), underline = edge.getPointAtLength(0);
    const box = selection.getBBox();
    const screen = svg.getBoundingClientRect(), body = svg.closest('.k-control__body')!.getBoundingClientRect();
    return { contacts, underlineGap: Math.hypot(end.x - underline.x, end.y - underline.y), rightGap: Math.abs(screen.left + box.x + box.width - body.right) };
  });
  for (const width of [390, 320, 1024]) {
    await page.setViewportSize({ width, height: 740 });
    for (let frame = 0; frame < 3; frame++) {
      const previous = await wave.getAttribute('d');
      await expect.poll(() => wave.getAttribute('d')).not.toBe(previous);
      const result = await geometry();
      expect(result.contacts.every(contact => !contact.left && contact.right)).toBe(true);
      expect(result.underlineGap).toBeLessThan(.1);
      expect(result.rightGap).toBeLessThan(1);
    }
  }
  await page.keyboard.press('Escape');
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.getByRole('button', { name: 'Open K Control', exact: true }).click();
  await expect(spine).toHaveAttribute('data-ready', 'true');
  const result = await geometry();
  expect(result.contacts.every(contact => !contact.left && contact.right)).toBe(true);
  await page.keyboard.press('Escape');
});

const expectHorizontalProcessFits = async (process: Locator) => {
  const geometry = await process.evaluate((list) => {
    const bounds = list.getBoundingClientRect();
    const rows = Array.from(list.children).map((child) => {
      const numberRange = document.createRange();
      numberRange.selectNodeContents(child.querySelector('.project-process__number')!);
      const number = numberRange.getBoundingClientRect();
      const label = child.querySelector('strong')!.getBoundingClientRect();
      const connector = child.querySelector('.project-process__connector')?.getBoundingClientRect();
      const arrow = child.querySelector('.project-process__arrow')?.getBoundingClientRect();
      const item = child.getBoundingClientRect();
      return {
        number: { left: number.left, right: number.right, top: number.top, bottom: number.bottom },
        label: { left: label.left, right: label.right, top: label.top, bottom: label.bottom },
        connector: connector ? { left: connector.left, right: connector.right, y: connector.y } : null,
        arrow: arrow ? { left: arrow.left, right: arrow.right, y: arrow.y, height: arrow.height } : null,
        item: { left: item.left, right: item.right },
      };
    });
    const body = list.closest('.project-build__body')!;
    return { left: bounds.left, right: bounds.right, overflow: body.scrollWidth - body.clientWidth, rows };
  });
  expect(geometry.overflow).toBeLessThanOrEqual(1);
  for (const [index, row] of geometry.rows.entries()) {
    expect(row.item.left).toBeGreaterThanOrEqual(geometry.left - 1);
    expect(row.item.right).toBeLessThanOrEqual(geometry.right + 1);
    expect(row.label.top - row.number.bottom).toBeGreaterThanOrEqual(4);
    expect(row.label.right).toBeLessThanOrEqual(row.item.right + 1);
    const next = geometry.rows[index + 1];
    if (!next) continue;
    expect(row.connector).not.toBeNull();
    expect(row.arrow).not.toBeNull();
    expect(row.connector!.left).toBeGreaterThan(row.number.right + 1);
    expect(row.arrow!.right).toBeLessThan(next.number.left - 1);
    expect(Math.abs(row.connector!.y - (row.number.top + row.number.bottom) / 2)).toBeLessThan(2);
    expect(Math.abs(row.arrow!.y + row.arrow!.height / 2 - row.connector!.y)).toBeLessThan(2);
  }
};

test('project process runs once, survives resizing and restarts only when reopened', async ({ page }) => {
  test.setTimeout(60_000);
  await page.setViewportSize({ width: 320, height: 740 });
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await ready(page, '#blaster');
  const opener = page.locator('#blaster .project-build-trigger');
  const dialog = page.locator('#blaster-build-details');
  await opener.click();
  const process = dialog.getByRole('list', { name: 'Blaster loop', exact: true });
  await expect(process).toHaveAttribute('data-active-step', '01');
  await expect(process).toHaveAttribute('data-motion', 'running');
  await expect(process.locator('li[data-state="active"]')).toHaveCount(1);
  const connector = process.locator('li').first().locator('.project-process__fill');
  const animationTime = () => connector.evaluate(el => Number(el.getAnimations().find(animation => (animation as CSSAnimation).animationName === 'project-process-travel')?.currentTime ?? 0));
  await expect.poll(animationTime).toBeGreaterThan(250);
  const beforeResize = await animationTime();
  await page.setViewportSize({ width: 1024, height: 740 });
  expect(await animationTime()).toBeGreaterThanOrEqual(beforeResize - 25);
  await page.setViewportSize({ width: 320, height: 740 });
  for (const step of ['02', '03', '04', '05']) {
    await expect(process).toHaveAttribute('data-active-step', step);
    await expect(process.locator('li[data-state="complete"]')).toHaveCount(Number(step) - 1);
  }
  await expect(process).toHaveAttribute('data-motion', 'complete');
  await expect(process.locator('li[data-state="complete"]')).toHaveCount(5);
  // Stay past the old loop delay: a completed process must not return to 01.
  await page.waitForTimeout(3000);
  await expect(process).toHaveAttribute('data-active-step', '05');
  await expect(process).toHaveAttribute('data-motion', 'complete');
  const body = dialog.locator('.project-build__body');
  await body.evaluate(el => { el.scrollTop = el.scrollHeight; });
  await body.evaluate(el => { el.scrollTop = 0; });
  await expect(process).toHaveAttribute('data-motion', 'complete');
  await expectHorizontalProcessFits(process);
  await page.setViewportSize({ width: 390, height: 844 });
  await expectHorizontalProcessFits(process);
  expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false);
  await page.keyboard.press('Escape');
  await expect(dialog).toBeHidden();
  await expect(opener).toBeFocused();
  await opener.click();
  await expect(process).toHaveAttribute('data-active-step', '01');
  await expect(process.locator('li[data-state="active"] > strong')).toHaveText('Choose');
});

test('reduced-motion process presents all stages without an animated handoff', async ({ page }) => {
  test.setTimeout(45_000);
  await page.setViewportSize({ width: 320, height: 740 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await ready(page, '#nar');
  await page.locator('#nar .project-build-trigger').click();
  const process = page.locator('#nar-build-details .project-process');
  await expect(process).toHaveAttribute('data-active-step', 'all');
  await expect(process).toHaveAttribute('data-motion', 'static');
  await expect(process.locator('li[data-state="complete"]')).toHaveCount(5);
  await expect(process.locator('li[data-state="active"]')).toHaveCount(0);
  expect(await process.locator('.project-process__fill').evaluateAll((fills) => fills.every((fill) => getComputedStyle(fill).animationName === 'none'))).toBe(true);
  await expectHorizontalProcessFits(process);
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await expect(process).toHaveAttribute('data-motion', /^(static|complete)$/);
  await expect(process.locator('li[data-state="complete"]')).toHaveCount(5);
  await expect(process.locator('li[data-state="active"]')).toHaveCount(0);
  expect(await process.evaluate(el => el.getAnimations({ subtree: true }).filter(animation => animation.playState === 'running').length)).toBe(0);
});

const exerciseScrollbar = async ({ page, dialog, viewport, scrollbarName, headerSelector, closeName, opener }: {
  page: Page;
  dialog: Locator;
  viewport: Locator;
  scrollbarName: string;
  headerSelector: string;
  closeName: string;
  opener: Locator;
}) => {
  const scrollbar = dialog.getByRole('scrollbar', { name: scrollbarName, exact: true });
  const rail = dialog.locator('.overlay-scroll-area__rail');
  const header = dialog.locator(headerSelector);
  const close = dialog.getByRole('button', { name: closeName, exact: true });
  await expect(scrollbar).toBeVisible();
  // Wait only for the overlay's entrance, not the process's repeating animations.
  await dialog.evaluate(async (element) => {
    await Promise.all(element.getAnimations({ subtree: true })
      .filter((animation) => Number.isFinite(animation.effect?.getComputedTiming().iterations))
      .filter((animation) => /(?:enter|backdrop-in)$/.test((animation as CSSAnimation).animationName ?? ''))
      .map((animation) => animation.finished));
  });
  const initialHeader = (await header.boundingBox())!;
  const initialClose = (await close.boundingBox())!;
  expect(initialHeader).not.toBeNull();
  expect(initialClose).not.toBeNull();
  expect((await scrollbar.boundingBox())!.width).toBeGreaterThanOrEqual(24);
  expect(await viewport.evaluate((element) => element.scrollHeight - element.clientHeight)).toBeGreaterThan(0);

  await scrollbar.focus();
  await scrollbar.press('End');
  await expect(scrollbar).toHaveAttribute('aria-valuenow', '100');
  await expect.poll(() => viewport.evaluate((element) => Math.abs(element.scrollTop - (element.scrollHeight - element.clientHeight)))).toBeLessThanOrEqual(2);
  await scrollbar.press('Home');
  await expect(scrollbar).toHaveAttribute('aria-valuenow', '0');
  await expect.poll(() => viewport.evaluate((element) => element.scrollTop)).toBeLessThanOrEqual(1);

  const thumbBounds = (await scrollbar.boundingBox())!;
  const railBounds = (await rail.boundingBox())!;
  const dragX = thumbBounds.x + thumbBounds.width - 2;
  const dragY = thumbBounds.y + thumbBounds.height / 2;
  await page.mouse.move(dragX, dragY);
  await page.mouse.down();
  await page.mouse.move(dragX, dragY + (railBounds.height - thumbBounds.height) * .6, { steps: 8 });
  await page.mouse.up();
  await expect.poll(async () => Number(await scrollbar.getAttribute('aria-valuenow'))).toBeGreaterThan(40);
  await expect.poll(async () => Number(await scrollbar.getAttribute('aria-valuenow'))).toBeLessThan(80);
  await expect(scrollbar).toBeFocused();

  await scrollbar.press('Home');
  await expect(scrollbar).toHaveAttribute('aria-valuenow', '0');
  await viewport.hover();
  await page.mouse.wheel(0, 180);
  await expect.poll(() => viewport.evaluate((element) => element.scrollTop)).toBeGreaterThan(10);
  await expect.poll(async () => {
    const progress = await viewport.evaluate((element) => element.scrollTop / (element.scrollHeight - element.clientHeight) * 100);
    return Math.abs(Number(await scrollbar.getAttribute('aria-valuenow')) - progress);
  }).toBeLessThanOrEqual(1);

  await viewport.focus();
  await viewport.press('End');
  await expect(scrollbar).toHaveAttribute('aria-valuenow', '100');
  await viewport.press('Home');
  await expect(scrollbar).toHaveAttribute('aria-valuenow', '0');
  const currentHeader = (await header.boundingBox())!;
  const currentClose = (await close.boundingBox())!;
  expect(Math.abs(currentHeader.y - initialHeader.y)).toBeLessThan(1);
  expect(Math.abs(currentClose.y - initialClose.y)).toBeLessThan(1);
  await expect(close).toBeInViewport();
  expect(await viewport.evaluate((element) => element.scrollWidth > element.clientWidth)).toBe(false);
  await page.keyboard.press('Escape');
  await expect(dialog).toBeHidden();
  await expect(opener).toBeFocused();
};

test('K Control custom rail follows keyboard, dragging and native wheel scrolling', async ({ page }) => {
  test.setTimeout(60_000);
  await page.setViewportSize({ width: 360, height: 640 });
  await ready(page, '#nar');
  const opener = page.getByRole('button', { name: 'Open K Control', exact: true });
  const dialog = page.getByRole('dialog', { name: 'K Control', exact: true });
  await opener.click();
  await exerciseScrollbar({
    page, dialog, opener,
    viewport: dialog.locator('.k-control__body'),
    scrollbarName: 'Scroll K Control',
    headerSelector: '.k-control__header',
    closeName: 'Close K Control',
  });
});

test('project custom rail stays synchronized without moving its header', async ({ page }) => {
  test.setTimeout(60_000);
  await page.setViewportSize({ width: 360, height: 640 });
  await ready(page, '#blaster');
  const opener = page.locator('#blaster .project-build-trigger');
  const dialog = page.locator('#blaster-build-details');
  await opener.click();
  await exerciseScrollbar({
    page, dialog, opener,
    viewport: dialog.locator('.project-build__body'),
    scrollbarName: 'Scroll Blaster story',
    headerSelector: '.project-build__header',
    closeName: 'Close project details',
  });
});
