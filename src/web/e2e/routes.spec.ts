import { expect, test } from '@playwright/test';

test('an administrator adds a route and finds it in the list', async ({ page }) => {
  await page.goto('/routes/new');
  await page.getByRole('textbox', { name: 'Hostname' }).fill('shop.example.com');
  await page.getByRole('textbox', { name: 'Service or host' }).fill('shop-web');
  await page.getByRole('spinbutton', { name: 'Port' }).fill('8080');

  await page.getByRole('button', { name: 'Create route' }).click();

  await expect(page).toHaveURL('/routes');
  await expect(page.getByRole('status').getByText('shop.example.com saved')).toBeVisible();
  await expect(page.getByRole('link', { name: 'shop.example.com' })).toBeVisible();
});

test('a route with one problem isn’t saved and moves focus to it', async ({ page }) => {
  await page.goto('/routes/new');
  await page.getByRole('textbox', { name: 'Service or host' }).fill('shop-web');
  const hostname = page.getByRole('textbox', { name: 'Hostname' });

  await page.getByRole('button', { name: 'Create route' }).click();

  await expect(page).toHaveURL('/routes/new');
  await expect(hostname).toBeFocused();
  await expect(hostname).toHaveAttribute('aria-invalid', 'true');
});

test('a route with several problems lists them in a summary', async ({ page }) => {
  await page.goto('/routes/new');

  await page.getByRole('button', { name: 'Create route' }).click();

  await expect(page.getByRole('alert')).toContainText('Hostname');
  await expect(page.getByRole('alert')).toBeFocused();
});

test('filtering the list hides routes that don’t match', async ({ page }) => {
  await page.goto('/routes');

  await page
    .getByRole('searchbox', { name: 'Filter by hostname or target' })
    .fill('nothing-like-this');

  await expect(page.getByText('No routes match')).toBeVisible();
});
