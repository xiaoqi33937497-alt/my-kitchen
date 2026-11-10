import { z } from 'zod';

export const inventoryFormSchema = z.object({
  name: z.string().trim().min(1, '请输入食材名称'),
  category: z.enum(['vegetable', 'fruit', 'protein', 'dairy', 'dessert', 'drink', 'snack', 'staple', 'other']),
  storageZone: z.enum(['fridge', 'freezer', 'pantry']),
  purchasedAt: z.string().min(1, '请选择购买日期'),
  quantity: z.number().positive('数量必须大于 0'),
  unit: z.string().trim().min(1, '请输入单位'),
  productionDate: z.string().optional(),
  packageExpiryDate: z.string().optional(),
  shelfLifeDays: z.number().positive().optional(),
  weightGrams: z.number().positive('实际克数必须大于 0').optional(),
  lineAmountCents: z.number().int().nonnegative('商品金额不能小于 0').optional(),
  caloriesKcal: z.number().nonnegative().optional(),
  proteinGrams: z.number().nonnegative().optional(),
  fatGrams: z.number().nonnegative().optional(),
  carbohydrateGrams: z.number().nonnegative().optional(),
  sodiumMilligrams: z.number().nonnegative().optional(),
}).superRefine((value, context) => {
  const nutrition = [value.caloriesKcal, value.proteinGrams, value.fatGrams, value.carbohydrateGrams, value.sodiumMilligrams];
  const entered = nutrition.filter((part) => part !== undefined).length;
  if (entered > 0 && entered < nutrition.length) context.addIssue({ code: 'custom', message: '请填写完整五项营养数据' });
  if (entered > 0 && value.weightGrams === undefined) context.addIssue({ code: 'custom', message: '填写营养数据时请输入实际克数' });
});
export type InventoryFormValues = z.infer<typeof inventoryFormSchema>;

