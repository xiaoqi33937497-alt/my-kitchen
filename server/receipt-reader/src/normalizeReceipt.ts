import { categories, confidenceLevels, storageZones, type Confidence, type InventoryCategory, type ReceiptApiDraft, type StorageZone } from './contracts.js';

const MAX_RAW_OUTPUT = 200_000;
const MAX_ITEMS = 80;
const datePattern = /^\d{4}-\d{2}-\d{2}$/;
function isCalendarDate(value: string) { if (!datePattern.test(value)) return false; const [year, month, day] = value.split('-').map(Number); const date = new Date(Date.UTC(year, month - 1, day)); return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day; }

export class ReceiptParseError extends Error {}

function bounded(value: unknown, max: number) {
  return typeof value === 'string' ? value.trim().slice(0, max) : '';
}

function parseRaw(raw: unknown): unknown {
  if (typeof raw !== 'string') return raw;
  if (raw.length > MAX_RAW_OUTPUT) throw new ReceiptParseError('模型输出过长');
  const cleaned = raw.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
  try { return JSON.parse(cleaned); } catch { throw new ReceiptParseError('无法解析模型输出'); }
}

export function normalizeReceipt(raw: unknown, clientDate: string): ReceiptApiDraft {
  const parsed = parseRaw(raw);
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new ReceiptParseError('模型输出不是对象');
  const source = parsed as Record<string, unknown>;
  const warnings = Array.isArray(source.warnings)
    ? source.warnings.map((value) => bounded(value, 200)).filter(Boolean).slice(0, 20)
    : [];
  const inputItems = Array.isArray(source.items) ? source.items : [];
  if (inputItems.length > MAX_ITEMS) warnings.push('识别结果超过 80 项，仅保留前 80 项');
  const items = inputItems.flatMap((value, index) => {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return [];
    const item = value as Record<string, unknown>;
    const name = bounded(item.name, 100);
    if (!name) { warnings.push(`第 ${index + 1} 项缺少名称，已忽略`); return []; }
    const category = categories.includes(item.category as InventoryCategory) ? item.category as InventoryCategory : 'other';
    const storageZone = storageZones.includes(item.storageZone as StorageZone) ? item.storageZone as StorageZone : 'pantry';
    const rawQuantity = typeof item.quantity === 'number' && Number.isFinite(item.quantity) && item.quantity > 0 ? item.quantity : null;
    const roundedQuantity = rawQuantity === null ? 1 : Math.round(rawQuantity * 100) / 100;
    const quantity = Number.isFinite(roundedQuantity) && roundedQuantity > 0 ? roundedQuantity : rawQuantity !== null && rawQuantity < 0.01 ? 0.01 : 1;
    const unit = bounded(item.unit, 20) || '件';
    const confidence = confidenceLevels.includes(item.confidence as Confidence) ? item.confidence as Confidence : 'low';
    const expiry = bounded(item.packageExpiryDate, 10);
    if (category === 'other' && item.category !== 'other') warnings.push(`${name} 的分类无法确认，已设为其他`);
    if (storageZone === 'pantry' && item.storageZone !== 'pantry') warnings.push(`${name} 的存放位置无法确认，已设为常温`);
    if (rawQuantity === null || quantity !== rawQuantity) warnings.push(`${name} 的数量无法确认，已调整为 ${quantity}`);
    if (expiry && !isCalendarDate(expiry)) warnings.push(`${name} 的包装日期无效，已忽略`);
    return [{ name, category, storageZone, quantity, unit, ...(isCalendarDate(expiry) ? { packageExpiryDate: expiry } : {}), confidence }];
  }).slice(0, MAX_ITEMS);
  const receiptDateValue = bounded(source.receiptDate, 10);
  if (receiptDateValue && !isCalendarDate(receiptDateValue)) warnings.push('小票日期无效，已使用拍照日期');
  return {
    receiptDate: isCalendarDate(receiptDateValue) ? receiptDateValue : (isCalendarDate(clientDate) ? clientDate : null),
    merchantName: bounded(source.merchantName, 80) || null,
    items,
    warnings: warnings.slice(0, 20),
  };
}
