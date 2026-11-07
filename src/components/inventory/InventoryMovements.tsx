'use client';

import { Activity, ArrowDown, ArrowUp, Barcode, Bookmark, CalendarDays, CheckCircle2, ChevronLeft, ChevronRight, CircleAlert, Download, Eye, Package, RefreshCw, Search, ShieldCheck, SlidersHorizontal, UserRound, X } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { Breadcrumbs } from '@/components/Breadcrumbs';

type Movement = {
  id: string;
  type: string;
  quantity: string;
  reason?: string | null;
  referenceType?: string | null;
  referenceId?: string | null;
  createdAt: string;
  user: { name: string };
  variant: { id: string; sku: string; size?: string | null; color?: string | null; product: { id: string; name: string; photoPath?: string | null; category?: { name: string } | null } };
};
type Period = '30d' | '7d' | 'today' | 'month';
type Group = 'ALL' | 'IN' | 'SALE' | 'ADJUSTMENT' | 'RESERVATION' | 'CANCEL';
type MovementSummary = { total: number; byType: { type: string; quantity: string; count: number }[]; users: { id: string; name: string }[] };
type InventorySnapshot = { id: string; physical: string; reserved: string; available: string };

const labels: Record<string, string> = {
  INITIAL: 'Stock inicial', PURCHASE: 'Entrada de mercancía', ADJUSTMENT_IN: 'Ajuste positivo', ADJUSTMENT_OUT: 'Ajuste de stock',
  RESERVATION: 'Apartado registrado', RELEASE: 'Apartado liberado', SALE: 'Venta POS', SALE_CANCEL: 'Cancelación de venta', RETURN: 'Devolución', CORRECTION: 'Corrección',
};
const number = (value: string | number) => Number(value || 0).toLocaleString('es-MX', { maximumFractionDigits: 2 });
const signed = (value: number) => `${value > 0 ? '+' : value < 0 ? '−' : ''}${number(Math.abs(value))}`;
const dateString = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
function periodStart(period: Period) {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  if (period === 'today') return date;
  if (period === 'month') return new Date(date.getFullYear(), date.getMonth(), 1);
  date.setDate(date.getDate() - (period === '7d' ? 6 : 29));
  return date;
}

export function InventoryMovements({ variantId }: { variantId?: string }) {
  const [items, setItems] = useState<Movement[]>([]);
  const [inventory, setInventory] = useState<InventorySnapshot[]>([]);
  const [query, setQuery] = useState('');
  const [group, setGroup] = useState<Group>('ALL');
  const [period, setPeriod] = useState<Period>('30d');
  const [userId, setUserId] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(7);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [summary, setSummary] = useState<MovementSummary>({ total: 0, byType: [], users: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  async function load() {
    setLoading(true);
    setError('');
    const from = dateString(periodStart(period));
    const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize), from, to: dateString(new Date()) });
    if (variantId) params.set('variantId', variantId);
    if (query.trim()) params.set('q', query.trim());
    if (group !== 'ALL') params.set('group', group);
    if (userId) params.set('userId', userId);
    try {
      const response = await fetch(`/api/inventory/movements?${params}`);
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || 'No se pudieron cargar los movimientos.');
      setItems(body.items ?? []);
      setTotal(Number(body.total ?? 0));
      setTotalPages(Number(body.totalPages ?? 1));
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'No se pudieron cargar los movimientos.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void load(); }, [page, pageSize, query, group, period, userId, variantId]);
  useEffect(() => {
    const from = dateString(periodStart(period));
    void Promise.all([
      fetch(`/api/inventory/movements?summary=30d&from=${from}`).then((response) => response.ok ? response.json() : null),
      fetch('/api/inventory').then((response) => response.ok ? response.json() : []),
    ]).then(([stats, rows]) => {
      if (stats) setSummary(stats as MovementSummary);
      setInventory(rows as InventorySnapshot[]);
    }).catch(() => undefined);
  }, [period]);
  useEffect(() => {
    const syncSearch = (event: Event) => {
      const value = (event as CustomEvent<string>).detail;
      if (typeof value === 'string') { setPage(1); setQuery(value); }
    };
    window.addEventListener('inventory-movements:search', syncSearch);
    return () => window.removeEventListener('inventory-movements:search', syncSearch);
  }, []);

  const inventoryByVariant = useMemo(() => new Map(inventory.map((row) => [row.id, row])), [inventory]);
  const byType = useMemo(() => new Map(summary.byType.map((item) => [item.type, item])), [summary]);
  const aggregate = (types: string[]) => types.reduce((totalValue, type) => totalValue + Number(byType.get(type)?.quantity ?? 0), 0);
  const countTypes = (types: string[]) => types.reduce((count, type) => count + Number(byType.get(type)?.count ?? 0), 0);
  const incoming = aggregate(['INITIAL', 'PURCHASE', 'ADJUSTMENT_IN']);
  const salesOut = aggregate(['SALE']);
  const adjustmentOut = aggregate(['ADJUSTMENT_OUT', 'CORRECTION']);
  const summaryCount = (group === 'ALL' ? summary.total : group === 'IN' ? countTypes(['INITIAL', 'PURCHASE', 'ADJUSTMENT_IN']) : group === 'SALE' ? countTypes(['SALE']) : group === 'ADJUSTMENT' ? countTypes(['ADJUSTMENT_IN', 'ADJUSTMENT_OUT', 'CORRECTION']) : group === 'RESERVATION' ? countTypes(['RESERVATION', 'RELEASE']) : countTypes(['SALE_CANCEL', 'RETURN']));

  function exportMovements() {
    const fields = ['Fecha', 'Hora', 'Producto', 'Variante', 'SKU', 'Operación / tipo', 'Cantidad', 'Motivo', 'Referencia', 'Responsable'];
    const escape = (value: unknown) => `"${String(value ?? '').replaceAll('"', '""')}"`;
    const rows = [fields, ...items.map((item) => [new Date(item.createdAt).toLocaleDateString('es-MX'), new Date(item.createdAt).toLocaleTimeString('es-MX'), item.variant.product.name, [item.variant.size, item.variant.color].filter(Boolean).join(' / '), item.variant.sku, labels[item.type] ?? item.type, item.quantity, item.reason, item.referenceId, item.user.name])];
    const blob = new Blob([`\uFEFF${rows.map((row) => row.map(escape).join(',')).join('\r\n')}`], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = 'kardex-inventario.csv';
    anchor.click();
    URL.revokeObjectURL(url);
  }

  const groups: { key: Group; title: string; count: number; color: string }[] = [
    { key: 'ALL', title: 'Todos los movimientos', count: summary.total, color: '' },
    { key: 'IN', title: 'Entradas (+)', count: countTypes(['INITIAL', 'PURCHASE', 'ADJUSTMENT_IN']), color: 'is-green' },
    { key: 'SALE', title: 'Ventas POS (−)', count: countTypes(['SALE']), color: 'is-red' },
    { key: 'ADJUSTMENT', title: 'Ajustes (+/−)', count: countTypes(['ADJUSTMENT_IN', 'ADJUSTMENT_OUT', 'CORRECTION']), color: 'is-amber' },
    { key: 'RESERVATION', title: 'Apartados', count: countTypes(['RESERVATION', 'RELEASE']), color: 'is-bookmark' },
    { key: 'CANCEL', title: 'Cancelaciones / Devoluciones', count: countTypes(['SALE_CANCEL', 'RETURN']), color: 'is-red' },
  ];

  return (
    <section className="inventory-page inventory-kardex-page" aria-labelledby="movements-title">
      <div className="inventory-kardex-heading">
        <div>
          <Breadcrumbs items={[{ label: 'Operaciones' }, { label: 'Inventario', href: '/inventario' }, { label: 'Historial de movimientos' }]} />
          <div className="inventory-kardex-title-row"><h1 id="movements-title">Kárdex de Movimientos</h1><span>En tiempo real</span></div>
          <p>Registro cronológico, inmutable y auditable de todas las entradas, salidas y ajustes de inventario.</p>
        </div>
        <div className="inventory-kardex-heading-actions"><label><CalendarDays size={15} aria-hidden="true"/><select aria-label="Periodo de movimientos" value={period} onChange={(event) => { setPeriod(event.target.value as Period); setPage(1); }}><option value="today">Hoy</option><option value="7d">Últimos 7 días</option><option value="30d">Últimos 30 días</option><option value="month">Este mes</option></select></label><button type="button" onClick={exportMovements}><Download size={15} aria-hidden="true"/>Exportar reporte (CSV / PDF)</button></div>
      </div>

      <section className="inventory-kardex-metrics" aria-label="Resumen de operaciones">
        <article><div><span>Total operaciones (30d)</span><Activity size={16}/></div><strong>{number(summary.total)}</strong><small>Actividad consolidada</small></article>
        <article className="is-in"><div><span>Entradas mercancía</span><Package size={16}/></div><strong>+{number(incoming)} <small>pzas</small></strong><small>{number(countTypes(['INITIAL', 'PURCHASE', 'ADJUSTMENT_IN']))} recepciones e ingresos</small></article>
        <article className="is-out"><div><span>Salidas directas POS</span><X size={16}/></div><strong>−{number(Math.abs(salesOut))} <small>pzas</small></strong><small>{number(countTypes(['SALE']))} ventas de mostrador</small></article>
        <article className="is-adjust"><div><span>Ajustes & mermas</span><RefreshCw size={16}/></div><strong>{signed(adjustmentOut)} <small>pzas</small></strong><small>{number(countTypes(['ADJUSTMENT_OUT', 'CORRECTION']))} registros auditados</small></article>
      </section>

      <section className="inventory-kardex-filters" aria-label="Filtros del kárdex">
        <label className="inventory-kardex-search"><Search size={16} aria-hidden="true"/><span className="sr-only">Buscar movimientos</span><input aria-label="Buscar movimientos" placeholder="Buscar por producto, SKU, ticket o folio de ajuste..." value={query} onChange={(event) => { setQuery(event.target.value); setPage(1); window.dispatchEvent(new CustomEvent('operation-search-sync', { detail: event.target.value })); }}/><kbd>⌘ K</kbd></label>
        <div className="inventory-kardex-chips" role="group" aria-label="Tipo de movimiento">
          {groups.map((item) => <button key={item.key} type="button" aria-pressed={group === item.key} className={`${group === item.key ? 'is-selected' : ''} ${item.color}`} onClick={() => { setGroup(item.key); setPage(1); }}>{item.title}<b>{number(item.count)}</b></button>)}
        </div>
        <div className="inventory-kardex-extra-filters"><label>Periodo:<select aria-label="Periodo del kárdex" value={period} onChange={(event) => { setPeriod(event.target.value as Period); setPage(1); }}><option value="today">Hoy</option><option value="7d">Últimos 7 días</option><option value="30d">Últimos 30 días</option><option value="month">Este mes</option></select></label><label>Responsable:<select aria-label="Responsable" value={userId} onChange={(event) => { setUserId(event.target.value); setPage(1); }}><option value="">Todos los usuarios</option>{summary.users.map((user) => <option key={user.id} value={user.id}>{user.name}</option>)}</select></label><span>Mostrando {items.length} de {number(total)} movimientos</span><button type="button" aria-label="Actualizar movimientos" onClick={() => void load()}><RefreshCw size={14}/></button></div>
      </section>

      {error && <div className="inventory-alert" role="alert"><CircleAlert size={18}/>{error}<button type="button" onClick={() => void load()}>Reintentar</button></div>}
      {loading ? <div className="inventory-loading" role="status">Cargando movimientos...</div> : items.length === 0 ? <div className="inventory-empty"><Package size={38}/><h2>Sin movimientos</h2><p>No hay registros para los filtros seleccionados.</p></div> : <section className="inventory-kardex-table" aria-label="Movimientos de inventario"><div className="inventory-kardex-table-scroll"><table><thead><tr><th>Fecha y hora</th><th>Producto y variante</th><th>SKU</th><th>Operación / tipo</th><th>Efecto movimiento</th><th>Stock físico</th><th>Disponible</th><th>Motivo / referencia</th><th>Responsable</th><th>Acciones</th></tr></thead><tbody>{items.map((item) => {
        const quantity = Number(item.quantity);
        const snapshot = inventoryByVariant.get(item.variant.id);
        const movementLabel = labels[item.type] ?? item.type;
        const referenceHref = item.referenceType === 'Sale' && item.referenceId ? `/tickets/${item.referenceId}` : item.referenceType === 'Return' ? '/devoluciones' : item.referenceType === 'Reservation' ? '/apartados' : `/inventario/${item.variant.id}`;
        return <tr key={item.id}><td><strong>{new Date(item.createdAt).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' })}</strong><small>{new Date(item.createdAt).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}</small></td><td><div className="inventory-kardex-product">{item.variant.product.photoPath ? <img src={item.variant.product.photoPath} alt=""/> : <i><Package size={17}/></i>}<span><strong>{item.variant.product.name}</strong><small>{[item.variant.size, item.variant.color].filter(Boolean).join(' / ') || item.variant.product.category?.name}</small></span></div></td><td className="inventory-kardex-sku">{item.variant.sku}</td><td><span className={`inventory-kardex-type ${quantity < 0 ? 'is-out' : item.type === 'RESERVATION' ? 'is-reservation' : 'is-in'}`}><i/>{movementLabel}</span></td><td className={quantity < 0 ? 'is-negative' : 'is-positive'}>{signed(quantity)} pzas</td><td>{snapshot ? `${number(snapshot.physical)} pzas` : '—'}</td><td>{snapshot ? `${number(snapshot.available)} pzas` : '—'}</td><td><strong>{item.referenceType ? `${item.referenceType}${item.referenceId ? ` #${item.referenceId}` : ''}` : item.reason || 'Sin motivo'}</strong>{item.reason && item.referenceType && <small>{item.reason}</small>}</td><td><span className="inventory-kardex-user"><i>{item.user.name.split(/\s+/).map((name) => name[0]).slice(0,2).join('').toUpperCase()}</i>{item.user.name}</span></td><td><Link className="inventory-kardex-view" href={referenceHref} aria-label={`Ver detalle de ${movementLabel}`}><Eye size={15} aria-hidden="true"/></Link></td></tr>;
      })}</tbody></table></div><footer className="inventory-kardex-pagination"><span>Página {page} de {totalPages} · Total de {number(total)} transacciones registradas</span><div><button type="button" disabled={page <= 1} onClick={() => setPage((value) => value - 1)}>Anterior</button>{Array.from({ length: Math.min(totalPages, 4) }, (_, index) => index + 1).map((pageNum) => <button type="button" key={pageNum} aria-current={pageNum === page ? 'page' : undefined} onClick={() => setPage(pageNum)}>{pageNum}</button>)}{totalPages > 4 && <span>… {totalPages}</span>}<button type="button" disabled={page >= totalPages} onClick={() => setPage((value) => value + 1)}>Siguiente</button></div></footer></section>}

      <footer className="inventory-kardex-audit-note"><span><ShieldCheck size={17}/><strong>Políticas de Auditoría & Kárdex</strong><small>Registro inmutable de movimientos auditables por fecha, folio y usuario responsable.</small></span><Link href="/auditoria">Historial de sólo lectura</Link></footer>
    </section>
  );
}
