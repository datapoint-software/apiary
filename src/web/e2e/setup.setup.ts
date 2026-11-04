import { expect, test as setup } from '@playwright/test';
import { admin, adminState, saveSecret } from './support/admin';
import { totp } from './support/totp';

interface Enrollment {
  readonly secret: string;
}

setup('the first visitor creates the first administrator', async ({ page }) => {
  await page.goto('/setup');
  await page.getByRole('textbox', { name: 'Your name' }).fill(admin.name);
  await page.getByRole('textbox', { name: 'Email' }).fill(admin.email);
  await page.getByRole('textbox', { name: 'Password', exact: true }).fill(admin.password);
  await page.getByRole('textbox', { name: 'Password again' }).fill(admin.password);
  const enrollment = page.waitForResponse('**/api/setup/begin');
  await page.getByRole('button', { name: 'Continue' }).click();
  const { secret } = (await (await enrollment).json()) as Enrollment;
  saveSecret(secret);

  await page.getByRole('textbox', { name: 'Code from the app' }).fill(totp(secret));
  await page.getByRole('button', { name: 'Create administrator' }).click();
  await page.getByRole('button', { name: 'I saved them' }).click();

  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  await expect(page).toHaveURL('/');
  await page.context().storageState({ path: adminState });
});
