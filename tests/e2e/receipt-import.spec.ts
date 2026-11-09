import { expect, test } from '@playwright/test';

test('recognizes, edits and atomically saves a receipt draft', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(async () => {
    indexedDB.deleteDatabase('kitchen-manager');
    await new Promise((resolve) => setTimeout(resolve, 50));
  });
  await page.reload();
  let postCount = 0;
  const requestUrls: string[] = [];
  page.on('request', (request) => requestUrls.push(request.url()));
  await page.context().route('http://127.0.0.1:5173/__receipt-test/v1/receipts/analyze', async (route) => {
    expect(route.request().url()).toBe('http://127.0.0.1:5173/__receipt-test/v1/receipts/analyze');
    if (route.request().method() === 'OPTIONS') {
      await route.fulfill({ status: 204, headers: { 'access-control-allow-origin': 'http://127.0.0.1:5173', 'access-control-allow-methods': 'POST, OPTIONS', 'access-control-allow-headers': 'content-type' } });
      return;
    }
    postCount += 1;
    await route.fulfill({ status: 200, contentType: 'application/json', headers: { 'access-control-allow-origin': 'http://127.0.0.1:5173' }, body: JSON.stringify({ receiptDate: '2026-11-08', merchantName: '测试超市', warnings: [], items: [
      { name: '鸡蛋', category: 'protein', storageZone: 'fridge', quantity: 8, unit: '个', confidence: 'high' },
      { name: '牛奶', category: 'drink', storageZone: 'fridge', quantity: 1, unit: '盒', confidence: 'medium' },
    ] }) });
  });
  await page.getByRole('link', { name: '上传购物小票' }).click();
  await page.locator('input[type=file]').evaluate((input) => new Promise<void>((resolve) => {
    const canvas = document.createElement('canvas'); canvas.width = 400; canvas.height = 800;
    const context = canvas.getContext('2d')!; context.fillStyle = 'white'; context.fillRect(0, 0, 400, 800); context.fillStyle = 'black'; context.font = '30px sans-serif'; context.fillText('测试小票 鸡蛋 牛奶', 20, 80);
    canvas.toBlob((blob) => { const transfer = new DataTransfer(); transfer.items.add(new File([blob!], 'receipt.png', { type: 'image/png' })); (input as HTMLInputElement).files = transfer.files; input.dispatchEvent(new Event('change', { bubbles: true })); resolve(); }, 'image/png');
  }));
  await page.getByRole('button', { name: '开始识别' }).click();
  await page.waitForTimeout(300);
  expect(requestUrls.filter((url) => url.includes('receipts'))).toContain('http://127.0.0.1:5173/__receipt-test/v1/receipts/analyze');
  await expect(page.getByLabel('商品名称').first()).toHaveValue('鸡蛋');
  await page.getByLabel('商品名称').first().fill('土鸡蛋');
  await page.getByRole('button', { name: '删除此项' }).nth(1).click();
  await page.getByRole('button', { name: '全部加入库存' }).click();
  await expect(page).toHaveURL(/\/inventory$/);
  await expect(page.getByText('土鸡蛋')).toBeVisible();
  expect(postCount).toBe(1);
  await page.goto('/');
  await expect(page.getByText('1 件物品')).toBeVisible();
});
