'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Header, money } from '@/components/Screen';

type Variant = { id?: string; sku: string; barcode: string; size: string; color: string; cost: string; price: string; promoPrice: string; stock: string; lowStockThreshold: string };
type Product = { id: string; name: string; photoPath: string | null; location: string; category: { id: string; name: string } | null; variants: any[] };
const blankVariant = (): Variant => ({ sku: '', barcode: '', size: '', color: '', cost: '', price: '', promoPrice: '', stock: '0', lowStockThreshold: '1' });
const blankForm = () => ({ name: '', categoryId: '', location: '', photoPath: '', variants: [blankVariant()] as Variant[] });

function StockBadge({ stock, threshold }: { stock: number; threshold: number }) {
  const state = stock <= 0 ? 'Agotado' : stock <= threshold ? 'Por agotarse' : 'Disponible';
  return <span className={`catalog-badge ${stock <= 0 ? 'out' : stock <= threshold ? 'low' : 'available'}`}><i />{state}</span>;
}

function ProductImage({ src, name, className = '' }: { src?: string | null; name: string; className?: string }) {
  const [failed, setFailed] = useState(false);
  if (!src || failed) return <div className={`catalog-placeholder ${className}`} role="img" aria-label={`Sin imagen para ${name}`}>◇<small>Sin imagen</small></div>;
  return <img className={className} src={src} alt={name} loading="lazy" referrerPolicy="no-referrer" onError={() => setFailed(true)} />;
}

function trapDialogFocus(event: React.KeyboardEvent<HTMLDialogElement>) {
  if (event.key !== 'Tab') return;
  const elements = [...event.currentTarget.querySelectorAll<HTMLElement>('a[href],button:not(:disabled),input:not(:disabled):not([type="hidden"]),select:not(:disabled),textarea:not(:disabled),[tabindex]:not([tabindex="-1"])')].filter((element) => element.getClientRects().length > 0);
  const first = elements[0];
  const last = elements[elements.length - 1];
  if (!first || !last) return;
  if (event.shiftKey && (document.activeElement === first || document.activeElement === event.currentTarget)) { event.preventDefault(); last.focus(); }
  else if (!event.shiftKey && (document.activeElement === last || document.activeElement === event.currentTarget)) { event.preventDefault(); first.focus(); }
}

export default function Products() {
  const [items, setItems] = useState<any[] | null>(null);
  const [categories, setCategories] = useState<any[]>([]);
  const [query, setQuery] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');
  const [refresh, setRefresh] = useState(0);
  const [form, setForm] = useState(blankForm);
  const [editing, setEditing] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [formError, setFormError] = useState('');
  const [selected, setSelected] = useState<Product | null>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [detailError, setDetailError] = useState('');
  const [preview, setPreview] = useState('');
  const fileInput = useRef<HTMLInputElement>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const detailRef = useRef<HTMLDialogElement>(null);
  const openerRef = useRef<HTMLElement | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);

  useEffect(() => { fetch('/api/categories').then((r) => r.ok ? r.json() : Promise.reject()).then(setCategories).catch(() => setError('No se pudieron cargar las categorías.')); }, []);
  useEffect(() => {
    let active = true;
    setItems(null); setError('');
    const params = new URLSearchParams();
    if (query.trim()) params.set('q', query.trim());
    if (categoryId) params.set('categoryId', categoryId);
    if (status === 'out' || status === 'low') params.set('status', status);
    fetch(`/api/products?${params}`).then((response) => response.ok ? response.json() : Promise.reject(new Error('No se pudo cargar el catálogo.'))).then((data) => { if (active) setItems(data); }).catch((reason) => { if (active) { setError(reason.message || 'Error de conexión al cargar productos.'); setItems([]); } });
    return () => { active = false; };
  }, [query, categoryId, status, refresh]);

  const products = useMemo(() => {
    const grouped = new Map<string, Product>();
    for (const variant of items ?? []) {
      if (status === 'available' && (Number(variant.stock) <= 0 || Number(variant.stock) <= Number(variant.lowStockThreshold))) continue;
      let product = grouped.get(variant.product.id);
      if (!product) {
        const created: Product = { ...variant.product, variants: [] };
        grouped.set(created.id, created);
        product = created;
      }
      product.variants.push(variant);
    }
    return [...grouped.values()];
  }, [items, status]);

  function openForm(trigger: HTMLElement, product?: Product) {
    openerRef.current = trigger;
    setFormError(''); setEditing(product?.id ?? null);
    if (product) {
      setForm({ name: product.name, categoryId: product.category?.id ?? '', location: product.location ?? '', photoPath: product.photoPath ?? '', variants: product.variants.map((v) => ({ id: v.id, sku: v.sku, barcode: v.barcode ?? '', size: v.size ?? '', color: v.color ?? '', cost: String(v.cost), price: String(v.price), promoPrice: v.promoPrice ?? '', stock: String(v.stock), lowStockThreshold: String(v.lowStockThreshold) })) });
      setPreview(product.photoPath ?? '');
    } else if (!form.name && !form.variants.some((v) => v.sku || v.cost || v.price)) { setForm(blankForm()); setPreview(''); }
    setDialogOpen(true);
  }
  useEffect(() => {
    if (dialogOpen && dialogRef.current && !dialogRef.current.open) dialogRef.current.showModal();
    if (!dialogOpen && dialogRef.current?.open) dialogRef.current.close();
  }, [dialogOpen]);
  useEffect(() => {
    if (detailOpen && detailRef.current && !detailRef.current.open) detailRef.current.showModal();
    if (!detailOpen && detailRef.current?.open) detailRef.current.close();
  }, [detailOpen]);
  function closeForm() { setDialogOpen(false); requestAnimationFrame(() => openerRef.current?.focus()); }
  function closeDetail() { setDetailOpen(false); requestAnimationFrame(() => openerRef.current?.focus()); }

  async function showDetail(product: Product, trigger: HTMLElement) {
    openerRef.current = trigger; setDetailError(''); setSelected(product); setHistory([]); setDetailOpen(true);
    try {
      const [detailResponse, historyResponse] = await Promise.all([fetch(`/api/products/${product.id}`), fetch(`/api/products/${product.id}/history`)]);
      if (!detailResponse.ok) throw new Error('No se pudo cargar el detalle.');
      setSelected(await detailResponse.json());
      if (historyResponse.ok) setHistory(await historyResponse.json());
    } catch (reason) { setDetailError(reason instanceof Error ? reason.message : 'Error al cargar detalle.'); }
  }

  async function uploadImage(file?: File) {
    if (!file) return;
    if (!['image/jpeg', 'image/png', 'image/webp', 'image/gif'].includes(file.type) || file.size > 5 * 1024 * 1024) { setFormError('Usa JPEG, PNG, WebP o GIF de hasta 5 MB.'); return; }
    const local = URL.createObjectURL(file); setPreview(local); setFormError('');
    const data = new FormData(); data.set('file', file);
    setUploading(true);
    try {
      const response = await fetch('/api/products/image', { method: 'POST', body: data });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'No fue posible subir la imagen.');
      setForm((current) => ({ ...current, photoPath: result.photoPath })); setPreview(result.photoPath);
    } catch (reason) { URL.revokeObjectURL(local); setPreview(form.photoPath); setFormError(reason instanceof Error ? reason.message : 'Error al cargar imagen.'); }
    finally { setUploading(false); }
  }

  async function save(event: React.FormEvent) {
    event.preventDefault(); setSaving(true); setFormError('');
    try {
      const payload = { ...form, variants: form.variants.map((variant) => ({ ...variant, cost: Number(variant.cost), price: Number(variant.price), stock: Number(variant.stock), lowStockThreshold: Number(variant.lowStockThreshold) })) };
      const response = await fetch(editing ? `/api/products/${editing}` : '/api/products', { method: editing ? 'PUT' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'No fue posible guardar el producto.');
      closeForm(); setRefresh((value) => value + 1);
      if (selected?.id === editing) setDetailOpen(false);
    } catch (reason) { setFormError(reason instanceof Error ? reason.message : 'Error al guardar.'); }
    finally { setSaving(false); }
  }

  function changeVariant(index: number, field: keyof Variant, value: string) {
    setForm((current) => ({ ...current, variants: current.variants.map((variant, i) => i === index ? { ...variant, [field]: value } : variant) }));
  }

  return <>
    <Header title="Productos" kicker="Catálogo y variantes" />
    <main className="catalog-page">
      <section className="catalog-heading"><div><p className="catalog-eyebrow">Inventario de tienda</p><h2>Catálogo de productos</h2><p className="muted">{products.length} productos en el catálogo</p></div><button className="btn btn-primary catalog-add" onClick={(event) => openForm(event.currentTarget)} type="button">＋ <span>Nuevo producto</span></button></section>
      <section className="catalog-filters" aria-label="Filtros de productos">
        <label className="catalog-search"><span aria-hidden="true">⌕</span><input className="field" aria-label="Buscar productos" placeholder="Buscar por nombre, SKU o ubicación" value={query} onChange={(event) => setQuery(event.target.value)} /><button type="button" aria-label="Limpiar búsqueda" onClick={() => setQuery('')}>×</button></label>
        <label className="catalog-filter-label">Categoría<select className="field" aria-label="Filtrar por categoría" value={categoryId} onChange={(event) => setCategoryId(event.target.value)}><option value="">Todas las categorías</option>{categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select></label>
        <label className="catalog-filter-label">Estado<select className="field" aria-label="Filtrar por estado" value={status} onChange={(event) => setStatus(event.target.value)}><option value="">Todos los estados</option><option value="available">Disponible</option><option value="low">Por agotarse</option><option value="out">Agotado</option></select></label>
        {(query || categoryId || status) && <button className="catalog-clear" onClick={() => { setQuery(''); setCategoryId(''); setStatus(''); }} type="button">Limpiar filtros</button>}
      </section>
      {items === null ? <p className="catalog-state" role="status">Cargando productos…</p> : error ? <div className="catalog-state catalog-error" role="alert">{error} <button className="btn btn-light" onClick={() => setRefresh((value) => value + 1)} type="button">Reintentar</button></div> : products.length === 0 ? <div className="catalog-state"><span aria-hidden="true">⌕</span><strong>No encontramos productos</strong><p className="muted">Prueba con otra búsqueda o limpia los filtros.</p><button className="btn btn-light" onClick={() => { setQuery(''); setCategoryId(''); setStatus(''); }} type="button">Limpiar filtros</button></div> : <section className="catalog-grid" aria-label="Productos">
        {products.map((product) => {
          const stock = product.variants.reduce((sum, variant) => sum + Number(variant.stock), 0);
          const threshold = product.variants.reduce((sum, variant) => sum + Number(variant.lowStockThreshold), 0);
          const primary = product.variants[0];
          const statusVariants = product.variants.filter((v) => status === 'out' ? Number(v.stock) <= 0 : status === 'low' ? Number(v.stock) > 0 && Number(v.stock) <= Number(v.lowStockThreshold) : status === 'available' ? Number(v.stock) > Number(v.lowStockThreshold) : true);
          if (status && statusVariants.length === 0) return null;
          return <article className="product-card" key={product.id}>
            <button className="product-card-main" type="button" onClick={(event) => showDetail(product, event.currentTarget)} aria-label={`Ver detalle de ${product.name}`}>
              <div className="product-photo-wrap"><ProductImage src={product.photoPath} name={product.name} className="product-photo" /><StockBadge stock={stock} threshold={threshold} /></div>
              <div className="product-content"><div className="product-title-line"><h3>{product.name}</h3><span className="product-category">{product.category?.name ?? 'Sin categoría'}</span></div>
                <p className="product-sku">SKU {product.variants.map((v) => v.sku).join(' · ')}</p><p className="product-location">⌖ {product.location || 'Sin ubicación'}</p>
                <div className="product-prices"><div><strong>{money(primary.promoPrice ?? primary.price)}</strong>{primary.promoPrice && <span className="product-was">{money(primary.price)} · Promo</span>}</div><div className="product-stock"><b>{stock}</b><span> en stock</span></div></div>
              </div>
            </button>
            <footer className="product-actions"><span>{product.variants.length} {product.variants.length === 1 ? 'variante' : 'variantes'}</span><button className="btn btn-light" type="button" onClick={(event) => { event.stopPropagation(); openForm(event.currentTarget, product); }}>Editar</button></footer>
          </article>;
        })}
      </section>}
    </main>

    <dialog ref={dialogRef} className="catalog-dialog" aria-labelledby="product-dialog-title" onKeyDown={trapDialogFocus} onCancel={(event) => { event.preventDefault(); closeForm(); }} onClose={() => { if (dialogOpen) setDialogOpen(false); }}>
      <form className="catalog-dialog-form" onSubmit={save}>
        <header className="catalog-dialog-header"><div><p className="catalog-eyebrow">Catálogo</p><h2 id="product-dialog-title">{editing ? 'Editar producto' : 'Nuevo producto'}</h2></div><button className="catalog-icon-button" type="button" aria-label="Cerrar formulario" onClick={closeForm}>×</button></header>
        <div className="catalog-dialog-body">
          <div className="catalog-form-row product-basics"><label className="catalog-field">Nombre del producto<input className="field" required value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} /></label><label className="catalog-field">Categoría<select className="field" required value={form.categoryId} onChange={(event) => setForm({ ...form, categoryId: event.target.value })}><option value="">Selecciona categoría</option>{categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select></label><label className="catalog-field">Ubicación<input className="field" value={form.location} placeholder="Ej. Estante B-2" onChange={(event) => setForm({ ...form, location: event.target.value })} /></label></div>
          <div className="catalog-photo-field"><ProductImage src={preview} name={form.name || 'Producto'} className="catalog-preview" /><div><strong>Foto del producto</strong><p className="muted">JPEG, PNG, WebP o GIF · máximo 5 MB</p><button type="button" className="btn btn-light" onClick={() => fileInput.current?.click()}>Elegir imagen</button><input ref={fileInput} type="file" accept="image/jpeg,image/png,image/webp,image/gif" hidden onChange={(event) => uploadImage(event.target.files?.[0])} /></div></div>
          {form.variants.map((variant, index) => <fieldset className="catalog-variant" key={variant.id ?? index}><legend>Variante {index + 1}</legend><div className="catalog-form-row"><label className="catalog-field">SKU<input className="field" required value={variant.sku} onChange={(event) => changeVariant(index, 'sku', event.target.value)} /></label><label className="catalog-field">Código de barras<input className="field" value={variant.barcode} onChange={(event) => changeVariant(index, 'barcode', event.target.value)} /></label></div>
            <div className="catalog-form-row three"><label className="catalog-field">Talla<input className="field" value={variant.size} onChange={(event) => changeVariant(index, 'size', event.target.value)} /></label><label className="catalog-field">Color<input className="field" value={variant.color} onChange={(event) => changeVariant(index, 'color', event.target.value)} /></label><label className="catalog-field">Stock inicial<input className="field" required type="number" min="0" step="0.01" value={variant.stock} disabled={Boolean(editing && variant.id)} onChange={(event) => changeVariant(index, 'stock', event.target.value)} /></label></div>
            <div className="catalog-form-row three"><label className="catalog-field">Costo<input className="field" required type="number" min="0" step="0.01" value={variant.cost} onChange={(event) => changeVariant(index, 'cost', event.target.value)} /></label><label className="catalog-field">Precio normal<input className="field" required type="number" min="0" step="0.01" value={variant.price} onChange={(event) => changeVariant(index, 'price', event.target.value)} /></label><label className="catalog-field">Precio promocional<input className="field" type="number" min="0" step="0.01" value={variant.promoPrice} onChange={(event) => changeVariant(index, 'promoPrice', event.target.value)} /></label></div>
            <label className="catalog-field catalog-threshold">Límite de stock bajo<input className="field" required type="number" min="0" step="0.01" value={variant.lowStockThreshold} onChange={(event) => changeVariant(index, 'lowStockThreshold', event.target.value)} /></label>
            {form.variants.length > 1 && !variant.id && <button className="catalog-remove" type="button" onClick={() => setForm((current) => ({ ...current, variants: current.variants.filter((_, i) => i !== index) }))}>Quitar variante</button>}
          </fieldset>)}
          <button className="btn btn-light catalog-add-variant" type="button" onClick={() => setForm((current) => ({ ...current, variants: [...current.variants, blankVariant()] }))}>＋ Agregar variante</button>
          {formError && <p className="catalog-form-error" role="alert">{formError}</p>}
        </div>
        <footer className="catalog-dialog-actions"><button className="btn btn-light" type="button" onClick={closeForm}>Cancelar</button><button className="btn btn-primary" disabled={saving || uploading}>{uploading ? 'Cargando imagen…' : saving ? 'Guardando…' : editing ? 'Guardar cambios' : 'Crear producto'}</button></footer>
      </form>
    </dialog>

    <dialog ref={detailRef} className="catalog-dialog detail-dialog" aria-labelledby="product-detail-title" onKeyDown={trapDialogFocus} onCancel={(event) => { event.preventDefault(); closeDetail(); }} onClose={() => { if (detailOpen) setDetailOpen(false); }}>
        {selected && <div className="detail-content"><header className="catalog-dialog-header"><div><p className="catalog-eyebrow">Detalle de producto</p><h2 id="product-detail-title">{selected.name}</h2></div><button className="catalog-icon-button" type="button" aria-label="Cerrar detalle" onClick={closeDetail}>×</button></header><div className="detail-body">
        {detailError ? <p role="alert" className="catalog-form-error">{detailError}</p> : <><ProductImage src={selected.photoPath} name={selected.name} className="detail-photo"/><div className="detail-meta"><p><strong>Categoría</strong><span>{selected.category?.name ?? 'Sin categoría'}</span></p><p><strong>Ubicación</strong><span>{selected.location || 'Sin ubicación'}</span></p></div>
          <h3>Variantes y existencias</h3><div className="detail-variants">{selected.variants?.map((variant: any) => <article key={variant.id}><div><strong>{variant.sku}</strong><span>{[variant.size, variant.color].filter(Boolean).join(' · ') || 'Talla/color sin especificar'}</span><StockBadge stock={Number(variant.stock)} threshold={Number(variant.lowStockThreshold)}/></div><div><strong>{money(variant.promoPrice ?? variant.price)}</strong>{variant.promoPrice && <span className="product-was">Normal {money(variant.price)}</span>}<small>Costo {money(variant.cost)} · Stock {variant.stock}</small></div></article>)}</div>
          <h3>Historial de costo y precio</h3>{history.length ? <div className="detail-history">{history.map((record) => <p key={record.id}><strong>{record.field === 'COST' ? 'Costo' : record.field === 'PRICE' ? 'Precio' : 'Precio promo'}</strong> {record.oldValue ?? '—'} → {record.newValue ?? '—'}<small>{record.user?.name} · {new Date(record.createdAt).toLocaleString('es-MX')}</small></p>)}</div> : <p className="muted">Sin cambios registrados todavía.</p>}
        </>}</div>
        <footer className="catalog-dialog-actions"><button className="btn btn-light" onClick={closeDetail} type="button">Cerrar</button><button className="btn btn-primary" type="button" onClick={(event) => { const trigger = openerRef.current; closeDetail(); if (trigger) requestAnimationFrame(() => openForm(trigger, selected)); }}>Editar producto</button></footer>
      </div>}
    </dialog>
  </>;
}
