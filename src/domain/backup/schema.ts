import { z } from 'zod';

const calendarDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, '日期格式无效').refine((value) => {
  const parsed = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}, '日期无效');
const timestamp = z.string().datetime();
const nutritionValues = z.object({ caloriesKcal: z.number().nonnegative(), proteinGrams: z.number().nonnegative(), fatGrams: z.number().nonnegative(), carbohydrateGrams: z.number().nonnegative(), sodiumMilligrams: z.number().nonnegative() });

const inventoryItemSchema = z.object({
  id: z.string().min(1), name: z.string().min(1), category: z.enum(['vegetable','fruit','protein','dairy','dessert','drink','snack','staple','other']), storageZone: z.enum(['fridge','freezer','pantry']), purchasedAt: calendarDate, initialQuantity: z.number().positive(), remainingQuantity: z.number().nonnegative(), unit: z.string().min(1), weightGrams: z.number().positive().optional(), lineAmountCents: z.number().int().nonnegative().optional(), receiptTotalCents: z.number().int().nonnegative().optional(), nutrition: z.object({ source: z.enum(['estimate','label']), weightGrams: z.number().positive(), totals: nutritionValues, per100g: nutritionValues.optional() }).optional(), productionDate: calendarDate.optional(), packageExpiryDate: calendarDate.optional(), shelfLifeDays: z.number().int().positive().optional(), bestBeforeDate: calendarDate.optional(), referenceExpiryDate: calendarDate.optional(), dateSource: z.enum(['package','production-plus-duration','estimate','none']), status: z.enum(['active','consumed','discarded']), createdAt: timestamp, updatedAt: timestamp,
}).superRefine((item, context) => {
  if (item.remainingQuantity > item.initialQuantity) context.addIssue({ code: 'custom', message: '剩余数量不能超过初始数量' });
  if ((item.status === 'active') !== (item.remainingQuantity > 0)) context.addIssue({ code: 'custom', message: '库存状态与剩余数量不一致' });
});
const eventSchema = z.object({ id: z.string(), inventoryItemId: z.string(), quantity: z.number().positive(), reason: z.enum(['consumed','discarded','corrected']), createdAt: timestamp });
const settingsSchema = z.object({ timezone: z.literal('Asia/Shanghai'), storageVersion: z.literal(1), lastBackupAt: z.string().optional() });
export const backupV1Schema = z.object({ format: z.literal('kitchen-manager-backup'), version: z.literal(1), exportedAt: z.string(), items: z.array(inventoryItemSchema), events: z.array(eventSchema), settings: settingsSchema });
export type BackupV1 = z.infer<typeof backupV1Schema>;

export function validateBackup(value: unknown): BackupV1 {
  const backup = backupV1Schema.parse(value);
  const ids = backup.items.map((item) => item.id);
  if (new Set(ids).size !== ids.length) throw new Error('备份中存在重复库存 ID');
  const known = new Set(ids);
  if (backup.events.some((event) => !known.has(event.inventoryItemId))) throw new Error('备份包含找不到库存项的事件');
  return backup;
}

