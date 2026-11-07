'use client';

import { Barcode, Bookmark, Box, CheckCircle2, ChevronLeft, ChevronRight, CircleAlert, Download, Eye, Package, Plus, Printer, RefreshCw, Search, SlidersHorizontal, Store, TriangleAlert } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useMemo, useRef, useState } from 'react';
import { InventoryMutationDialog } from './InventoryMutationDialog';

export type InventoryRow = {
  id: string;
  sku: string;
  barcode?: string | null;
  size?: string | null;
  color?: string | null;
  stock: string;
  cost?: string;
  price?: string;
  available: string;
  reserved: string;
  physical: string;
  lowStockThreshold: string;
  product: { id: string; name: string; photoPath?: string | null; location: string; category?: { id: string; name: string } | null };
};
type Role = 'ADMIN' | 'INVENTORY_MANAGER' | 'SELLER';
type Filter = 'ALL' | 'AVAILABLE' | 'LOW' | 'OUT' | 'RESERVED';
type MutationType = 'PURCHASE' | 'ADJUSTMENT_IN' | 'ADJUSTMENT_OUT';

const number = (value: string | number) => Number(value || 0).toLocaleString('es-MX', { maximumFractionDigits: 2 });
const read = async (response: Response) => { const body = await response.json().catch(() => ({})); if (!response.ok) throw new Error(body.error || `La solicitud terminó con ${response.status}.`); return body; };

export function InventoryPage({ role, branchName = '' }: { role: Role; branchName?: string }) {
  const [rows, setRows] = useState<InventoryRow[]>([]);
  const [query, setQuery] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [quickFilter, setQuickFilter] = useState<Filter>('ALL');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(5);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [mutationType, setMutationType] = useState<MutationType>('PURCHASE');
  const [dialog, setDialog] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const canMutate = role !== 'SELLER';

  async function load() {
    setLoading(true);
    setError('');
    try {
      setRows(await read(await fetch('/api/inventory')));
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'No se pudo cargar el inventario.');
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => { void load(); }, []);
  useEffect(() => {
    const initialSearch = new URLSearchParams(window.location.search).get('search');
    if (initialSearch) setQuery(initialSearch);
  }, []);
  useEffect(() => {
    const syncSearch = (event: Event) => {
      const value = (event as CustomEvent<string>).detail;
      if (typeof value === 'string') {
        setQuery(value);
        setPage(1);
      }
    };
    window.addEventListener('inventory:search', syncSearch);
    return () => window.removeEventListener('inventory:search', syncSearch);
  }, []);

  const categories = useMemo(() => {
    const unique = new Map<string, string>();
    rows.forEach((row) => {
      const category = row.product.category;
      if (category) unique.set(category.id, category.name);
    });
    return [...unique].map(([id, name]) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name, 'es'));
  }, [rows]);
  const totals = useMemo(() => {
    const physical = rows.reduce((sum, row) => sum + Number(row.physical), 0);
    const reserved = rows.reduce((sum, row) => sum + Number(row.reserved), 0);
    const available = rows.reduce((sum, row) => sum + Number(row.available), 0);
    const low = rows.filter((row) => Number(row.available) > 0 && Number(row.available) <= Number(row.lowStockThreshold)).length;
    const out = rows.filter((row) => Number(row.available) === 0).length;
    return { physical, reserved, available, low, out, alerts: low + out };
  }, [rows]);
  const filtered = rows.filter((row) => {
    const needle = query.trim().toLowerCase();
    const matchesSearch = !needle || `${row.product.name} ${row.sku} ${row.barcode ?? ''} ${row.product.location}`.toLowerCase().includes(needle);
    const matchesCategory = !categoryId || row.product.category?.id === categoryId;
    const available = Number(row.available);
    const matchesQuick = quickFilter === 'ALL'
      || quickFilter === 'AVAILABLE' && available > 0
      || quickFilter === 'LOW' && available > 0 && available <= Number(row.lowStockThreshold)
      || quickFilter === 'OUT' && available === 0
      || quickFilter === 'RESERVED' && Number(row.reserved) > 0;
    return matchesSearch && matchesCategory && matchesQuick;
  });
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const pageRows = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  const firstRow = filtered.length ? (currentPage - 1) * pageSize + 1 : 0;
  const lastRow = Math.min(currentPage * pageSize, filtered.length);
  const reservedVariants = rows.filter((row) => Number(row.reserved) > 0).length;

  function openMutation(type: MutationType, trigger: HTMLButtonElement) {
    triggerRef.current = trigger;
    setMutationType(type);
    setDialog(true);
  }
  function exportCsv() {
    const fields = ['Producto', 'Variante', 'SKU', 'Código de barras', 'Categoría', 'Existencia física', 'Apartada', 'Disponible', 'Estado'];
    const escape = (value: unknown) => `"${String(value ?? '').replaceAll('"', '""')}"`;
    const data = [fields, ...filtered.map((row) => {
      const available = Number(row.available);
      const status = available === 0 ? 'Agotado' : available <= Number(row.lowStockThreshold) ? 'Stock bajo' : 'Disponible';
      return [row.product.name, [row.color, row.size].filter(Boolean).join(' / ') || 'Presentación única', row.sku, row.barcode, row.product.category?.name, row.physical, row.reserved, row.available, status];
    })];
    const blob = new Blob([`\uFEFF${data.map((line) => line.map(escape).join(',')).join('\r\n')}`], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = 'inventario-lucem.csv';
    anchor.click();
    URL.revokeObjectURL(url);
  }

  return (
    <section className="inventory-page inventory-general" aria-labelledby="inventory-title">
      <header className="inventory-heading">
        <div><span className="inventory-eyebrow">Control de existencias</span><h1 id="inventory-title">Inventario</h1><p>Control operacional de existencias físicas, apartados y unidades disponibles para venta.</p></div>
        <div className="inventory-heading-actions"><Link className="inventory-kardex-button" href="/inventario/movimientos"><Barcode size={16} aria-hidden="true" />Ver kárdex completo</Link>{canMutate && <><button type="button" className="inventory-adjust-button" onClick={(event) => openMutation('ADJUSTMENT_IN', event.currentTarget)}><SlidersHorizontal size={16} aria-hidden="true" />Realizar ajuste</button><button type="button" className="inventory-primary" aria-label="Registrar movimiento" ref={triggerRef} onClick={(event) => openMutation('PURCHASE', event.currentTarget)}><Plus size={17} aria-hidden="true" />Registrar entrada</button></>}</div>
      </header>

      <section className="inventory-operational-metrics" aria-label="Resumen de inventario">
        <article className="inventory-operational-metric"><div className="inventory-metric-heading"><div><span>¿Cuánto tengo?</span><strong>Existencia física</strong></div><i><Package size={19} aria-hidden="true" /></i></div><div className="inventory-metric-value"><b>{number(totals.physical)}</b><span>pzas</span></div><p><CheckCircle2 size={13} aria-hidden="true" />Conteo real en tienda física</p><div className="inventory-metric-progress"><i style={{ width: '100%' }} /></div></article>
        <article className="inventory-operational-metric inventory-metric-reserved"><div className="inventory-metric-heading"><div><span>¿Cuánto está apartado?</span><strong>Cantidad apartada</strong></div><i><Bookmark size={19} aria-hidden="true" /></i></div><div className="inventory-metric-value"><b>{number(totals.reserved)}</b><span>pzas</span></div><p><Bookmark size={13} aria-hidden="true" />Pedidos y apartados pendientes</p><div className="inventory-metric-progress"><i style={{ width: `${totals.physical ? Math.min(100, totals.reserved / totals.physical * 100) : 0}%` }} /></div></article>
        <article className="inventory-operational-metric inventory-metric-available"><div className="inventory-metric-heading"><div><span>¿Cuánto puedo vender?</span><strong>Existencia disponible</strong></div><i><Store size={19} aria-hidden="true" /></i></div><div className="inventory-metric-value"><b>{number(totals.available)}</b><span>pzas</span></div><p><CheckCircle2 size={13} aria-hidden="true" />Inmediato para mostrador y POS</p><div className="inventory-metric-progress"><i style={{ width: `${totals.physical ? Math.min(100, totals.available / totals.physical * 100) : 0}%` }} /></div></article>
        <article className="inventory-operational-metric inventory-metric-alert"><div className="inventory-metric-heading"><div><span>Atención requerida</span><strong>Alertas activas</strong></div><i><TriangleAlert size={19} aria-hidden="true" /></i></div><div className="inventory-alert-value"><b>{totals.alerts}</b><span>Crítico</span></div><p><i className="inventory-low-dot" />{totals.low} con stock bajo <span>•</span><i className="inventory-out-dot" />{totals.out} agotados</p><div className="inventory-metric-progress"><i style={{ width: `${rows.length ? Math.min(100, totals.alerts / rows.length * 100) : 0}%` }} /></div></article>
      </section>

      <section className="inventory-filter-console" aria-label="Filtros de inventario">
        <div className="inventory-filter-top-row">
          <label className="inventory-search"><Search size={18} aria-hidden="true" /><span className="sr-only">Buscar inventario</span><input aria-label="Buscar inventario" placeholder="Buscar por producto, SKU o código de barras (ej. PLY-BAS)..." value={query} onChange={(event) => { setQuery(event.target.value); setPage(1); window.dispatchEvent(new CustomEvent('operation-search-sync', { detail: event.target.value })); }} /><kbd>⌘K</kbd></label>
          <label className="inventory-category-select"><Package size={16} aria-hidden="true" /><span className="sr-only">Filtrar por categoría</span><select aria-label="Filtrar por categoría" value={categoryId} onChange={(event) => { setCategoryId(event.target.value); setPage(1); }}><option value="">Todas las categorías</option>{categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select></label>
          <div className="inventory-export-actions"><button type="button" onClick={exportCsv}><Download size={16} aria-hidden="true" />Exportar</button><button type="button" aria-label="Imprimir inventario" title="Imprimir inventario" onClick={() => window.print()}><Printer size={16} aria-hidden="true" /></button></div>
        </div>
        <div className="inventory-quick-filters" role="group" aria-label="Filtrar por disponibilidad">
          <span>Filtrar por:</span>
          <button type="button" aria-pressed={quickFilter === 'ALL'} className={quickFilter === 'ALL' ? 'is-selected' : ''} onClick={() => { setQuickFilter('ALL'); setPage(1); }}>Todos ({rows.length})</button>
          <button type="button" aria-pressed={quickFilter === 'AVAILABLE'} className={quickFilter === 'AVAILABLE' ? 'is-selected' : ''} onClick={() => { setQuickFilter('AVAILABLE'); setPage(1); }}><i className="inventory-status-dot is-available" />Disponible ({rows.filter((row) => Number(row.available) > 0).length})</button>
          <button type="button" aria-pressed={quickFilter === 'LOW'} className={quickFilter === 'LOW' ? 'is-selected' : ''} onClick={() => { setQuickFilter('LOW'); setPage(1); }}><i className="inventory-status-dot is-low" />Stock bajo (&lt; 10) ({totals.low})</button>
          <button type="button" aria-pressed={quickFilter === 'OUT'} className={quickFilter === 'OUT' ? 'is-selected' : ''} onClick={() => { setQuickFilter('OUT'); setPage(1); }}><i className="inventory-status-dot is-out" />Agotado (0) ({totals.out})</button>
          <button type="button" aria-pressed={quickFilter === 'RESERVED'} className={quickFilter === 'RESERVED' ? 'is-selected' : ''} onClick={() => { setQuickFilter('RESERVED'); setPage(1); }}><Bookmark size={12} aria-hidden="true" />Con apartados ({reservedVariants})</button>
          <span className="inventory-showing">Mostrando <strong>{Math.min(pageSize, filtered.length)}</strong> de {filtered.length} registros</span>
        </div>
      </section>

      {error && <div className="inventory-alert" role="alert"><CircleAlert size={18} /><span>{error}</span><button type="button" onClick={() => void load()}><RefreshCw size={16} />Reintentar</button></div>}
      {loading ? <div className="inventory-loading" role="status">Cargando inventario...</div> : filtered.length === 0 ? <div className="inventory-empty"><Package size={40} /><h2>{rows.length ? 'No hay coincidencias' : 'No hay inventario'}</h2><p>{rows.length ? 'Prueba con otra búsqueda o filtro.' : 'Las variantes activas aparecerán aquí.'}</p></div> : (
        <section className="inventory-general-table" aria-label="Existencias por producto y variante">
          <div className="inventory-general-table-scroll"><table><thead><tr><th>Producto y variante</th><th>SKU / Cód. barras</th><th>Categoría</th><th>Existencia física</th><th>Apartada</th><th>Existencia disponible</th><th>Estado / alertas</th><th>Acciones rápidas</th></tr></thead><tbody>{pageRows.map((row) => {
            const available = Number(row.available);
            const low = available > 0 && available <= Number(row.lowStockThreshold);
            const out = available === 0;
            const variant = [row.color, row.size].filter(Boolean).join(' / ') || 'Presentación única';
            return <tr key={row.id} className={low ? 'is-low-stock' : out ? 'is-out-stock' : ''}>
              <td><div className="inventory-product-cell">{row.product.photoPath ? <img src={row.product.photoPath} alt="" /> : <span className="inventory-product-placeholder"><Package size={18} aria-hidden="true" /></span>}<div><strong>{row.product.name}</strong><span>{variant}</span></div></div></td>
              <td className="inventory-sku-cell"><strong>{row.sku}</strong><small><Barcode size={12} aria-hidden="true" />{row.barcode || 'Sin código'}</small></td>
              <td><span className="inventory-category-tag">{row.product.category?.name || 'Sin categoría'}</span></td>
              <td className="inventory-amount-cell">{number(row.physical)} <small>pzas</small></td>
              <td className={Number(row.reserved) > 0 ? 'inventory-reserved-cell' : 'inventory-amount-cell'}>{Number(row.reserved) > 0 && <Bookmark size={12} aria-hidden="true" />}{number(row.reserved)} <small>pzas</small></td>
              <td className={`inventory-available-cell ${out ? 'is-out' : low ? 'is-low' : ''}`}>{number(row.available)} <small>pzas</small></td>
              <td><span className={`inventory-general-status ${out ? 'is-out' : low ? 'is-low' : 'is-available'}`}><i />{out ? 'Agotado' : low ? 'Stock bajo' : 'Normal'}</span></td>
              <td><div className="inventory-row-actions"><Link href={`/inventario/${row.id}`} aria-label={`Ver detalle de ${row.product.name} ${row.sku}`}>Ver detalle</Link>{canMutate && <><button type="button" onClick={(event) => openMutation('PURCHASE', event.currentTarget)}>+ Entrada</button><button type="button" aria-label={`Ajustar ${row.product.name} ${row.sku}`} onClick={(event) => openMutation('ADJUSTMENT_IN', event.currentTarget)}><SlidersHorizontal size={15} aria-hidden="true" /></button></>}</div></td>
            </tr>;
          })}</tbody></table></div>
          <footer className="inventory-table-footer"><p><CheckCircle2 size={14} aria-hidden="true" />Fórmula operativa: <strong>Existencia disponible</strong> = Existencia física − Cantidad apartada.</p><div><label>Filas por página:<select aria-label="Filas por página" value={pageSize} onChange={(event) => { setPageSize(Number(event.target.value)); setPage(1); }}><option value="5">5</option><option value="10">10</option><option value="25">25</option><option value="50">50</option></select></label><span>{firstRow}-{lastRow} de {filtered.length}</span><button type="button" aria-label="Página anterior" disabled={currentPage <= 1} onClick={() => setPage((value) => Math.max(1, value - 1))}><ChevronLeft size={16} /></button><strong>{currentPage}</strong><button type="button" aria-label="Página siguiente" disabled={currentPage >= totalPages} onClick={() => setPage((value) => Math.min(totalPages, value + 1))}><ChevronRight size={16} /></button></div></footer>
        </section>
      )}

      <section className="inventory-shortcuts" aria-label="Accesos de inventario">
        <Link href="/inventario/movimientos"><i><Barcode size={18} /></i><span><strong>Auditoría rápida con escáner</strong><small>Revisar movimientos del inventario</small></span><ChevronRight size={17} /></Link>
        <Link href="/inventario/movimientos"><i><RefreshCw size={18} /></i><span><strong>Traspaso entre sucursales</strong><small>Ver el historial de existencias</small></span><ChevronRight size={17} /></Link>
        <Link href="/apartados"><i><Bookmark size={18} /></i><span><strong>Módulo de apartados activos</strong><small>{reservedVariants} variantes con existencias reservadas</small></span><ChevronRight size={17} /></Link>
      </section>

      {dialog && canMutate && <InventoryMutationDialog variants={rows} initialType={mutationType} branchName={branchName} returnFocusRef={triggerRef} onClose={() => setDialog(false)} onSaved={() => { setDialog(false); void load(); }} onConflict={() => void load()} />}
    </section>
  );
}
