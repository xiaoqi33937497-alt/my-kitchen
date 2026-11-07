import { z } from 'zod';

export const inventoryFormSchema = z.object({
  name: z.string().trim().min(1, '请输入食材名称'),
  category: z.enum(['vegetable', 'fruit', 'protein', 'drink', 'snack', 'staple', 'other']),
  storageZone: z.enum(['fridge', 'freezer', 'pantry']),
  purchasedAt: z.string().min(1, '请选择购买日期'),
  quantity: z.number().positive('数量必须大于 0'),
  unit: z.string().trim().min(1, '请输入单位'),
  productionDate: z.string().optional(),
  packageExpiryDate: z.string().optional(),
  shelfLifeDays: z.number().positive().optional(),
});
export type InventoryFormValues = z.infer<typeof inventoryFormSchema>;
