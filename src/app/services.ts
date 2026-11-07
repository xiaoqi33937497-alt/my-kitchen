import { createKitchenDb } from '../db/kitchenDb';
import { DexieInventoryRepository } from '../db/inventoryRepository';
import { InventoryService } from '../domain/inventory/inventoryService';

export const kitchenDb = createKitchenDb();
export const inventoryRepository = new DexieInventoryRepository(kitchenDb);
export const inventoryService = new InventoryService(inventoryRepository);
