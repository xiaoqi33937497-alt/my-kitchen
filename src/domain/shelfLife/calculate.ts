import type { InventoryCategory, StorageZone } from '../inventory/types';
import { getShelfLifeRule } from './rules';

export interface ShelfLifeInput { name: string; category: InventoryCategory; storageZone: StorageZone; purchasedAt: string; packageExpiryDate?: string; productionDate?: string; shelfLifeDays?: number }
export interface ShelfLifeResult { bestBeforeDate: string; expiryDate: string; source: 'package' | 'calculated-package' | 'estimate'; isReference: boolean }
export type Urgency = 'today' | 'one-day' | 'two-days' | 'later' | 'past';

function addCalendarDays(date: string, days: number) {
  const value = new Date(`${date}T00:00:00Z`);
  value.setUTCDate(value.getUTCDate() + days);
  return value.toISOString().slice(0, 10);
}

export function calculateShelfLife(input: ShelfLifeInput, _now: Date): ShelfLifeResult {
  if (input.packageExpiryDate) return { bestBeforeDate: input.packageExpiryDate, expiryDate: input.packageExpiryDate, source: 'package', isReference: false };
  if (input.productionDate && input.shelfLifeDays !== undefined) {
    const expiryDate = addCalendarDays(input.productionDate, input.shelfLifeDays);
    return { bestBeforeDate: expiryDate, expiryDate, source: 'calculated-package', isReference: false };
  }
  const rule = getShelfLifeRule(input.category, input.storageZone);
  return { bestBeforeDate: addCalendarDays(input.purchasedAt, rule.bestDays), expiryDate: addCalendarDays(input.purchasedAt, rule.expiryDays), source: 'estimate', isReference: true };
}

function shanghaiDate(now: Date) {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Shanghai', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(now);
  const value = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${value.year}-${value.month}-${value.day}`;
}

export function getUrgency(result: ShelfLifeResult, now: Date): Urgency {
  const today = Date.parse(`${shanghaiDate(now)}T00:00:00Z`);
  const target = Date.parse(`${result.bestBeforeDate}T00:00:00Z`);
  const days = Math.round((target - today) / 86_400_000);
  if (days < 0) return 'past';
  if (days === 0) return 'today';
  if (days === 1) return 'one-day';
  if (days === 2) return 'two-days';
  return 'later';
}
