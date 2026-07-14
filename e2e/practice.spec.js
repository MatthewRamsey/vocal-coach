const { test, expect } = require('@playwright/test');

test('learner completes a trustworthy demo attempt', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: /Find the center/ })).toBeVisible();
  await expect(page.getByText('C4', { exact: true }).first()).toBeVisible();
  await page.getByRole('button', { name: 'Try demo' }).click();
  await expect(page.getByText('DEMO SIGNAL')).toBeVisible();
  await expect(page.getByText('Centered')).toBeVisible({ timeout: 3000 });
  await page.waitForTimeout(700);
  await page.getByRole('button', { name: 'Finish attempt' }).click();
  await expect(page.getByRole('region', { name: 'Attempt results' })).toBeVisible();
  await expect(page.getByText('median error')).toBeVisible();
});

test('learner can hear and move through target notes', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Practice D4' }).click();
  await expect(page.getByText('D4', { exact: true }).first()).toBeVisible();
  await page.getByRole('button', { name: 'Next note' }).click();
  await expect(page.getByText('E4', { exact: true }).first()).toBeVisible();
});

test('layout remains usable on a phone', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await expect(page.getByRole('button', { name: 'Start microphone' })).toBeVisible();
  await expect(page.getByText('Simple, honest feedback')).toBeVisible();
});
