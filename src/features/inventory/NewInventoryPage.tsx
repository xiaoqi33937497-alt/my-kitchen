import { useNavigate } from 'react-router-dom';
import { inventoryService } from '../../app/services';
import { InventoryForm } from './InventoryForm';

function shanghaiToday() { return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Shanghai', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date()); }
export function NewInventoryPage() { const navigate = useNavigate(); return <section className="page"><h1>添加食材</h1><InventoryForm today={shanghaiToday()} onSubmit={async (value) => { await inventoryService.createItem({ id: crypto.randomUUID(), name: value.name, category: value.category, storageZone: value.storageZone, purchasedAt: value.purchasedAt, initialQuantity: value.quantity, remainingQuantity: value.quantity, unit: value.unit, packageExpiryDate: value.packageExpiryDate, productionDate: value.productionDate, shelfLifeDays: value.shelfLifeDays }); navigate('/inventory'); }} /></section>; }
