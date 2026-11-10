export const categories = ['vegetable', 'fruit', 'protein', 'dairy', 'dessert', 'drink', 'snack', 'staple', 'other'] as const;
export const storageZones = ['fridge', 'freezer', 'pantry'] as const;
export const confidenceLevels = ['high', 'medium', 'low'] as const;

export type InventoryCategory = typeof categories[number];
export type StorageZone = typeof storageZones[number];
export type Confidence = typeof confidenceLevels[number];
export interface NutritionValues { caloriesKcal: number; proteinGrams: number; fatGrams: number; carbohydrateGrams: number; sodiumMilligrams: number }

export interface ReceiptApiItem {
  name: string;
  category: InventoryCategory;
  storageZone: StorageZone;
  quantity: number;
  unit: string;
  weightGrams?: number;
  lineAmountCents?: number;
  nutritionPer100g?: NutritionValues;
  packageExpiryDate?: string;
  confidence: Confidence;
}

export interface ReceiptApiDraft {
  receiptDate: string | null;
  merchantName: string | null;
  totalPaidCents?: number;
  items: ReceiptApiItem[];
  warnings: string[];
}

export interface AnalyzeReceiptRequest {
  mode?: 'receipt' | 'nutrition-label';
  image: { mimeType: 'image/jpeg'; base64: string };
  clientDate?: string;
}

