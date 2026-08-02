import { expect, test } from '@playwright/test';

test('navigates between all foundation pages', async ({ page }) => {
  await page.goto('/');
  await expect(
    page.getByRole('heading', { name: 'How are you?' }),
  ).toBeVisible();

  for (const destination of [
    ['Log', 'Your entries'],
    ['Calendar', 'Your month at a glance'],
    ['Stats', 'Understand your patterns'],
    ['More', 'Tools and preferences'],
  ] as const) {
    await page.getByRole('link', { name: destination[0], exact: true }).click();
    await expect(
      page.getByRole('heading', { name: destination[1] }),
    ).toBeVisible();
  }
});

test('persists a dark theme selection', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Dark theme' }).click();
  await expect(page.locator('html')).toHaveClass(/dark/);

  await page.reload();
  await expect(page.locator('html')).toHaveClass(/dark/);
});

test('reloads a deep route from the cached shell while offline', async ({
  context,
  page,
}) => {
  await page.goto('/calendar');
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  await page.reload();

  await context.setOffline(true);
  await page.reload();

  await expect(
    page.getByRole('heading', { name: 'Your month at a glance' }),
  ).toBeVisible();
});
