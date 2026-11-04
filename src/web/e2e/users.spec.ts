import { expect, test } from '@playwright/test';

test('an administrator invites someone and sees them listed as invited', async ({ page }) => {
  await page.goto('/users');
  await page.getByRole('button', { name: 'Invite someone' }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByRole('textbox', { name: 'Name' }).fill('Rui Costa');
  await dialog.getByRole('textbox', { name: 'Email' }).fill('rui@example.com');

  await dialog.getByRole('button', { name: 'Create invite' }).click();

  await expect(page.getByRole('dialog').getByText(/\/invite\//)).toBeVisible();
  await page.getByRole('dialog').getByRole('button', { name: 'Done' }).click();
  const row = page.getByRole('row').filter({ hasText: 'rui@example.com' });
  await expect(row).toContainText('Rui Costa');
  await expect(row).toContainText('Invited, link expires');
});

test('the invite link opens the page to join', async ({ page, browser }) => {
  await page.goto('/users');
  await page.getByRole('button', { name: 'Invite someone' }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByRole('textbox', { name: 'Name' }).fill('Inês Rocha');
  await dialog.getByRole('textbox', { name: 'Email' }).fill('ines@example.com');
  await dialog.getByRole('button', { name: 'Create invite' }).click();
  const link =
    (await page
      .getByRole('dialog')
      .getByText(/\/invite\//)
      .textContent()) ?? '';

  const visitor = await browser.newContext({
    ignoreHTTPSErrors: true,
    storageState: { cookies: [], origins: [] },
  });
  const invited = await visitor.newPage();
  await invited.goto(new URL(link.trim()).pathname);

  await expect(invited.getByText('Set up your account, Inês Rocha.')).toBeVisible();
  await visitor.close();
});
