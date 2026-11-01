'use client';

import { useEffect, useMemo, useState } from 'react';
import { Header, money, Stat } from '@/components/Screen';
import { SkeletonStack } from '@/components/Skeleton';
import { Boxes, CircleCheck, CircleSlash, MapPin, Plus, Search, TriangleAlert } from 'lucide-react';

type InventoryRow = { id: string; sku: string; size?: string | null; color?: string | null; stock: string; cost: string; lowStockThreshold: string; product: { id: string; name: string; photoPath?: string | null; location?: string; archived?: boolean } };
type Status = 'all' | 'available' | 'low' | 'out';

function stockStatus(row: InventoryRow): Status {
  const stock = Number(row.stock);
  if (stock <= 0) return 'out';
  return stock <= Number(row.lowStockThreshold) ? 'low' : 'available';
}

export default function Inventory() {
  const [rows, setRows] = useState<InventoryRow[] | null>(null);
  const [form, setForm] = useState({ variantId: '', quantity: '1', type: 'PURCHASE', reason: '' });
  const [message, setMessage] = useState('');
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState<Status>('all');
  const [saving, setSaving] = useState(false);

  async function load() {
    try {
      const response = await fetch('/api/inventory');
      if (!response.ok) throw new Error();
      setRows(await response.json());
    } catch { setRows([]); }
  }
  useEffect(() => { void load(); }, []);

  async function movement(event: React.FormEvent) {
    event.preventDefault(); setSaving(true); setMessage('');
    try {
      const response = await fetch('/api/inventory', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
      const data = await response.json();
      setMessage(response.ok ? `Movimiento registrado. Existencia actual: ${data.stock}` : data.error);
      if (response.ok) { setForm((current) => ({ ...current, quantity: '1', reason: '' })); await load(); }
    } catch { setMessage('No fue posible registrar el movimiento.'); }
    finally { setSaving(false); }
  }

  const available = rows?.filter((row) => Number(row.stock) > Number(row.lowStockThreshold)).length ?? 0;
  const low = rows?.filter((row) => Number(row.stock) > 0 && Number(row.stock) <= Number(row.lowStockThreshold)).length ?? 0;
  const out = rows?.filter((row) => Number(row.stock) <= 0).length ?? 0;
  const visible = useMemo(() => (rows ?? []).filter((row) => {
    const matchesQuery = !query || `${row.product.name} ${row.sku} ${row.product.location ?? ''}`.toLowerCase().includes(query.toLowerCase());
    return matchesQuery && (status === 'all' || stockStatus(row) === status);
  }), [rows, query, status]);

  return <>
    <Header title="Inventario" kicker="Existencias y movimientos" />
    <section className="inventory-kpis" aria-label="Resumen de existencias">
      <Stat icon={CircleCheck} label="Disponibles" value={rows ? available : '…'} accent="#006c49" />
      <Stat icon={TriangleAlert} label="Por agotarse" value={rows ? low : '…'} accent="#b87500" />
      <Stat icon={CircleSlash} label="Agotados" value={rows ? out : '…'} accent="#ba1a1a" />
      <Stat icon={Boxes} label="Variantes" value={rows?.length ?? '…'} />
    </section>

    <details className="inventory-form-disclosure">
      <summary className="inventory-form-toggle"><span><small>Control de mercancía</small><strong>Registrar movimiento</strong></span><span className="inventory-toggle-action"><Plus size={16}/><span>Nuevo</span></span></summary>
      <section className="card inventory-form-card">
        <div className="section-heading"><div><p className="section-eyebrow">Movimiento auditable</p><h2>Datos del movimiento</h2></div><span className="subtle-chip">Auditable</span></div>
        <form className="inventory-form" onSubmit={movement}>
          <label className="form-label">Variante<select className="field" required value={form.variantId} onChange={(event) => setForm({ ...form, variantId: event.target.value })}><option value="">Selecciona producto</option>{rows?.map((row) => <option key={row.id} value={row.id}>{row.product.name} / {row.sku}</option>)}</select></label>
          <label className="form-label">Tipo de movimiento<select className="field" value={form.type} onChange={(event) => setForm({ ...form, type: event.target.value })}><option value="PURCHASE">Entrada</option><option value="ADJUSTMENT_IN">Ajuste positivo</option><option value="ADJUSTMENT_OUT">Ajuste negativo</option></select></label>
          <label className="form-label">Cantidad<input className="field" required type="number" min="0.01" step="0.01" value={form.quantity} onChange={(event) => setForm({ ...form, quantity: event.target.value })} /></label>
          <label className="form-label">Motivo<input className="field" required placeholder="Ej. Reposición de mercancía" value={form.reason} onChange={(event) => setForm({ ...form, reason: event.target.value })} /></label>
          <button className="btn btn-primary" disabled={saving}>{saving ? 'Guardando…' : 'Registrar movimiento'}</button>
        </form>
        {message && <p className="form-feedback" role="status">{message}</p>}
      </section>
    </details>

    <section className="inventory-list-section">
      <div className="section-heading inventory-list-heading"><div><p className="section-eyebrow">Estado de existencias</p><h2>Catálogo de inventario</h2></div><span className="subtle-chip">{visible.length} variantes</span></div>
      <div className="inventory-toolbar"><label className="catalog-search inventory-search"><Search size={19} aria-hidden="true"/><input className="field" aria-label="Buscar inventario" placeholder="Buscar por producto, SKU o estante…" value={query} onChange={(event) => setQuery(event.target.value)} /></label>
        <div className="inventory-filter-pills" role="group" aria-label="Filtrar existencias">
          {([['all', `Todos (${rows?.length ?? 0})`], ['available', `Disponibles (${available})`], ['low', `Por agotarse (${low})`], ['out', `Agotados (${out})`]] as [Status, string][]).map(([value, label]) => <button key={value} className={`filter-pill ${status === value ? 'active' : ''}`} onClick={() => setStatus(value)} type="button">{label}</button>)}
        </div>
      </div>
      {rows === null ? <SkeletonStack count={4} className="inventory-skeleton-list" /> : visible.length ? <div className="inventory-list">
        {visible.map((row) => { const state = stockStatus(row); return <article className="inventory-card" key={row.id}>
          <img className="inventory-thumb" src={row.product.photoPath || undefined} alt={row.product.name} loading="lazy" referrerPolicy="no-referrer" onError={(event) => { event.currentTarget.style.visibility = 'hidden'; }} />
          <div className="inventory-card-info"><strong>{row.product.name}</strong><div className="inventory-meta"><span className="sku-chip">{row.sku}</span>{(row.size || row.color) && <span>{[row.size, row.color].filter(Boolean).join(' · ')}</span>}<span className="inventory-location"><MapPin size={12} aria-hidden="true"/>{row.product.location || 'Sin ubicación'}</span></div><div className="inventory-cost">Costo unitario <b>{money(row.cost)}</b></div></div>
          <div className="inventory-stock-box"><div><span className="inventory-stock-label">Existencia real</span><strong className={`stock-number ${state}`}>{row.stock}</strong><small>pzas.</small></div><span className={`stock-state ${state}`}>{state === 'out' ? 'Agotado' : state === 'low' ? 'Por agotarse' : 'Disponible'}</span></div>
        </article>; })}
      </div> : <div className="surface-state empty-state"><Boxes size={26} aria-hidden="true"/><strong>No hay variantes con este filtro</strong><p>Prueba con otra búsqueda o estado.</p><button className="btn btn-light" onClick={() => { setQuery(''); setStatus('all'); }}>Limpiar filtros</button></div>}
    </section>
  </>;
}
