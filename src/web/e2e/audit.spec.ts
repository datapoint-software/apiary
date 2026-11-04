import { expect, test } from '@playwright/test';

test('changing a setting shows in the audit log', async ({ page }) => {
  await page.goto('/users');
  const idle = page.getByRole('spinbutton', { name: 'Sign out after' });
  await idle.fill('45');
  await page.getByRole('form').filter({ has: idle }).getByRole('button', { name: 'Save' }).click();
  await expect(
    page.getByRole('status').getByText('People are signed out after 45 minutes without activity.'),
  ).toBeVisible();

  await page.goto('/audit');

  await expect(
    page.getByText('changed when people are signed out for inactivity').first(),
  ).toBeVisible();
  await expect(page.getByText('users.update-session-policy').first()).toBeVisible();
});
