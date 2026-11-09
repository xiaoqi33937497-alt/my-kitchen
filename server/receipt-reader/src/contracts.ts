export const categories = ['vegetable', 'fruit', 'protein', 'drink', 'snack', 'staple', 'other'] as const;
export const storageZones = ['fridge', 'freezer', 'pantry'] as const;
export const confidenceLevels = ['high', 'medium', 'low'] as const;

export type InventoryCategory = typeof categories[number];
export type StorageZone = typeof storageZones[number];
export type Confidence = typeof confidenceLevels[number];

export interface ReceiptApiItem {
  name: string;
  category: InventoryCategory;
  storageZone: StorageZone;
  quantity: number;
  unit: string;
  packageExpiryDate?: string;
  confidence: Confidence;
}

export interface ReceiptApiDraft {
  receiptDate: string | null;
  merchantName: string | null;
  items: ReceiptApiItem[];
  warnings: string[];
}

export interface AnalyzeReceiptRequest {
  image: { mimeType: 'image/jpeg'; base64: string };
  clientDate: string;
}
