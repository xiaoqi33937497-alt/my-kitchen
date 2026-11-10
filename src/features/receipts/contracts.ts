import type { InventoryCategory, NutritionValues, StorageZone } from '../../domain/inventory/types';

export interface ProcessedReceiptImage {
  mimeType: 'image/jpeg';
  base64: string;
  width: number;
  height: number;
  byteLength: number;
}

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
  confidence: 'high' | 'medium' | 'low';
}

export interface ReceiptApiDraft {
  receiptDate: string | null;
  merchantName: string | null;
  totalPaidCents?: number;
  items: ReceiptApiItem[];
  warnings: string[];
}

export interface NutritionLabelResult { per100g: NutritionValues; warnings: string[] }

