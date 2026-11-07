import type { ReactElement } from 'react';
import { Route, Routes } from 'react-router-dom';
import { InventoryListPage } from '../features/inventory/InventoryListPage';
import { InventoryDetailPage } from '../features/inventory/InventoryDetailPage';
import { NewInventoryPage } from '../features/inventory/NewInventoryPage';
import { DashboardPage } from '../features/dashboard/DashboardPage';
import { SettingsPage } from '../features/settings/SettingsPage';
import { EditInventoryPage } from '../features/inventory/EditInventoryPage';

function Placeholder({ title }: { title: string }) { return <section className="page"><h1>{title}</h1></section>; }

export function AppRoutes({ layout }: { layout: ReactElement }) {
  return <Routes><Route element={layout}>
    <Route index element={<DashboardPage />} />
    <Route path="inventory" element={<InventoryListPage />} />
    <Route path="inventory/new" element={<NewInventoryPage />} />
    <Route path="inventory/:id" element={<InventoryDetailPage />} />
    <Route path="inventory/:id/edit" element={<EditInventoryPage />} />
    <Route path="recipes" element={<Placeholder title="菜谱即将推出" />} />
    <Route path="settings" element={<SettingsPage />} />
  </Route></Routes>;
}
