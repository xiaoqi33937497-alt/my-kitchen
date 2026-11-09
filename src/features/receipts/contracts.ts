import type { InventoryCategory, StorageZone } from '../../domain/inventory/types';

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
  packageExpiryDate?: string;
  confidence: 'high' | 'medium' | 'low';
}

export interface ReceiptApiDraft {
  receiptDate: string | null;
  merchantName: string | null;
  items: ReceiptApiItem[];
  warnings: string[];
}
