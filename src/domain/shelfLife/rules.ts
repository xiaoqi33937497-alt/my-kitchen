import type { InventoryCategory, StorageZone } from '../inventory/types';

export interface ShelfLifeRule { bestDays: number; expiryDays: number }

const categoryRules: Record<InventoryCategory, Record<StorageZone, ShelfLifeRule>> = {
  vegetable: { fridge: { bestDays: 3, expiryDays: 5 }, freezer: { bestDays: 60, expiryDays: 90 }, pantry: { bestDays: 2, expiryDays: 3 } },
  fruit: { fridge: { bestDays: 4, expiryDays: 7 }, freezer: { bestDays: 60, expiryDays: 90 }, pantry: { bestDays: 3, expiryDays: 5 } },
  protein: { fridge: { bestDays: 2, expiryDays: 3 }, freezer: { bestDays: 60, expiryDays: 90 }, pantry: { bestDays: 1, expiryDays: 1 } },
  drink: { fridge: { bestDays: 5, expiryDays: 7 }, freezer: { bestDays: 14, expiryDays: 30 }, pantry: { bestDays: 30, expiryDays: 60 } },
  snack: { fridge: { bestDays: 30, expiryDays: 60 }, freezer: { bestDays: 60, expiryDays: 90 }, pantry: { bestDays: 30, expiryDays: 60 } },
  staple: { fridge: { bestDays: 14, expiryDays: 30 }, freezer: { bestDays: 90, expiryDays: 180 }, pantry: { bestDays: 60, expiryDays: 120 } },
  other: { fridge: { bestDays: 3, expiryDays: 5 }, freezer: { bestDays: 30, expiryDays: 60 }, pantry: { bestDays: 7, expiryDays: 14 } },
};

export function getShelfLifeRule(category: InventoryCategory, storageZone: StorageZone) { return categoryRules[category][storageZone]; }
