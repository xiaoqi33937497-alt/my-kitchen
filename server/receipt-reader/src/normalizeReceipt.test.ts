import { describe, expect, it } from 'vitest';
import { normalizeNutritionLabel, normalizeReceipt, ReceiptParseError } from './normalizeReceipt.js';

const clientDate = '2026-11-08';

describe('normalizeReceipt', () => {
  it('normalizes valid JSON without adding IDs', () => {
    const result = normalizeReceipt(JSON.stringify({ receiptDate: '2026-11-07', merchantName: '超市', items: [{ name: '鸡蛋', category: 'protein', storageZone: 'fridge', quantity: 8, unit: '个', confidence: 'high' }] }), clientDate);
    expect(result).toEqual({ receiptDate: '2026-11-07', merchantName: '超市', items: [{ name: '鸡蛋', category: 'protein', storageZone: 'fridge', quantity: 8, unit: '个', confidence: 'high' }], warnings: [] });
    expect(result.items[0]).not.toHaveProperty('id');
  });

  it('extracts fenced JSON and falls back invalid fields safely', () => {
    const result = normalizeReceipt('```json\n{"items":[{"name":"可乐","category":"liquid","storageZone":"desk","quantity":0,"unit":""}]}\n```', clientDate);
    expect(result.receiptDate).toBe(clientDate);
    expect(result.items[0]).toMatchObject({ category: 'other', storageZone: 'pantry', quantity: 1, unit: '件', confidence: 'low' });
    expect(result.warnings.length).toBeGreaterThan(0);
  });

  it('drops unnamed items and caps output at 80 items', () => {
    const items = [{ name: '   ' }, ...Array.from({ length: 90 }, (_, index) => ({ name: `商品${index}` }))];
    const result = normalizeReceipt({ items }, clientDate);
    expect(result.items).toHaveLength(80);
    expect(result.warnings.join(' ')).toContain('80');
  });

  it('bounds merchant, item, unit and warning text', () => {
    const long = '很'.repeat(500);
    const result = normalizeReceipt({ merchantName: long, warnings: [long], items: [{ name: long, unit: long }] }, clientDate);
    expect(result.merchantName?.length).toBeLessThanOrEqual(80);
    expect(result.items[0].name.length).toBeLessThanOrEqual(100);
    expect(result.items[0].unit.length).toBeLessThanOrEqual(20);
    expect(result.warnings.every((warning) => warning.length <= 200)).toBe(true);
  });

  it('rejects unparseable or oversized model output', () => {
    expect(() => normalizeReceipt('not json', clientDate)).toThrow(ReceiptParseError);
    expect(() => normalizeReceipt('x'.repeat(200_001), clientDate)).toThrow('模型输出过长');
  });

  it('falls back impossible dates and warns when quantity is corrected', () => {
    const result = normalizeReceipt({ receiptDate: '2026-99-99', items: [{ name: '散装食品', quantity: 0, packageExpiryDate: '2026-02-30' }] }, clientDate);
    expect(result.receiptDate).toBe(clientDate);
    expect(result.items[0]).not.toHaveProperty('packageExpiryDate');
    expect(result.items[0].quantity).toBe(1);
    expect(result.warnings.join(' ')).toMatch(/日期|数量/);
  });

  it('never rounds a small positive quantity down to zero', () => {
    const result = normalizeReceipt({ items: [{ name: '香料', quantity: 0.004 }] }, clientDate);
    expect(result.items[0].quantity).toBeGreaterThan(0);
    expect(result.warnings.join(' ')).toContain('数量');
  });

  it('keeps weight, money, total and estimated nutrition when valid', () => {
    const result = normalizeReceipt({ totalPaidCents: 1299.4, items: [{ name: '苹果', weightGrams: 352, lineAmountCents: 699, nutritionPer100g: { caloriesKcal: 52, proteinGrams: 0.3, fatGrams: 0.2, carbohydrateGrams: 14, sodiumMilligrams: 1 } }] }, clientDate);
    expect(result.totalPaidCents).toBe(1299);
    expect(result.items[0]).toMatchObject({ weightGrams: 352, lineAmountCents: 699, nutritionPer100g: { caloriesKcal: 52 } });
  });

  it('normalizes a nutrition label and rejects empty guesses', () => {
    expect(normalizeNutritionLabel({ per100g: { caloriesKcal: 500, proteinGrams: 8, fatGrams: 20, carbohydrateGrams: 70, sodiumMilligrams: 300 }, warnings: [] }).per100g.caloriesKcal).toBe(500);
    expect(() => normalizeNutritionLabel({ per100g: { caloriesKcal: 0, proteinGrams: 0, fatGrams: 0, carbohydrateGrams: 0, sodiumMilligrams: 0 } })).toThrow('无法确认');
  });
});

