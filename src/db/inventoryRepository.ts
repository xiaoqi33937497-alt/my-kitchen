import type { KitchenDb } from './kitchenDb';
import type { ConsumptionEvent, InventoryItem, NewInventoryItem } from '../domain/inventory/types';

export interface InventoryRepository {
  listActive(): Promise<InventoryItem[]>;
  get(id: string): Promise<InventoryItem | undefined>;
  create(input: NewInventoryItem): Promise<InventoryItem>;
  update(id: string, patch: Partial<InventoryItem>): Promise<InventoryItem>;
  addEvent(event: ConsumptionEvent): Promise<void>;
  replaceAll(snapshot: { items: InventoryItem[]; events: ConsumptionEvent[] }): Promise<void>;
}

export class DexieInventoryRepository implements InventoryRepository {
  constructor(public readonly db: KitchenDb) {}

  async listActive() {
    const items = await this.db.inventory.where('status').equals('active').toArray();
    return items.sort((a, b) => b.purchasedAt.localeCompare(a.purchasedAt));
  }

  get(id: string) { return this.db.inventory.get(id); }

  async create(input: NewInventoryItem) {
    const now = new Date().toISOString();
    const item: InventoryItem = { dateSource: 'none', status: 'active', createdAt: now, updatedAt: now, ...input };
    await this.db.inventory.add(item);
    return item;
  }

  async update(id: string, patch: Partial<InventoryItem>) {
    const updated = await this.db.inventory.update(id, { ...patch, updatedAt: new Date().toISOString() });
    if (!updated) throw new Error('库存项不存在');
    return (await this.db.inventory.get(id))!;
  }

  async addEvent(event: ConsumptionEvent) { await this.db.events.add(event); }

  async replaceAll(snapshot: { items: InventoryItem[]; events: ConsumptionEvent[] }) {
    await this.db.transaction('rw', this.db.inventory, this.db.events, async () => {
      await this.db.inventory.clear();
      await this.db.events.clear();
      await this.db.inventory.bulkAdd(snapshot.items);
      await this.db.events.bulkAdd(snapshot.events);
    });
  }
}
