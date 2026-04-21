import { expect, test } from '@playwright/test';

test.describe('About page', () => {
  test('renders redesigned profile sections', async ({ page }) => {
    await page.goto('/about.html');

    await expect(page.getByRole('heading', { name: /About Kamil Kerimov/i })).toBeVisible();
    await expect(page.getByText('Project Fit')).toBeVisible();
    await expect(page.getByRole('heading', { name: /This site is also part of the proof/i })).toBeVisible();
    await expect(page.getByText('What you actually get')).toBeVisible();
    await expect(page.getByLabel('Portfolio engineering signals').getByText('Repo hygiene')).toBeVisible();
    await expect(page.getByText('If a product only looks convincing in screenshots')).toBeVisible();
  });
});
