import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Link } from 'react-router-dom';
import type { InventoryItem } from '../../domain/inventory/types';
import { inventoryRepository, inventoryService } from '../../app/services';

export function InventoryDetailView({ item, onConsume, onDiscard }: { item: InventoryItem; onConsume: (amount: number) => void; onDiscard: () => void }) {
  const source = item.dateSource === 'estimate' ? '参考估算' : item.dateSource === 'package' ? '包装标注' : item.dateSource === 'production-plus-duration' ? '按包装计算' : '待确认';
  return <div className="detail-card"><div className="detail-title"><h2>{item.name}</h2><span>{item.remainingQuantity} {item.unit}</span></div><dl><div><dt>购买日期</dt><dd>{item.purchasedAt}</dd></div><div><dt>最佳食用期</dt><dd>{item.bestBeforeDate ?? '待计算'} <em>{source}</em></dd></div><div><dt>参考到期日</dt><dd>{item.referenceExpiryDate ?? item.packageExpiryDate ?? '待计算'}</dd></div></dl><div className="detail-actions"><Link className="edit-link" to={`/inventory/${item.id}/edit`}>编辑食材</Link><button onClick={() => { const value = Number(prompt('这次吃掉多少？', '1')); if (value > 0) onConsume(value); }}>记录已吃数量</button><button className="quiet" onClick={onDiscard}>标记丢弃</button></div></div>;
}

export function InventoryDetailPage() {
  const { id = '' } = useParams(); const navigate = useNavigate(); const [item, setItem] = useState<InventoryItem>();
  const refresh = () => void inventoryRepository.get(id).then(setItem);
  useEffect(refresh, [id]);
  if (!item) return <section className="page"><p>正在读取…</p></section>;
  return <section className="page"><InventoryDetailView item={item} onConsume={(amount) => { void inventoryService.consume(id, amount).then(refresh).catch((error) => alert(error.message)); }} onDiscard={() => { if (confirm('确认丢弃剩余数量吗？')) void inventoryService.discard(id).then(() => navigate('/inventory')); }} /></section>;
}
