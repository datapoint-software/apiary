import { expect, test } from '@playwright/test';
import { selfSigned } from './support/certificate';

test('an administrator uploads a certificate and finds it in the list', async ({ page }) => {
  const { certificatePem, keyPem } = selfSigned('upload.example.test');
  await page.goto('/certificates');
  await page.getByRole('button', { name: 'Upload certificate' }).first().click();
  const dialog = page.getByRole('dialog');
  await dialog.getByRole('textbox', { name: 'Certificate and chain' }).fill(certificatePem);
  await dialog.getByRole('textbox', { name: 'Private key' }).fill(keyPem);

  await dialog.getByRole('button', { name: 'Continue' }).click();
  await expect(dialog.getByText('Check that this is the certificate you expect.')).toBeVisible();
  await dialog.getByRole('button', { name: 'Add certificate' }).click();

  await expect(page.getByRole('status').getByText('Certificate added')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'upload.example.test', level: 1 })).toBeVisible();
  await page
    .getByRole('navigation', { name: 'Breadcrumb' })
    .getByRole('link', { name: 'Certificates' })
    .click();
  await expect(page.getByRole('link', { name: 'upload.example.test' }).first()).toBeVisible();
});

test('a private key that doesn’t match the certificate is refused', async ({ page }) => {
  const { certificatePem } = selfSigned('mismatch.example.test');
  const { keyPem } = selfSigned('other.example.test');
  await page.goto('/certificates');
  await page.getByRole('button', { name: 'Upload certificate' }).first().click();
  const dialog = page.getByRole('dialog');
  await dialog.getByRole('textbox', { name: 'Certificate and chain' }).fill(certificatePem);
  await dialog.getByRole('textbox', { name: 'Private key' }).fill(keyPem);

  await dialog.getByRole('button', { name: 'Continue' }).click();

  await expect(dialog.getByRole('textbox', { name: 'Private key' })).toHaveAttribute(
    'aria-invalid',
    'true',
  );
  await expect(dialog.getByRole('button', { name: 'Add certificate' })).toBeHidden();
});
