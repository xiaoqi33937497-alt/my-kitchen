export type InventoryCategory = 'vegetable' | 'fruit' | 'protein' | 'dairy' | 'dessert' | 'drink' | 'snack' | 'staple' | 'other';
export type StorageZone = 'fridge' | 'freezer' | 'pantry';
export type InventoryStatus = 'active' | 'consumed' | 'discarded';
export type DateSource = 'package' | 'production-plus-duration' | 'estimate' | 'none';

export interface NutritionValues { caloriesKcal: number; proteinGrams: number; fatGrams: number; carbohydrateGrams: number; sodiumMilligrams: number }
export interface InventoryNutrition { source: 'estimate' | 'label'; weightGrams: number; totals: NutritionValues; per100g?: NutritionValues }

export interface InventoryItem {
  id: string;
  name: string;
  category: InventoryCategory;
  storageZone: StorageZone;
  purchasedAt: string;
  initialQuantity: number;
  remainingQuantity: number;
  unit: string;
  weightGrams?: number;
  lineAmountCents?: number;
  receiptTotalCents?: number;
  nutrition?: InventoryNutrition;
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

export type NewInventoryItem = Pick<InventoryItem, 'id' | 'name' | 'category' | 'storageZone' | 'purchasedAt' | 'initialQuantity' | 'remainingQuantity' | 'unit'> & Partial<Pick<InventoryItem, 'weightGrams' | 'lineAmountCents' | 'receiptTotalCents' | 'nutrition' | 'productionDate' | 'packageExpiryDate' | 'shelfLifeDays' | 'bestBeforeDate' | 'referenceExpiryDate' | 'dateSource' | 'status'>>;

