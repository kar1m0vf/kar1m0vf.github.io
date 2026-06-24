import { expect, test } from '@playwright/test';

test.describe('About page', () => {
  test('renders redesigned profile sections', async ({ page }) => {
    await page.goto('/about.html');

    await expect(page.getByRole('heading', { name: /About Kamil Kerimov/i })).toBeVisible();
    await expect(page.getByText('Project Fit')).toBeVisible();
    await expect(page.getByText('What you actually get')).toBeVisible();
    await expect(page.getByRole('heading', { name: /The kinds of work I naturally reach for/i })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Bots that feel like real product surfaces' })).toBeVisible();
    await expect(page.getByRole('heading', { name: /My process is simple/i })).toBeVisible();
    await expect(page.getByText('If a product only looks convincing in screenshots')).toBeVisible();
  });
});
