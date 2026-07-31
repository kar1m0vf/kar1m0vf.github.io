import { expect, test } from '@playwright/test';

const redirects = [
  { from: '/about.html', to: '#journey' },
  { from: '/projects.html', to: '#work' },
  { from: '/contact.html', to: '#contact' },
] as const;

for (const redirect of redirects) {
  test(`${redirect.from} redirects to ${redirect.to}`, async ({ page }) => {
    await page.goto(redirect.from);
    await expect(page).toHaveURL(new RegExp(`${redirect.to}$`));
    await expect(page.locator(redirect.to)).toBeAttached();
  });
}
