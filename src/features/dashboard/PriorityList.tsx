import { Link } from 'react-router-dom';
import type { InventoryItem } from '../../domain/inventory/types';
import type { ShelfLifeResult, Urgency } from '../../domain/shelfLife/calculate';
import { getFoodEmoji } from '../../shared/foodEmoji';

const labels: Record<Urgency, string> = { past: '已超过最佳期', today: '今天最佳', 'one-day': '还剩1天', 'two-days': '还剩2天', later: '稍后' };
export function PriorityList({ entries }: { entries: Array<{ item: InventoryItem; shelf: ShelfLifeResult; urgency: Urgency }> }) {
  if (entries.length === 0) return <div className="empty-priority"><p>目前没有临期食材</p><Link to="/inventory/new">手动添加</Link></div>;
  return <div>{entries.map(({ item, shelf, urgency }) => <Link className="priority-row" to={`/inventory/${item.id}`} key={item.id}><div className="food-icon">{getFoodEmoji(item.name, item.category)}</div><div><b>{item.name}</b><small>{item.storageZone === 'fridge' ? '冷藏' : item.storageZone === 'freezer' ? '冷冻' : '常温'} · {item.purchasedAt}</small><small className="source-label">{shelf.isReference ? '参考估算' : shelf.source === 'package' ? '包装标注' : '按包装计算'}</small></div><span className={`due ${urgency === 'today' || urgency === 'past' ? 'today' : ''}`}>{labels[urgency]}</span></Link>)}</div>;
}
