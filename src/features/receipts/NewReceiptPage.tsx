import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { inventoryService } from '../../app/services';
import type { NewInventoryItem } from '../../domain/inventory/types';
import { processReceiptImage } from './imageProcessor';
import { ReceiptApi } from './receiptApi';
import type { ProcessedReceiptImage, ReceiptApiDraft } from './contracts';
import { ReceiptReviewForm, toEditableDraft, toNewInventoryItems } from './ReceiptReviewForm';

type FlowProps = { today: string; processImage: (file: File) => Promise<ProcessedReceiptImage>; analyzeReceipt: (image: ProcessedReceiptImage, date: string, signal?: AbortSignal) => Promise<ReceiptApiDraft>; saveItems: (items: NewInventoryItem[]) => Promise<unknown>; onSaved: () => void };

export function ReceiptFlow({ today, processImage: process, analyzeReceipt, saveItems, onSaved }: FlowProps) {
  const [processed, setProcessed] = useState<ProcessedReceiptImage>(); const [preview, setPreview] = useState(''); const [draft, setDraft] = useState<ReceiptApiDraft>(); const [busy, setBusy] = useState(false); const [error, setError] = useState('');
  const recognitionLock = useRef(false); const controller = useRef<AbortController | null>(null); const selection = useRef(0); const mounted = useRef(true);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; selection.current += 1; controller.current?.abort(); }; }, []);
  useEffect(() => () => { controller.current?.abort(); if (preview) URL.revokeObjectURL(preview); }, [preview]);
  function reset() { selection.current += 1; controller.current?.abort(); controller.current = null; recognitionLock.current = false; if (preview) URL.revokeObjectURL(preview); setPreview(''); setProcessed(undefined); setDraft(undefined); setError(''); setBusy(false); }
  async function choose(file?: File) { if (!file) return; const current = selection.current + 1; selection.current = current; controller.current?.abort(); controller.current = null; recognitionLock.current = false; if (preview) URL.revokeObjectURL(preview); setPreview(''); setDraft(undefined); setProcessed(undefined); setError(''); setBusy(true); try { const result = await process(file); if (!mounted.current || selection.current !== current) return; setProcessed(result); setPreview(URL.createObjectURL(file)); } catch (reason) { if (mounted.current && selection.current === current) setError(reason instanceof Error ? reason.message : '图片处理失败'); } finally { if (mounted.current && selection.current === current) setBusy(false); } }
  async function recognize() { if (!processed || recognitionLock.current) return; const current = selection.current; recognitionLock.current = true; setBusy(true); setError(''); const active = new AbortController(); controller.current = active; try { const result = await analyzeReceipt(processed, today, active.signal); if (selection.current === current && controller.current === active) setDraft(result); } catch (reason) { if (selection.current === current && !(reason instanceof DOMException && reason.name === 'AbortError')) { setError(reason instanceof Error ? reason.message : '识别失败'); recognitionLock.current = false; } } finally { if (selection.current === current && controller.current === active) setBusy(false); } }
  if (draft) return <ReceiptReviewForm initial={toEditableDraft(draft)} fallbackDate={today} onRetry={reset} onSave={async (confirmed) => { await saveItems(toNewInventoryItems(confirmed, today)); onSaved(); }} />;
  return <section className="receipt-upload"><p className="privacy-note">小票图片将发送至火山方舟进行识别，不会保存在库存中。上传前请留意会员号、支付尾号等信息。</p><label className="receipt-picker">拍摄或选择小票<input aria-label="拍摄或选择小票" type="file" accept="image/jpeg,image/png,image/webp" capture="environment" onChange={(event) => void choose(event.target.files?.[0])} /></label>{preview && <img className="receipt-preview" src={preview} alt="小票预览" />}{error && <p className="receipt-error" role="alert">{error}</p>}{processed && <button className="primary-action receipt-recognize" type="button" disabled={busy} onClick={() => void recognize()}>{busy ? '正在识别…' : '开始识别'}</button>}{busy && !processed && <p className="receipt-status">正在压缩图片…</p>}</section>;
}

function shanghaiToday() { return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Shanghai', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date()); }
export function NewReceiptPage() { const navigate = useNavigate(); return <section className="page receipt-page"><div className="page-header"><div><span className="eyebrow">我的厨房</span><h1>上传购物小票</h1></div></div><ReceiptFlow today={shanghaiToday()} processImage={processReceiptImage} analyzeReceipt={(image, date, signal) => new ReceiptApi(import.meta.env.VITE_RECEIPT_API_URL ?? '').analyzeReceipt(image, date, signal)} saveItems={(items) => inventoryService.createItems(items)} onSaved={() => navigate('/inventory')} /></section>; }
