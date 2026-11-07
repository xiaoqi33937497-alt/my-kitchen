import Dexie, { type EntityTable } from 'dexie';
import type { ConsumptionEvent, InventoryItem, LocalSettings } from '../domain/inventory/types';

export class KitchenDb extends Dexie {
  inventory!: EntityTable<InventoryItem, 'id'>;
  events!: EntityTable<ConsumptionEvent, 'id'>;
  settings!: EntityTable<LocalSettings, 'id'>;

  constructor(name = 'kitchen-manager') {
    super(name);
    this.version(1).stores({
      inventory: 'id, status, purchasedAt, storageZone, category, updatedAt',
      events: 'id, inventoryItemId, createdAt',
      settings: 'id',
    });
  }
}

export function createKitchenDb(name?: string) { return new KitchenDb(name); }
