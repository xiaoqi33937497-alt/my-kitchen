import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import type { InventoryItem } from '../../domain/inventory/types';
import { inventoryRepository } from '../../app/services';
import { calculateShelfLife, getUrgency } from '../../domain/shelfLife/calculate';

const zones = { fridge: '冷藏', freezer: '冷冻', pantry: '常温' };
export function InventoryListView({ items, now }: { items: InventoryItem[]; now: Date }) {
  const [zone, setZone] = useState('all'); const [category, setCategory] = useState('all'); const [urgency, setUrgency] = useState('all');
  const rows = items.map((item) => { const shelf = calculateShelfLife(item, now); return { item, shelf, urgency: getUrgency(shelf, now) }; }).filter(({ item, urgency: itemUrgency }) => (zone === 'all' || item.storageZone === zone) && (category === 'all' || item.category === category) && (urgency === 'all' || itemUrgency === urgency));
  return <><div className="inventory-filters"><label>位置<select aria-label="存放位置筛选" value={zone} onChange={(event) => setZone(event.target.value)}><option value="all">全部</option><option value="fridge">冷藏</option><option value="freezer">冷冻</option><option value="pantry">常温</option></select></label><label>分类<select aria-label="分类筛选" value={category} onChange={(event) => setCategory(event.target.value)}><option value="all">全部</option><option value="vegetable">蔬菜</option><option value="fruit">水果</option><option value="protein">肉蛋</option><option value="dairy">乳制品</option><option value="dessert">甜品</option><option value="drink">饮品</option><option value="snack">零食</option><option value="staple">主食</option><option value="other">其他</option></select></label><label>临期<select aria-label="临期筛选" value={urgency} onChange={(event) => setUrgency(event.target.value)}><option value="all">全部</option><option value="past">已过最佳期</option><option value="today">今天</option><option value="one-day">1天</option><option value="two-days">2天</option></select></label></div>
  {rows.length === 0 ? <div className="empty-card"><p>没有符合条件的库存</p><Link to="/inventory/new">手动添加</Link></div> : rows.map(({ item, urgency: itemUrgency }) => <Link className="inventory-row" to={`/inventory/${item.id}`} key={item.id}><div><b>{item.name}</b><small>{zones[item.storageZone]} · {item.purchasedAt}</small><small>{itemUrgency === 'today' ? '今天最佳' : itemUrgency === 'one-day' ? '还剩1天' : itemUrgency === 'two-days' ? '还剩2天' : itemUrgency === 'past' ? '已过最佳期' : '期限正常'} · {item.dateSource === 'estimate' ? '参考估算' : '包装日期'}</small></div><span>{item.remainingQuantity} {item.unit}</span></Link>)}</>;
}
export function InventoryListPage() {
  const [items, setItems] = useState<InventoryItem[]>([]);
  useEffect(() => { void inventoryRepository.listActive().then(setItems); }, []);
  return <section className="page"><header className="page-header"><div><span className="eyebrow">我的厨房</span><h1>库存</h1></div><Link className="small-action" to="/inventory/new">＋ 添加</Link></header>
    <InventoryListView items={items} now={new Date()} />
  </section>;
}
