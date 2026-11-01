'use client';

import { useEffect, useState } from 'react';
import { Header, money } from '@/components/Screen';
import { SkeletonStack } from '@/components/Skeleton';
import { ArrowLeftRight, RotateCcw, Search, Ticket } from 'lucide-react';

type Sale = { id: string; folio: number; total: string; status: string; paymentMethod: string; createdAt: string; lines: Array<{ id: string; quantity: number; returnedQuantity: number; unitPrice: string; variant: { sku: string; product: { name: string } } }> };
type ReturnRow = { id: string; refundAmount: string; reason: string; createdAt: string; sale: { folio: number }; user: { name: string } };

export default function Returns() {
  const [search, setSearch] = useState('');
  const [sales, setSales] = useState<Sale[]>([]);
  const [rows, setRows] = useState<ReturnRow[]>([]);
  const [selected, setSelected] = useState<Sale | null>(null);
  const [reason, setReason] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const [salesResponse, returnResponse] = await Promise.all([fetch(`/api/sales${search ? `?search=${encodeURIComponent(search)}` : ''}`), fetch('/api/returns')]);
      if (!salesResponse.ok || !returnResponse.ok) throw new Error('No fue posible cargar las devoluciones.');
      setSales(await salesResponse.json()); setRows(await returnResponse.json());
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Error al cargar información.'); }
    finally { setLoading(false); }
  }
  useEffect(() => { void load(); }, []);

  async function submit() {
    if (!selected || !reason.trim()) return setMessage('Selecciona una venta y escribe el motivo.');
    const items = selected.lines.filter((line) => line.quantity > line.returnedQuantity).map((line) => ({ saleLineId: line.id, quantity: Number(prompt(`Cantidad a devolver de ${line.variant.product.name}`, String(Number(line.quantity) - line.returnedQuantity))) }));
    if (!items.length || items.some((item) => !Number.isFinite(item.quantity) || item.quantity <= 0)) return;
    const refundAmount = items.reduce((sum, item) => sum + Number(selected.lines.find((line) => line.id === item.saleLineId)?.unitPrice ?? 0) * item.quantity, 0);
    if (!confirm(`¿Registrar devolución por ${money(refundAmount)}?`)) return;
    setSaving(true); setMessage('');
    try {
      const response = await fetch('/api/returns', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ saleId: selected.id, items, reason, refundAmount, confirmation: true }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      setMessage('Devolución registrada correctamente.'); setSelected(null); setReason(''); await load();
    } catch (error) { setMessage(error instanceof Error ? error.message : 'No fue posible registrar la devolución.'); }
    finally { setSaving(false); }
  }

  return <>
    <Header title="Devoluciones" kicker="Reintegros ligados a venta" />
    <section className="returns-search card"><div><p className="section-eyebrow">Atención al cliente</p><h2>Buscar una venta</h2></div><div className="returns-search-controls"><div className="icon-field"><Search size={18} aria-hidden="true"/><input className="field" aria-label="Buscar venta" placeholder="Buscar por folio o ID de venta" value={search} onChange={(event) => setSearch(event.target.value)} /></div><button className="btn btn-primary" type="button" onClick={() => void load()}><Search size={16}/>Buscar</button></div></section>
    {message && <p className="form-feedback" role="status">{message}</p>}
    {selected && <section className="card return-selected"><div className="section-heading"><div><p className="section-eyebrow">Venta seleccionada</p><h2>Folio #{selected.folio}</h2></div><span className="subtle-chip">{money(selected.total)}</span></div><div className="return-lines">{selected.lines.map((line) => <div className="return-line" key={line.id}><div><strong>{line.variant.product.name}</strong><small>{line.variant.sku} · Vendidas {line.quantity}, devueltas {line.returnedQuantity}</small></div><span>{money(line.unitPrice)}</span></div>)}</div><label className="form-label return-reason">Motivo de devolución<input className="field" placeholder="Ej. Cambio de talla" value={reason} onChange={(event) => setReason(event.target.value)} /></label><div className="return-actions"><button className="btn btn-light" type="button" onClick={() => setSelected(null)}>Cancelar</button><button className="btn btn-primary" type="button" onClick={submit} disabled={saving}>{saving ? 'Registrando…' : 'Confirmar devolución'}</button></div></section>}
    <section className="returns-section"><div className="section-heading"><div><p className="section-eyebrow">Revisión de tickets</p><h2>Ventas disponibles</h2></div><span className="subtle-chip">{loading ? '…' : `${sales.length} tickets`}</span></div>
      {loading ? <SkeletonStack count={3} /> : sales.length ? <div className="returns-sales-list">{sales.map((sale) => <button className="card return-sale-card" type="button" key={sale.id} onClick={() => { setSelected(sale); setMessage(''); }}><span className="folio-chip">#{sale.folio}</span><span className="return-sale-info"><strong>{money(sale.total)}</strong><small>{new Date(sale.createdAt).toLocaleString('es-MX')} · {sale.lines.length} líneas</small></span><span className={`sale-status ${sale.status === 'CANCELLED' ? 'out' : 'available'}`}>{sale.status === 'CANCELLED' ? 'Cancelada' : 'Confirmada'}</span></button>)}</div> : <div className="surface-state empty-state"><Ticket size={26} aria-hidden="true"/><strong>No encontramos ventas</strong><p>Intenta con otro folio o ID de venta.</p></div>}
    </section>
    <section className="returns-section"><div className="section-heading"><div><p className="section-eyebrow">Historial</p><h2>Devoluciones recientes</h2></div><span className="subtle-chip">{loading ? '…' : `${rows.length} registros`}</span></div>
      {loading ? <SkeletonStack count={2} /> : rows.length ? <div className="returns-history-list">{rows.map((row) => <article className="card returns-history-card" key={row.id}><div className="returns-history-icon" aria-hidden="true"><RotateCcw size={18}/></div><div><strong>Folio #{row.sale.folio} · {money(row.refundAmount)}</strong><small>{row.reason} · {row.user?.name} · {new Date(row.createdAt).toLocaleString('es-MX')}</small></div></article>)}</div> : <div className="surface-state empty-state"><ArrowLeftRight size={26} aria-hidden="true"/><strong>Aún no hay devoluciones registradas</strong></div>}
    </section>
  </>;
}
