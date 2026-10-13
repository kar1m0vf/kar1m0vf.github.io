import { expect, test, type Locator, type Page } from '@playwright/test';
import sharp from 'sharp';

test.use({ isMobile: true, hasTouch: true, reducedMotion: 'reduce', viewport: { width: 375, height: 844 } });

async function cableBounds(page: Page, canvas: Locator) {
  const bounds = (await canvas.boundingBox())!;
  const viewport = page.viewportSize()!;
  const left = Math.max(0, bounds.x), top = Math.max(0, bounds.y);
  const right = Math.min(viewport.width, bounds.x + bounds.width);
  const bottom = Math.min(viewport.height, bounds.y + bounds.height);
  expect(right - left, 'the entire canvas width is visible').toBeGreaterThan(bounds.width - 1);
  expect(bottom - top, 'the canvas has a visible stage').toBeGreaterThan(0);
  // An element screenshot scrolls a tall canvas in a short landscape viewport.
  // Capture its visible viewport area without changing the selected footer pose.
  const screenshot = await page.screenshot({
    animations: 'disabled', scale: 'css',
    clip: { x: left, y: top, width: right - left, height: bottom - top },
  });
  const { data, info } = await sharp(screenshot).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const mask = new Uint8Array(info.width * info.height);
  for (let pixel = 0; pixel < mask.length; pixel += 1) {
    const offset = pixel * info.channels;
    const red = data[offset]!, green = data[offset + 1]!, blue = data[offset + 2]!;
    mask[pixel] = Number(blue >= 125 && green >= 55 && blue - red >= 35 && blue - green >= 10);
  }

  // Keep the largest connected blue shape so stars, bloom and nearby text
  // cannot make an off-center cable look centered.
  const queue = new Int32Array(mask.length);
  let largest = { pixels: 0, left: 0, right: 0 };
  for (let start = 0; start < mask.length; start += 1) {
    if (!mask[start]) continue;
    let head = 0, tail = 1, left = info.width, right = 0;
    queue[0] = start;
    mask[start] = 0;
    const enqueue = (pixel: number) => {
      if (!mask[pixel]) return;
      mask[pixel] = 0;
      queue[tail++] = pixel;
    };
    while (head < tail) {
      const pixel = queue[head++]!, x = pixel % info.width;
      left = Math.min(left, x);
      right = Math.max(right, x);
      if (x > 0) enqueue(pixel - 1);
      if (x < info.width - 1) enqueue(pixel + 1);
      if (pixel >= info.width) enqueue(pixel - info.width);
      if (pixel < mask.length - info.width) enqueue(pixel + info.width);
    }
    if (tail > largest.pixels) largest = { pixels: tail, left, right };
  }
  return { ...largest, width: info.width, center: (largest.left + largest.right) / (2 * info.width) };
}

test('farewell cable stays centered on phones and after a short landscape resize', async ({ page }) => {
  test.setTimeout(60_000);
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/#contact');
  await expect(page.locator('.site-loader')).toHaveCount(0, { timeout: 30_000 });
  expect(await page.evaluate(() => matchMedia('(prefers-reduced-motion: reduce)').matches)).toBe(true);
  const sculpture = page.locator('#contact .thread-sculpture');
  const canvas = sculpture.locator('canvas');
  await expect(sculpture).toHaveAttribute('data-renderer', 'ready', { timeout: 30_000 });

  // 390px and 430px are wider than the footer's 24rem canvas height, while
  // still using the same centered phone composition as the 375px viewport.
  for (const viewport of [
    { width: 375, height: 844 },
    { width: 390, height: 844 },
    { width: 430, height: 932 },
    { width: 667, height: 320 },
    { width: 390, height: 844 },
  ]) {
    await page.setViewportSize(viewport);
    await page.evaluate(async () => {
      // Let viewport restoration finish before selecting the same footer pose.
      for (let frame = 0; frame < 3; frame += 1) {
        await new Promise<void>(resolve => requestAnimationFrame(() => resolve()));
      }
      const footer = document.getElementById('contact')!;
      window.scrollTo({ top: footer.getBoundingClientRect().top + scrollY, behavior: 'instant' });
    });
    await expect.poll(() => page.locator('#contact').evaluate(element => Math.abs(element.getBoundingClientRect().top))).toBeLessThan(1);
    await expect(canvas).toHaveAttribute('data-phase', 'knot');
    await expect.poll(() => canvas.evaluate(element => {
      const rendered = element as HTMLCanvasElement;
      return Math.abs(rendered.width / rendered.height - rendered.clientWidth / rendered.clientHeight);
    })).toBeLessThan(.01);
    const cable = await cableBounds(page, canvas);
    expect(cable.pixels, `visible cable at ${viewport.width}px`).toBeGreaterThan(300);
    expect(cable.right - cable.left, `cable, rather than a star, at ${viewport.width}px`).toBeGreaterThan(cable.width * .15);
    expect(Math.abs(cable.center - .5), `cable center at ${viewport.width}x${viewport.height}`).toBeLessThan(.1);
    expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false);
  }
  await expect(page.getByRole('link', { name: 'Email Kamil Kerimov' })).toHaveAttribute('href', 'mailto:hello@kamilkerimov.com');
  expect(errors).toEqual([]);
});
