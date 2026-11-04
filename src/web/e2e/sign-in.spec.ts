import { expect, test } from '@playwright/test';
import { admin, freshCode } from './support/admin';

test.use({ storageState: { cookies: [], origins: [] } });

test('a signed-out visitor is sent to sign in', async ({ page }) => {
  await page.goto('/routes');

  await expect(page).toHaveURL(/\/sign-in/);
});

test('a wrong password is refused', async ({ page }) => {
  await page.goto('/sign-in');
  await page.getByRole('textbox', { name: 'Email' }).fill(admin.email);
  await page.getByRole('textbox', { name: 'Password' }).fill('not the password at all');

  await page.getByRole('button', { name: 'Sign in' }).click();

  await expect(page.getByRole('alert')).toBeVisible();
  await expect(page).toHaveURL(/\/sign-in/);
});

test('an administrator signs in with their password and a code', async ({ page }) => {
  await page.goto('/sign-in');
  await page.getByRole('textbox', { name: 'Email' }).fill(admin.email);
  await page.getByRole('textbox', { name: 'Password' }).fill(admin.password);
  await page.getByRole('button', { name: 'Sign in' }).click();

  await page.getByRole('textbox', { name: /code/i }).fill(await freshCode());
  await page.getByRole('button', { name: /continue|sign in|verify/i }).click();

  await expect(page).toHaveURL('/');
});
