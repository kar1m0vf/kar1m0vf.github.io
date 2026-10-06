import { expect, test, type Page } from '@playwright/test';

test.use({ isMobile: true, hasTouch: true, viewport: { width: 390, height: 844 } });

async function ready(page: Page, hash = '') {
  await page.goto(`/${hash}`);
  await expect(page.locator('.site-loader')).toHaveCount(0, { timeout: 30_000 });
}

async function passageProgress(page: Page) {
  return page.evaluate(() => {
    const section = document.getElementById('connections')!;
    return -section.getBoundingClientRect().top / (section.offsetHeight - innerHeight);
  });
}

async function travel(page: Page, progress: number) {
  await page.evaluate(value => {
    const section = document.getElementById('connections')!;
    window.scrollTo({ top: section.getBoundingClientRect().top + scrollY + (section.offsetHeight - innerHeight) * value, behavior: 'instant' });
  }, progress);
}

test('rotation keeps the camera inside the passage and the canvas fills the viewport', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await ready(page, '#connections');
  const canvas = page.locator('.continuity-canvas canvas');
  await expect(canvas).toHaveAttribute('data-phase', 'connections');
  await travel(page, .55);
  await expect(canvas).toHaveAttribute('data-phase', 'through');
  await expect.poll(async () => Number(await canvas.getAttribute('data-camera-z'))).toBeLessThan(-20);
  await page.setViewportSize({ width: 844, height: 390 });
  await expect.poll(async () => Math.abs(await passageProgress(page) - .55)).toBeLessThan(.02);
  await expect(canvas).toHaveAttribute('data-phase', 'through');
  await expect.poll(async () => Number(await canvas.getAttribute('data-camera-z'))).toBeLessThan(-20);
  await expect(page.locator('.thread-passage__sticky')).toHaveCSS('position', 'sticky');
  expect(await canvas.evaluate(el => Math.abs(el.clientHeight - innerHeight))).toBeLessThan(2);
  await travel(page, .72);
  await expect(canvas).toHaveAttribute('data-phase', 'clearing');
  await travel(page, 0);
  await expect(canvas).toHaveAttribute('data-phase', 'connections');
  await page.setViewportSize({ width: 390, height: 844 });
  await expect.poll(async () => Math.abs(await passageProgress(page))).toBeLessThan(.02);
  await expect(canvas).toHaveAttribute('data-phase', 'connections');
  expect(await canvas.evaluate(el => Math.abs(el.clientHeight - innerHeight))).toBeLessThan(2);
  expect(errors).toEqual([]);
});

test('short landscape keeps hero actions, chapters and overlay controls usable', async ({ page }) => {
  await ready(page);
  await page.setViewportSize({ width: 667, height: 320 });
  const actions = page.locator('.hero__actions');
  const navigation = page.locator('.thread-story__navigation');
  await expect(page.getByRole('heading', { level: 1 })).toBeInViewport();
  const actionBounds = await actions.boundingBox();
  const navBounds = await navigation.boundingBox();
  expect(actionBounds!.y + actionBounds!.height).toBeLessThanOrEqual(navBounds!.y);
  for (const name of ['Explore my work', 'Start a conversation']) {
    const action = page.getByRole('link', { name, exact: true });
    await expect(action).toBeInViewport();
    expect((await action.boundingBox())!.height).toBeGreaterThanOrEqual(44);
  }
  const chapters = page.getByRole('navigation', { name: 'Introduction chapters' });
  await chapters.getByRole('button', { name: 'My perspective', exact: true }).click();
  await expect(page.getByRole('heading', { name: /More than one dimension/ })).toBeInViewport();
  await chapters.getByRole('button', { name: 'Selected work', exact: true }).click();
  await expect(page.getByRole('link', { name: 'Discover the work', exact: true })).toBeInViewport();
  await page.getByRole('button', { name: 'Open K Control', exact: true }).click();
  const control = page.locator('#k-control-dialog');
  const close = control.getByRole('button', { name: 'Close K Control', exact: true });
  await expect(close).toBeInViewport();
  await control.locator('.k-control__body').evaluate(el => { el.scrollTop = el.scrollHeight; });
  await expect(close).toBeInViewport();
  await close.click();
  await travel(page, 0);
  const skip = page.getByRole('link', { name: 'Next · Trendyol Price Tracker', exact: true });
  await expect(skip).toBeInViewport();
  const triggerBounds = await page.getByRole('button', { name: 'Open K Control', exact: true }).boundingBox();
  const skipBounds = await skip.boundingBox();
  expect(skipBounds!.x).toBeGreaterThan(triggerBounds!.x + triggerBounds!.width);
  await skip.click();
  await expect(page).toHaveURL(/#trendyol$/);
  await page.locator('#trendyol .project-build-trigger').click();
  await expect(page.locator('#trendyol-build-details').getByRole('button', { name: 'Close project details', exact: true })).toBeInViewport();
  await page.keyboard.press('Escape');
  await expect(page.locator('#trendyol-build-details')).toBeHidden();
  expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false);
});

test('changing browser toolbar height never exposes a cleared scene buffer', async ({ page }) => {
  await ready(page);
  await expect(page.locator('#top .thread-sculpture')).toHaveAttribute('data-renderer', 'ready');
  await page.evaluate(async () => {
    const audit = { outsideFrameResets: 0, missedDraws: [] as string[], resets: { hero: 0, middle: 0 } };
    Object.assign(window, { sceneBufferAudit: audit });
    let armed = false;
    let frameResets: Map<HTMLCanvasElement, boolean> | null = null;
    const sceneOf = (canvas: HTMLCanvasElement) => canvas.matches('.continuity-canvas canvas') ? 'middle'
      : canvas.matches('.thread-sculpture canvas') ? 'hero' : null;
    const originalRaf = window.requestAnimationFrame.bind(window);
    window.requestAnimationFrame = callback => originalRaf(time => {
      const previousFrame = frameResets;
      const currentFrame = new Map<HTMLCanvasElement, boolean>();
      frameResets = currentFrame;
      try { callback(time); }
      finally {
        for (const [canvas, drawn] of currentFrame) {
          if (!drawn) audit.missedDraws.push(`${sceneOf(canvas)} ${canvas.width}x${canvas.height}`);
        }
        frameResets = previousFrame;
      }
    });
    for (const dimension of ['width', 'height'] as const) {
      const descriptor = Object.getOwnPropertyDescriptor(HTMLCanvasElement.prototype, dimension)!;
      Object.defineProperty(HTMLCanvasElement.prototype, dimension, {
        ...descriptor,
        set(this: HTMLCanvasElement, value: number) {
          const scene = armed ? sceneOf(this) : null;
          if (scene) {
            audit.resets[scene] += 1;
            if (frameResets) frameResets.set(this, false);
            else audit.outsideFrameResets += 1;
          }
          descriptor.set!.call(this, value);
        },
      });
    }
    for (const method of ['drawArrays', 'drawElements'] as const) {
      const originalDraw = WebGL2RenderingContext.prototype[method];
      WebGL2RenderingContext.prototype[method] = function (this: WebGL2RenderingContext, ...args: unknown[]) {
        Reflect.apply(originalDraw, this, args);
        const canvas = this.canvas;
        if (armed && canvas instanceof HTMLCanvasElement && frameResets?.has(canvas)
          && this.getParameter(this.DRAW_FRAMEBUFFER_BINDING) === null) frameResets.set(canvas, true);
      };
    }
    // Existing scene loops may already have queued callbacks before the wrapper.
    await new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
    armed = true;
  });

  const hero = page.locator('#top .thread-sculpture canvas');
  for (const height of [832, 820, 808, 796, 784, 772, 760, 748, 760, 776]) {
    await page.setViewportSize({ width: 390, height });
  }
  await expect.poll(() => hero.evaluate(el => {
    const canvas = el as HTMLCanvasElement;
    return Math.abs(canvas.height - canvas.clientHeight * canvas.width / canvas.clientWidth);
  })).toBeLessThan(2);
  await expect(page.locator('#top .thread-sculpture')).toHaveAttribute('data-renderer', 'ready');
  await travel(page, .45);
  const middle = page.locator('.continuity-canvas canvas');
  await expect(middle).toHaveAttribute('data-phase', 'through');
  for (const height of [788, 800, 812, 824, 836, 844, 832, 820, 808, 796]) {
    await page.setViewportSize({ width: 390, height });
  }
  await expect.poll(() => middle.evaluate(el => {
    const canvas = el as HTMLCanvasElement;
    return Math.abs(canvas.height - canvas.clientHeight * canvas.width / canvas.clientWidth);
  })).toBeLessThan(2);
  await expect(page.locator('.continuous-story')).toHaveAttribute('data-renderer', 'ready');
  const audit = await page.evaluate(() => (window as Window & {
    sceneBufferAudit: { outsideFrameResets: number; missedDraws: string[]; resets: { hero: number; middle: number } };
  }).sceneBufferAudit);
  expect(audit.resets.hero).toBeGreaterThan(0);
  expect(audit.resets.middle).toBeGreaterThan(0);
  expect(audit.outsideFrameResets).toBe(0);
  expect(audit.missedDraws).toEqual([]);
});
