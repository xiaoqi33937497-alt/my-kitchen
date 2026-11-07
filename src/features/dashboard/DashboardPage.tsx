import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { inventoryService } from '../../app/services';
import type { InventoryItem } from '../../domain/inventory/types';
import type { ShelfLifeResult, Urgency } from '../../domain/shelfLife/calculate';
import { PriorityList } from './PriorityList';

export interface DashboardData { total: number; zoneTotals: { fridge: number; freezer: number; pantry: number }; priority: Array<{ item: InventoryItem; shelf: ShelfLifeResult; urgency: Urgency }> }

export function DashboardView({ data }: { data: DashboardData }) {
  return <section className="dashboard"><header className="dashboard-hero"><span className="eyebrow">我的厨房</span><h1>今天先吃什么？</h1><div className="summary-card"><div><strong>{data.priority.length}</strong> 件临期食材<small>未来两天内建议吃掉</small></div><Link to="/inventory">查看清单</Link></div></header><div className="dashboard-body"><div className="quick-actions"><button disabled>上传购物小票<span>下一阶段</span></button><Link className="manual-add-action" to="/inventory/new"><span aria-hidden="true" className="quick-action-icon">＋</span><span>手动添加</span></Link></div><div className="section-head"><h2>优先吃掉</h2><Link to="/inventory">查看全部 ›</Link></div><PriorityList entries={data.priority} /><div className="section-head"><h2>我的厨房</h2><span>{data.total} 件物品</span></div><div className="zone-grid"><div><strong>{data.zoneTotals.fridge}</strong><span>冷藏</span></div><div><strong>{data.zoneTotals.freezer}</strong><span>冷冻</span></div><div><strong>{data.zoneTotals.pantry}</strong><span>常温</span></div></div><div className="recipe-teaser"><div>⌁</div><p><b>添加一个菜谱视频</b><small>粘贴链接，自动提取配方与分类</small></p><span>下一阶段</span></div></div></section>;
}

export function DashboardPage() {
  const [data, setData] = useState<DashboardData>({ total: 0, zoneTotals: { fridge: 0, freezer: 0, pantry: 0 }, priority: [] });
  useEffect(() => {
    const refresh = () => void inventoryService.getDashboard(new Date()).then(setData);
    refresh(); document.addEventListener('visibilitychange', refresh); window.addEventListener('focus', refresh);
    const timer = window.setInterval(refresh, 60_000);
    return () => { document.removeEventListener('visibilitychange', refresh); window.removeEventListener('focus', refresh); window.clearInterval(timer); };
  }, []);
  return <DashboardView data={data} />;
}
