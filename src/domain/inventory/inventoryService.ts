import type { InventoryItem, NewInventoryItem } from './types';
import { DexieInventoryRepository } from '../../db/inventoryRepository';
import { calculateShelfLife, getUrgency, type Urgency } from '../shelfLife/calculate';

const urgencyOrder: Record<Urgency, number> = { past: 0, today: 1, 'one-day': 2, 'two-days': 3, later: 4 };
function isCalendarDate(value: string) { if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false; const [year, month, day] = value.split('-').map(Number); const date = new Date(Date.UTC(year, month - 1, day)); return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day; }
function validateNewItem(input: NewInventoryItem) {
  if (!isCalendarDate(input.purchasedAt) || (input.packageExpiryDate && !isCalendarDate(input.packageExpiryDate)) || (input.productionDate && !isCalendarDate(input.productionDate))) throw new Error('日期无效');
  for (const quantity of [input.initialQuantity, input.remainingQuantity]) if (!Number.isFinite(quantity) || quantity <= 0 || Math.abs(quantity * 100 - Math.round(quantity * 100)) > 1e-8) throw new Error('数量必须大于 0 且最多支持两位小数');
}

export class InventoryService {
  constructor(private readonly repository: DexieInventoryRepository) {}

  async createItem(input: NewInventoryItem) {
    validateNewItem(input);
    const shelf = calculateShelfLife(input, new Date());
    return this.repository.create({ ...input, bestBeforeDate: shelf.bestBeforeDate, referenceExpiryDate: shelf.expiryDate, dateSource: shelf.source === 'calculated-package' ? 'production-plus-duration' : shelf.source });
  }

  async createItems(inputs: NewInventoryItem[]) {
    if (inputs.length === 0) throw new Error('至少需要一个库存项');
    inputs.forEach(validateNewItem);
    const prepared = inputs.map((input) => {
      const shelf = calculateShelfLife(input, new Date());
      return { ...input, bestBeforeDate: shelf.bestBeforeDate, referenceExpiryDate: shelf.expiryDate, dateSource: shelf.source === 'calculated-package' ? 'production-plus-duration' as const : shelf.source };
    });
    return this.repository.createMany(prepared);
  }

  async consume(id: string, amount: number) { return this.changeQuantity(id, amount, 'consumed'); }
  async discard(id: string, amount?: number) {
    const item = await this.requireItem(id);
    return this.changeQuantity(id, amount ?? item.remainingQuantity, 'discarded');
  }

  async editItem(id: string, patch: Partial<InventoryItem>) {
    const current = await this.requireItem(id);
    const next = { ...current, ...patch };
    const shelf = calculateShelfLife(next, new Date());
    return this.repository.update(id, { ...patch, bestBeforeDate: shelf.bestBeforeDate, referenceExpiryDate: shelf.expiryDate, dateSource: shelf.source === 'calculated-package' ? 'production-plus-duration' : shelf.source });
  }

  async getDashboard(now: Date) {
    const items = await this.repository.listActive();
    const entries = items.map((item) => {
      const shelf = calculateShelfLife(item, now);
      return { item, shelf, urgency: getUrgency(shelf, now) };
    });
    const priority = entries.filter((entry) => entry.urgency !== 'later').sort((a, b) => urgencyOrder[a.urgency] - urgencyOrder[b.urgency]);
    const zoneTotals = { fridge: 0, freezer: 0, pantry: 0 };
    items.forEach((item) => { zoneTotals[item.storageZone] += 1; });
    return { priority, zoneTotals, total: items.length };
  }

  private async requireItem(id: string) {
    const item = await this.repository.get(id);
    if (!item) throw new Error('库存项不存在');
    return item;
  }

  private async changeQuantity(id: string, amount: number, reason: 'consumed' | 'discarded') {
    if (!Number.isFinite(amount) || amount <= 0) throw new Error('数量必须大于 0');
    const db = this.repository.db;
    return db.transaction('rw', db.inventory, db.events, async () => {
      const item = await db.inventory.get(id);
      if (!item) throw new Error('库存项不存在');
      const amountUnits = Math.round(amount * 100);
      const remainingUnits = Math.round(item.remainingQuantity * 100);
      if (amountUnits <= 0 || Math.abs(amount * 100 - amountUnits) > 1e-8) throw new Error('数量最多支持两位小数');
      if (amountUnits > remainingUnits) throw new Error('不能超过剩余数量');
      const remainingQuantity = (remainingUnits - amountUnits) / 100;
      const status = remainingQuantity === 0 ? reason : 'active';
      await db.inventory.update(id, { remainingQuantity, status, updatedAt: new Date().toISOString() });
      await db.events.add({ id: crypto.randomUUID(), inventoryItemId: id, quantity: amount, reason, createdAt: new Date().toISOString() });
      return (await db.inventory.get(id))!;
    });
  }
}
