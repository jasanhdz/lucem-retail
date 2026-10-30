'use client';
import { useEffect, useState } from 'react';
import { Header, DataList } from '@/components/Screen';

export default function Inventory() {
  const [rows, setRows] = useState<any[] | null>(null), [form, setForm] = useState({ variantId: '', quantity: '1', type: 'PURCHASE', reason: '' }), [message, setMessage] = useState('');
  function load() { fetch('/api/inventory').then((r) => r.json()).then(setRows); }
  useEffect(load, []);
  async function movement(event: React.FormEvent) { event.preventDefault(); const response = await fetch('/api/inventory', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) }); const data = await response.json(); setMessage(response.ok ? `Movimiento registrado. Stock: ${data.stock}` : data.error); if (response.ok) { setForm({ ...form, quantity: '1', reason: '' }); load(); } }
  return <><Header title="Inventario" kicker="Existencias y movimientos" />
    <div className="card" style={{ padding: 20, marginBottom: 18 }}><h2 style={{ marginTop: 0 }}>Registrar movimiento</h2><form onSubmit={movement} style={{ display: 'grid', gap: 10, gridTemplateColumns: 'repeat(auto-fit,minmax(180px,1fr))' }}><select className="field" required value={form.variantId} onChange={(e) => setForm({ ...form, variantId: e.target.value })}><option value="">Variante</option>{rows?.map((row) => <option key={row.id} value={row.id}>{row.product.name} / {row.sku}</option>)}</select><select className="field" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}><option value="PURCHASE">Entrada</option><option value="ADJUSTMENT_IN">Ajuste positivo</option><option value="ADJUSTMENT_OUT">Ajuste negativo</option></select><input className="field" required type="number" min="0.01" step="0.01" value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} /><input className="field" required placeholder="Motivo" value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} /><button className="btn btn-primary">Registrar</button></form>{message && <p className="muted">{message}</p>}</div>
    <DataList url="/api/inventory" render={(v: any) => <div style={{ display: 'flex', justifyContent: 'space-between' }}><span><strong>{v.product.name}</strong><div className="muted">{v.sku} · {v.location ?? 'Sin ubicación'}</div></span><span className={Number(v.stock) === 0 ? 'badge' : ''}>{v.stock} uds.</span></div>} empty="No hay variantes en inventario." />
  </>;
}
