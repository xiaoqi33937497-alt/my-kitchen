import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { inventoryRepository, inventoryService } from '../../app/services';
import type { InventoryItem } from '../../domain/inventory/types';
import { InventoryForm } from './InventoryForm';

export function EditInventoryPage() {
  const { id = '' } = useParams(); const navigate = useNavigate(); const [item, setItem] = useState<InventoryItem>();
  useEffect(() => { void inventoryRepository.get(id).then(setItem); }, [id]);
  if (!item) return <section className="page"><p>正在读取…</p></section>;
  return <section className="page"><h1>编辑食材</h1><InventoryForm today={item.purchasedAt} initial={{ name: item.name, category: item.category, storageZone: item.storageZone, purchasedAt: item.purchasedAt, quantity: item.remainingQuantity, unit: item.unit, packageExpiryDate: item.packageExpiryDate, productionDate: item.productionDate, shelfLifeDays: item.shelfLifeDays }} onSubmit={async (value) => { await inventoryService.editItem(id, { name: value.name, category: value.category, storageZone: value.storageZone, purchasedAt: value.purchasedAt, initialQuantity: value.quantity, remainingQuantity: value.quantity, unit: value.unit, packageExpiryDate: value.packageExpiryDate, productionDate: value.productionDate, shelfLifeDays: value.shelfLifeDays }); navigate(`/inventory/${id}`); }} /></section>;
}
