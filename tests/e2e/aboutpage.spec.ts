import { expect, test } from '@playwright/test';

test.describe('About page', () => {
  test('renders redesigned profile sections', async ({ page }) => {
    await page.goto('/about.html');

    await expect(page.getByRole('heading', { name: /I build product systems that stay useful/i })).toBeVisible();
    await expect(page.getByText('Profile Snapshot')).toBeVisible();
    await expect(page.getByRole('heading', { name: /What I usually build and where I am strongest/i })).toBeVisible();
    await expect(page.getByText('Localization-ready')).toBeVisible();
    await expect(page.getByText('Useful software should survive ordinary weekdays')).toBeVisible();
  });
});
