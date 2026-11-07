import { useState, type FormEvent } from 'react';
import { inventoryFormSchema, type InventoryFormValues } from './inventoryFormSchema';

export function InventoryForm({ onSubmit, today, initial }: { onSubmit: (value: InventoryFormValues) => void | Promise<void>; today: string; initial?: Partial<InventoryFormValues> }) {
  const [errors, setErrors] = useState<string[]>([]);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const shelfLife = String(data.get('shelfLifeDays') || '');
    const raw = { name: data.get('name'), category: data.get('category'), storageZone: data.get('storageZone'), purchasedAt: data.get('purchasedAt'), quantity: Number(data.get('quantity')), unit: data.get('unit'), packageExpiryDate: String(data.get('packageExpiryDate') || '') || undefined, productionDate: String(data.get('productionDate') || '') || undefined, shelfLifeDays: shelfLife ? Number(shelfLife) : undefined };
    const parsed = inventoryFormSchema.safeParse(raw);
    if (!parsed.success) { setErrors(parsed.error.issues.map((issue) => issue.message)); return; }
    setErrors([]); await onSubmit(parsed.data);
  }
  return <form className="inventory-form" onSubmit={submit}>
    <label>食材名称<input name="name" aria-label="食材名称" placeholder="例如：鸡蛋" defaultValue={initial?.name ?? ''} /></label>
    <div className="form-grid"><label>分类<select name="category" defaultValue={initial?.category ?? 'other'}><option value="vegetable">蔬菜</option><option value="fruit">水果</option><option value="protein">肉蛋</option><option value="drink">饮品</option><option value="snack">零食</option><option value="staple">主食</option><option value="other">其他</option></select></label>
    <label>存放位置<select name="storageZone" defaultValue={initial?.storageZone ?? 'fridge'}><option value="fridge">冷藏</option><option value="freezer">冷冻</option><option value="pantry">常温</option></select></label></div>
    <div className="form-grid"><label>数量<input name="quantity" aria-label="数量" type="number" step="0.01" defaultValue={initial?.quantity ?? 1} /></label><label>单位<input name="unit" defaultValue={initial?.unit ?? '个'} /></label></div>
    <label>购买日期<input name="purchasedAt" type="date" defaultValue={initial?.purchasedAt ?? today} /></label>
    <label>包装到期日（可选）<input name="packageExpiryDate" type="date" defaultValue={initial?.packageExpiryDate ?? ''} /></label>
    <div className="form-grid"><label>生产日期<input aria-label="生产日期" name="productionDate" type="date" defaultValue={initial?.productionDate ?? ''} /></label><label>保质期（天）<input aria-label="保质期（天）" name="shelfLifeDays" type="number" min="1" defaultValue={initial?.shelfLifeDays ?? ''} /></label></div>
    {errors.length > 0 && <div className="form-errors">{errors.map((error) => <p key={error}>{error}</p>)}</div>}
    <button className="primary-action" type="submit">保存到库存</button>
  </form>;
}
