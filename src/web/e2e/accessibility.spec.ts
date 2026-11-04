import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

const pages = [
  '/',
  '/routes',
  '/routes/new',
  '/projects',
  '/certificates',
  '/streams',
  '/redirects',
  '/visitor-pages',
  '/users',
  '/single-sign-on',
  '/backups',
  '/root-key',
  '/replicas',
  '/agents',
  '/audit',
  '/account',
  '/account/security',
  '/account/sessions',
];

const schemes = ['light', 'dark'] as const;

for (const colorScheme of schemes) {
  test.describe(`in the ${colorScheme} theme`, () => {
    test.use({ colorScheme });

    for (const path of pages) {
      test(`${path} has no accessibility violations`, async ({ page }) => {
        await page.goto(path);
        await expect(page.getByRole('heading', { level: 1 })).toBeVisible();

        const results = await new AxeBuilder({ page })
          .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
          .analyze();

        expect(
          results.violations.map((v) => ({
            id: v.id,
            nodes: v.nodes.map((n) => n.target.join(' ') + ' :: ' + n.html),
          })),
        ).toEqual([]);
      });
    }
  });
}

test.describe('signed out', () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test('the sign-in page has no accessibility violations', async ({ page }) => {
    await page.goto('/sign-in');
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();

    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
      .analyze();

    expect(
      results.violations.map((v) => ({
        id: v.id,
        nodes: v.nodes.map((n) => n.target.join(' ') + ' :: ' + n.html),
      })),
    ).toEqual([]);
  });
});
