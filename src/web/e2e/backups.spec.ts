import { expect, test } from '@playwright/test';
import { admin, adminState, freshCode } from './support/admin';

test('an administrator downloads a backup and restores it', async ({ page }, testInfo) => {
  await page.goto('/backups');
  const downloading = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Back up now' }).click();
  const download = await downloading;
  const file = testInfo.outputPath(download.suggestedFilename());
  await download.saveAs(file);
  expect(download.suggestedFilename()).toMatch(/\.backup$/);
  await expect(page.getByRole('status').getByText('Backup taken')).toBeVisible();

  await page.locator('#backup-file').setInputFiles(file);
  const confirm = page.getByRole('alertdialog');
  await confirm.getByRole('textbox', { name: /To confirm, type/ }).fill('restore');
  await confirm.getByRole('button', { name: 'Restore backup' }).click();

  await expect(page).toHaveURL(/\/sign-in/);
  await expect(page.getByRole('status').getByText('Backup restored')).toBeVisible();

  await page.getByRole('textbox', { name: 'Email' }).fill(admin.email);
  await page.getByRole('textbox', { name: 'Password' }).fill(admin.password);
  await page.getByRole('button', { name: 'Sign in' }).click();
  await page.getByRole('textbox', { name: /code/i }).fill(await freshCode());
  await page.getByRole('button', { name: /continue|sign in|verify/i }).click();
  await expect(page).toHaveURL('/');
  await page.context().storageState({ path: adminState });
});
