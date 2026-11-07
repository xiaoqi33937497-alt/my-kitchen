import { useRef, useState } from 'react';
import { inventoryRepository } from '../../app/services';
import { BackupService } from '../../domain/backup/backupService';

const backupService = new BackupService(inventoryRepository);
export function SettingsView({ onExport, onImport, message }: { onExport: () => void; onImport: (file: File) => void; message?: string }) {
  const input = useRef<HTMLInputElement>(null);
  return <section className="page"><span className="eyebrow">本地数据</span><h1>我的</h1><div className="settings-card"><h2>备份与恢复</h2><p>数据保存在这台手机。建议定期导出备份，防止清除浏览器数据后丢失。</p><button className="primary-action" onClick={onExport}>导出备份</button><button className="secondary-action" onClick={() => input.current?.click()}>从备份恢复</button><input ref={input} hidden type="file" accept="application/json" onChange={(event) => event.target.files?.[0] && onImport(event.target.files[0])} />{message && <p className="success-message">{message}</p>}</div></section>;
}
export function SettingsPage() {
  const [message, setMessage] = useState('');
  async function exportData() { const data = await backupService.exportBackup(); const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })); const link = document.createElement('a'); link.href = url; link.download = `厨房备份-${data.exportedAt.slice(0,10)}.json`; link.click(); URL.revokeObjectURL(url); setMessage(`已导出 ${data.items.length} 件库存`); }
  async function importData(file: File) { try { const value = JSON.parse(await file.text()); if (!confirm('恢复备份会替换当前所有数据，确定继续吗？')) return; await backupService.restoreBackup(value); setMessage(`恢复成功，共 ${value.items.length} 件库存`); } catch (error) { setMessage(error instanceof Error ? `恢复失败：${error.message}` : '恢复失败'); } }
  return <SettingsView onExport={() => void exportData()} onImport={(file) => void importData(file)} message={message} />;
}
