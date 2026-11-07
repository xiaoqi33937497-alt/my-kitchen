export type InventoryCategory = 'vegetable' | 'fruit' | 'protein' | 'drink' | 'snack' | 'staple' | 'other';
export type StorageZone = 'fridge' | 'freezer' | 'pantry';
export type InventoryStatus = 'active' | 'consumed' | 'discarded';
export type DateSource = 'package' | 'production-plus-duration' | 'estimate' | 'none';

export interface InventoryItem {
  id: string;
  name: string;
  category: InventoryCategory;
  storageZone: StorageZone;
  purchasedAt: string;
  initialQuantity: number;
  remainingQuantity: number;
  unit: string;
  productionDate?: string;
  packageExpiryDate?: string;
  shelfLifeDays?: number;
  bestBeforeDate?: string;
  referenceExpiryDate?: string;
  dateSource: DateSource;
  status: InventoryStatus;
  createdAt: string;
  updatedAt: string;
}

export interface ConsumptionEvent {
  id: string;
  inventoryItemId: string;
  quantity: number;
  reason: 'consumed' | 'discarded' | 'corrected';
  createdAt: string;
}

export interface LocalSettings {
  id: 'local';
  timezone: 'Asia/Shanghai';
  storageVersion: 1;
  lastBackupAt?: string;
}

export type NewInventoryItem = Pick<InventoryItem, 'id' | 'name' | 'category' | 'storageZone' | 'purchasedAt' | 'initialQuantity' | 'remainingQuantity' | 'unit'> & Partial<Pick<InventoryItem, 'productionDate' | 'packageExpiryDate' | 'shelfLifeDays' | 'bestBeforeDate' | 'referenceExpiryDate' | 'dateSource' | 'status'>>;
