import { expect, test } from '@playwright/test';

test('adds inventory, partially consumes it and keeps it after reload', async ({ page }) => {
  await page.goto('/inventory/new');
  await page.getByLabel('食材名称').fill('鸡蛋');
  await page.getByLabel('数量').fill('6');
  await page.getByRole('button', { name: '保存到库存' }).click();
  await page.getByText('鸡蛋').click();
  page.once('dialog', (dialog) => dialog.accept('2'));
  await page.getByRole('button', { name: '记录已吃数量' }).click();
  await expect(page.getByText('4 个')).toBeVisible();
  await page.reload();
  await expect(page.getByText('4 个')).toBeVisible();

  const yesterday = await page.evaluate(() => {
    const now = new Date(); now.setUTCDate(now.getUTCDate() - 1);
    return now.toISOString().slice(0, 10);
  });
  await page.goto('/inventory/new');
  await page.getByLabel('食材名称').fill('菠菜');
  await page.locator('select[name="category"]').selectOption('vegetable');
  await page.locator('input[name="purchasedAt"]').fill(yesterday);
  await page.getByRole('button', { name: '保存到库存' }).click();
  await expect(page).toHaveURL(/\/inventory$/);
  await page.goto('/');
  await expect(page.getByText('菠菜')).toBeVisible();
  await expect(page.getByText('还剩2天')).toBeVisible();

  await page.goto('/settings');
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: '导出备份' }).click();
  const download = await downloadPromise;
  const backupPath = await download.path();
  expect(backupPath).toBeTruthy();

  await page.evaluate(async () => {
    const { kitchenDb } = await import('/src/app/services.ts');
    kitchenDb.close();
    await new Promise<void>((resolve, reject) => {
      const request = indexedDB.deleteDatabase('kitchen-manager');
      request.onsuccess = () => resolve(); request.onerror = () => reject(request.error);
    });
  });
  await page.reload();
  page.once('dialog', (dialog) => dialog.accept());
  await page.locator('input[type="file"]').setInputFiles(backupPath!);
  await expect(page.getByText(/恢复成功/)).toBeVisible();
  await page.goto('/inventory');
  await expect(page.getByText('鸡蛋')).toBeVisible();
  await expect(page.getByText('菠菜')).toBeVisible();
});
