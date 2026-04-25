import { expect, test } from '@playwright/test';

test.describe('Lazy runtime modules', () => {
  test('loads quality evidence module on the homepage', async ({ page }) => {
    await page.goto('/');

    await expect(page.locator('[data-quality-status]')).toContainText('Live snapshot loaded');
    await expect(page.locator('[data-quality-e2e-mobile]')).toContainText(/pass \/ 0 fail/);
  });

  test('loads command palette module on demand', async ({ page }) => {
    await page.goto('/');

    await page.locator('[data-command-open]').click();

    await expect(page.getByRole('dialog', { name: 'Command Palette' })).toBeVisible();
    await expect(page.getByRole('option', { name: /Go to Projects/ })).toBeVisible();
  });

  test('loads contact form module on the contact page', async ({ page }) => {
    await page.route('https://formsubmit.co/ajax/kamil16092006@gmail.com', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true }),
      });
    });

    await page.goto('/contact.html');

    await page.getByLabel('Name').fill('Test User');
    await page.getByLabel('Email').fill('test@example.com');
    await page.getByLabel('Message').fill('I want to discuss a portfolio test project.');
    await page.getByRole('button', { name: 'Send Brief' }).click();

    await expect(page.locator('[data-form-response]')).toContainText('sent successfully');
  });
});
