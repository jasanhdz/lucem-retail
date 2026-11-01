'use client';

import { useEffect, useState } from 'react';
import { Header, money } from '@/components/Screen';
import { SkeletonStack } from '@/components/Skeleton';
import { ClipboardList, Plus, ShoppingBag } from 'lucide-react';

type Reservation = { id: string; variant: { sku: string; product: { name: string } }; customerName?: string | null; quantity: string; deposit?: string | null; expiresAt: string; status: string; notes?: string | null };
type Variant = { id: string; sku: string; stock: string; product: { name: string } };

export default function Reservations() {
  const [products, setProducts] = useState<Variant[]>([]);
  const [rows, setRows] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ variantId: '', quantity: '1', expiresAt: '', customerName: '', deposit: '', notes: '' });
  const [message, setMessage] = useState('');

  async function load() {
    setLoading(true);
    try {
      const [productResponse, reservationResponse] = await Promise.all([fetch('/api/products?available=true'), fetch('/api/reservations')]);
      if (!productResponse.ok || !reservationResponse.ok) throw new Error('No se pudieron cargar los apartados.');
      setProducts(await productResponse.json());
      setRows(await reservationResponse.json());
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Error al cargar datos.'); }
    finally { setLoading(false); }
  }
  useEffect(() => { void load(); }, []);

  async function create(event: React.FormEvent) {
    event.preventDefault(); setSaving(true); setMessage('');
    try {
      const response = await fetch('/api/reservations', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...form, expiresAt: new Date(form.expiresAt).toISOString() }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      setMessage('Apartado creado correctamente.');
      setForm({ variantId: '', quantity: '1', expiresAt: '', customerName: '', deposit: '', notes: '' });
      await load();
    } catch (error) { setMessage(error instanceof Error ? error.message : 'No fue posible crear el apartado.'); }
    finally { setSaving(false); }
  }

  async function action(id: string, actionName: 'release' | 'convert') {
    if (!confirm(actionName === 'release' ? '¿Liberar este apartado y devolver existencia?' : '¿Convertir este apartado?')) return;
    const response = await fetch(`/api/reservations/${id}/${actionName}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ confirmation: true }) });
    const result = await response.json();
    setMessage(response.ok ? actionName === 'release' ? 'Apartado liberado.' : 'Apartado convertido.' : result.error);
    await load();
  }

  const active = rows.filter((row) => row.status === 'ACTIVE').length;
  return <>
    <Header title="Apartados" kicker="Reservas de clientes" />
    <section className="reservation-overview" aria-label="Resumen de apartados"><article><ClipboardList size={17} aria-hidden="true"/><span>Activos</span><strong>{loading ? '…' : active}</strong></article><article><ShoppingBag size={17} aria-hidden="true"/><span>Unidades reservadas</span><strong>{loading ? '…' : rows.filter((row) => row.status === 'ACTIVE').reduce((total, row) => total + Number(row.quantity), 0)}</strong></article><article><ClipboardList size={17} aria-hidden="true"/><span>Vencimientos</span><strong>{loading ? '…' : rows.filter((row) => row.status === 'ACTIVE').length ? 'Revisar' : '—'}</strong></article></section>
    <section className="card reservation-create-card"><div className="section-heading"><div><p className="section-eyebrow">Reserva de mercancía</p><h2>Nuevo apartado</h2></div><span className="subtle-chip">El stock se reserva al confirmar</span></div>
      <form className="reservation-form-grid" onSubmit={create}>
        <label className="form-label reservation-product-field">Producto / SKU<select className="field" required value={form.variantId} onChange={(event) => setForm({ ...form, variantId: event.target.value })}><option value="">Selecciona producto</option>{products.map((variant) => <option key={variant.id} value={variant.id}>{variant.product.name} / {variant.sku} · {variant.stock} disp.</option>)}</select></label>
        <label className="form-label">Cantidad<input className="field" required type="number" min="0.01" step="0.01" value={form.quantity} onChange={(event) => setForm({ ...form, quantity: event.target.value })} /></label>
        <label className="form-label">Vence el<input className="field" required type="datetime-local" value={form.expiresAt} onChange={(event) => setForm({ ...form, expiresAt: event.target.value })} /></label>
        <label className="form-label">Cliente (opcional)<input className="field" placeholder="Nombre del cliente" value={form.customerName} onChange={(event) => setForm({ ...form, customerName: event.target.value })} /></label>
        <label className="form-label">Anticipo<input className="field" type="number" min="0" step="0.01" placeholder="$0.00" value={form.deposit} onChange={(event) => setForm({ ...form, deposit: event.target.value })} /></label>
        <label className="form-label reservation-notes-field">Notas<input className="field" placeholder="Notas para el equipo" value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} /></label>
        <button className="btn btn-primary" disabled={saving}><Plus size={16}/>{saving ? 'Guardando…' : 'Crear apartado'}</button>
      </form>
      {message && <p className="form-feedback" role="status">{message}</p>}
    </section>
    <section className="reservation-list-section"><div className="section-heading"><div><p className="section-eyebrow">Seguimiento</p><h2>Apartados recientes</h2></div><span className="subtle-chip">{loading ? '…' : `${rows.length} registros`}</span></div>
      {loading ? <SkeletonStack count={3} /> : rows.length ? <div className="reservation-list">{rows.map((row) => <article className="card reservation-card" key={row.id}>
        <div className="reservation-main"><div className="reservation-icon" aria-hidden="true"><ClipboardList size={18}/></div><div className="reservation-info"><strong>{row.variant.product.name}</strong><div className="inventory-meta"><span className="sku-chip">{row.variant.sku}</span><span>{row.customerName || 'Sin cliente'}</span></div><small>{row.quantity} uds. · vence {new Date(row.expiresAt).toLocaleString('es-MX')}{row.deposit ? ` · anticipo ${money(row.deposit)}` : ''}</small></div><span className={`reservation-status ${row.status.toLowerCase()}`}>{row.status === 'ACTIVE' ? 'Activo' : row.status === 'RELEASED' ? 'Liberado' : row.status === 'CONVERTED' ? 'Convertido' : 'Vencido'}</span></div>
        {row.notes && <p className="reservation-notes">{row.notes}</p>}
        {row.status === 'ACTIVE' && <div className="reservation-actions"><button className="btn btn-light" type="button" onClick={() => action(row.id, 'release')}>Liberar apartado</button><button className="btn btn-primary" type="button" onClick={() => action(row.id, 'convert')}>Convertir a venta</button></div>}
      </article>)}</div> : <div className="surface-state empty-state"><ClipboardList size={26} aria-hidden="true"/><strong>No hay apartados activos</strong><p>Al crear uno, aparecerá aquí para darle seguimiento.</p></div>}
    </section>
  </>;
}
