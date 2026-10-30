'use client';
import { useEffect, useState } from 'react';
import { Header, DataList, money } from '@/components/Screen';

const initial = { name: '', categoryId: '', location: '', sku: '', barcode: '', size: '', color: '', cost: '', price: '', promoPrice: '', stock: '', lowStockThreshold: '1' };

export default function Products() {
  const [form, setForm] = useState(initial), [categories, setCategories] = useState<any[]>([]), [query, setQuery] = useState(''), [message, setMessage] = useState(''), [refresh, setRefresh] = useState(0);
  useEffect(() => { fetch('/api/categories').then((r) => r.json()).then(setCategories); }, []);
  async function create(event: React.FormEvent) {
    event.preventDefault(); setMessage('');
    const response = await fetch('/api/products', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
    const data = await response.json();
    setMessage(response.ok ? 'Producto creado correctamente.' : data.error || 'No fue posible crear el producto.');
    if (response.ok) { setForm(initial); setRefresh((value) => value + 1); }
  }
  return <><Header title="Productos" kicker="Catálogo y variantes" />
    <div className="card" style={{ padding: 20, marginBottom: 18 }}><h2 style={{ marginTop: 0 }}>Nuevo producto</h2><form onSubmit={create} style={{ display: 'grid', gap: 10, gridTemplateColumns: 'repeat(auto-fit,minmax(170px,1fr))' }}>
      <input className="field" required placeholder="Nombre" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
      <select className="field" required value={form.categoryId} onChange={(e) => setForm({ ...form, categoryId: e.target.value })}><option value="">Categoría</option>{categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select>
      <input className="field" required placeholder="SKU" value={form.sku} onChange={(e) => setForm({ ...form, sku: e.target.value })} /><input className="field" placeholder="Código de barras" value={form.barcode} onChange={(e) => setForm({ ...form, barcode: e.target.value })} />
      <input className="field" placeholder="Talla" value={form.size} onChange={(e) => setForm({ ...form, size: e.target.value })} /><input className="field" placeholder="Color" value={form.color} onChange={(e) => setForm({ ...form, color: e.target.value })} /><input className="field" placeholder="Ubicación" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} />
      <input className="field" required type="number" min="0" step="0.01" placeholder="Costo" value={form.cost} onChange={(e) => setForm({ ...form, cost: e.target.value })} /><input className="field" required type="number" min="0" step="0.01" placeholder="Precio" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} /><input className="field" type="number" min="0" step="0.01" placeholder="Precio promo" value={form.promoPrice} onChange={(e) => setForm({ ...form, promoPrice: e.target.value })} />
      <input className="field" required type="number" min="0" step="0.01" placeholder="Stock inicial" value={form.stock} onChange={(e) => setForm({ ...form, stock: e.target.value })} /><input className="field" required type="number" min="0" step="0.01" placeholder="Límite bajo" value={form.lowStockThreshold} onChange={(e) => setForm({ ...form, lowStockThreshold: e.target.value })} /><button className="btn btn-primary">Crear producto</button>
    </form>{message && <p className="muted">{message}</p>}</div>
    <div className="card" style={{ padding: 18, marginBottom: 18 }}><input className="field" placeholder="Buscar por nombre o SKU..." value={query} onChange={(e) => setQuery(e.target.value)} /></div>
    <DataList key={`${query}-${refresh}`} url={`/api/products?q=${encodeURIComponent(query)}`} render={(v: any) => <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}><div><strong>{v.product.name}</strong><div className="muted">{v.sku} · {v.size ?? 'Talla única'} {v.color ?? ''}</div></div><div style={{ textAlign: 'right' }}><strong>{money(v.promoPrice ?? v.price)}</strong><div className="muted">Stock: {v.stock}</div></div></div>} />
  </>;
}
