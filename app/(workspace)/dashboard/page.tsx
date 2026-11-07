'use client';

import { Activity, AlertTriangle, ArrowRight, ArrowUpRight, BadgeCheck, Bell, Bookmark, Boxes, CalendarClock, Check, CircleAlert, CreditCard, LayoutDashboard, Package, ReceiptText, RefreshCw, ShoppingBag, ShoppingCart, Store, TrendingUp, WalletCards } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';

type RecentSale = { id: string; folio: number; total: string; status: 'CONFIRMED' | 'CANCELLED'; createdAt: string; userName?: string; paymentMethod?: string; lineCount?: number; items?: string[] };
type StockItem = { name: string; variant: string; stock: string };
type DashboardData = {
  gross: string; net: string; units: number; cogs: string; profit: string; outOfStock: number; lowStock: number; recent: RecentSale[];
  businessName?: string; branchName?: string; transactionCount?: number; averageTicket?: string; activeSkus?: number; activeCategories?: number;
  physical?: string; reservedUnits?: string; activeReservations?: number; expiringReservations?: number; healthyProducts?: number; cashClose?: string;
  outOfStockItems?: StockItem[]; lowStockItems?: StockItem[]; updatedAt?: string;
};
type Range = 'today' | 'week' | 'month';

const currency = new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' });
const number = new Intl.NumberFormat('es-MX', { maximumFractionDigits: 2 });
const date = new Intl.DateTimeFormat('es-MX', { hour: '2-digit', minute: '2-digit' });
const ranges: { id: Range; label: string }[] = [{ id: 'today', label: 'Hoy' }, { id: 'week', label: 'Últimos 7 días' }, { id: 'month', label: 'Últimos 30 días' }];
function dateRange(range: Range) {
  const end = new Date(); const start = new Date(); start.setHours(0, 0, 0, 0); end.setHours(23, 59, 59, 999);
  if (range === 'week') start.setDate(start.getDate() - 6);
  if (range === 'month') start.setDate(start.getDate() - 29);
  const local = (value: Date) => `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, '0')}-${String(value.getDate()).padStart(2, '0')}`;
  return { from: local(start), to: local(end) };
}
function isDashboardData(value: unknown): value is DashboardData {
  if (!value || typeof value !== 'object') return false;
  const data = value as Record<string, unknown>;
  return ['gross', 'net', 'cogs', 'profit'].every(key => typeof data[key] === 'string')
    && ['units', 'outOfStock', 'lowStock'].every(key => typeof data[key] === 'number' && Number.isFinite(data[key]))
    && Array.isArray(data.recent) && data.recent.every(sale => {
      if (!sale || typeof sale !== 'object') return false;
      const item = sale as Record<string, unknown>;
      return typeof item.id === 'string' && typeof item.folio === 'number' && typeof item.total === 'string'
        && (item.status === 'CONFIRMED' || item.status === 'CANCELLED') && typeof item.createdAt === 'string';
    });
}
function money(value: string | number) { const parsed = Number(value); return Number.isFinite(parsed) ? currency.format(parsed) : '—'; }
function saleDate(value: string) { const parsed = new Date(value); return Number.isNaN(parsed.getTime()) ? '—' : date.format(parsed); }
function paymentLabel(value?: string) { return value === 'CARD' ? 'Tarjeta débito' : value === 'TRANSFER' ? 'SPEI / Transf.' : value === 'CASH' ? 'Efectivo' : '—'; }

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [range, setRange] = useState<Range>('today');
  useEffect(() => {
    let active = true;
    const dates = dateRange(range);
    setLoading(true); setError(false);
    fetch(`/api/dashboard?from=${dates.from}&to=${dates.to}`, { credentials: 'same-origin', cache: 'no-store' }).then(async response => {
      if (!response.ok) throw new Error('dashboard request failed');
      const body: unknown = await response.json();
      if (!isDashboardData(body)) throw new Error('dashboard response invalid');
      return body;
    }).then(body => { if (active) setData(body); }).catch(() => { if (active) setError(true); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [attempt, range]);
  if (loading) return <DashboardLoading />;
  if (error || !data) return <DashboardError onRetry={() => { setData(null); setAttempt(value => value + 1); }} />;
  const empty = data.net === '0.00' && data.units === 0 && data.cogs === '0.00' && data.profit === '0.00' && data.outOfStock === 0 && data.lowStock === 0 && data.recent.length === 0;
  const transactions = data.transactionCount ?? data.recent.filter(sale => sale.status === 'CONFIRMED').length;
  const averageTicket = data.averageTicket ?? String(transactions ? Number(data.net) / transactions : 0);
  const unitsPerSale = transactions ? data.units / transactions : 0;
  const costRate = Number(data.net) ? Number(data.cogs) / Number(data.net) * 100 : 0;
  const margin = Number(data.net) ? Number(data.profit) / Number(data.net) * 100 : 0;
  const activeReservations = data.activeReservations ?? 0;
  const expiringReservations = data.expiringReservations ?? 0;
  const healthyProducts = data.healthyProducts ?? 0;
  const activeSkus = data.activeSkus ?? 0;
  const healthyPercent = activeSkus ? Math.round(healthyProducts / activeSkus * 100) : 0;
  const updatedTime = data.updatedAt ? saleDate(data.updatedAt) : date.format(new Date());
  const outItems = data.outOfStockItems ?? [];
  const lowItems = data.lowStockItems ?? [];

  return <div className="dashboard-page dashboard-workspace-page">
    <section className="dashboard-heading" aria-label="Encabezado del resumen"><div><span className="dashboard-mobile-status"><i/> Turno activo · Matutino <span><Activity size={12}/> En vivo</span></span><div className="dashboard-title-line"><h1>Resumen de tu negocio</h1><span className="dashboard-live"><i/> En tiempo real · Actualizado {updatedTime}</span></div><p>Métricas consolidadas de ventas, márgenes comerciales y estado operativo de inventario en mostrador.</p><small className="dashboard-mobile-branch"><Store size={13}/> {data.businessName || 'Negocio'} · {data.branchName || 'Sucursal'}</small></div><div className="dashboard-heading-controls"><div className="dashboard-period-filter" role="group" aria-label="Periodo del resumen">{ranges.map(option => <button type="button" key={option.id} aria-pressed={range === option.id} className={range === option.id ? 'is-active' : ''} onClick={() => setRange(option.id)}>{option.label}</button>)}</div></div></section>

    <section className="dashboard-metrics-grid" aria-label="Indicadores del periodo">
      <article className="dashboard-metric dashboard-metric-sales"><header><span>Ventas netas</span><i><WalletCards size={18}/></i></header><strong>{money(data.net)} <small>MXN</small></strong><p>{number.format(transactions)} transacciones cobradas en mostrador</p><footer><TrendingUp size={12}/> Ticket prom. {money(averageTicket)} MXN</footer></article>
      <article className="dashboard-metric dashboard-metric-units"><header><span>Unidades vendidas</span><i><ShoppingBag size={18}/></i></header><strong>{number.format(data.units)} <small>piezas</small></strong><p>Distribuidas en {number.format(data.activeCategories ?? 0)} categorías activas de tienda</p><footer><Activity size={12}/> {unitsPerSale.toFixed(1)} unidades / ticket prom.</footer></article>
      <article className="dashboard-metric dashboard-metric-cost"><header><span>Costo de ventas</span><i><ReceiptText size={18}/></i></header><strong>{money(data.cogs)} <small>MXN</small></strong><p>Costo deducido (PEPS / Promedio)</p><footer><span>Relación costo/venta</span><b>{costRate.toFixed(1)}%</b><i><span style={{ width: `${Math.min(100, costRate)}%` }}/></i></footer></article>
      <article className="dashboard-metric dashboard-metric-profit"><header><span>Utilidad estimada</span><i><BadgeCheck size={18}/></i></header><strong>{money(data.profit)} <small>MXN</small></strong><p>Margen comercial neto deducido</p><footer><Check size={12}/> {margin.toFixed(1)}% Margen bruto</footer></article>
    </section>

    <section className="dashboard-shortcuts" aria-label="Operación rápida"><div className="dashboard-mobile-section-label">Operación rápida</div><div className="dashboard-shortcut-grid"><QuickLink href="/pos" icon={ShoppingCart} title="POS Mostrador" description="Caja rápida y cobro ágil"/><QuickLink href="/productos" icon={Package} title="Productos" description={`${number.format(activeSkus)} SKUs activos`}/><QuickLink href="/inventario" icon={Boxes} title="Inventario" description={`${number.format(Number(data.physical ?? 0))} pzas físicas`}/><QuickLink href="/apartados" icon={Bookmark} title="Apartados" description={`${number.format(activeReservations)} folios en custodia`}/></div></section>

    <div className="dashboard-lower-grid">
      <section className="dashboard-panel dashboard-sales-panel" aria-labelledby="dashboard-sales-title"><div className="dashboard-sales-heading"><div><h2 id="dashboard-sales-title">Ventas recientes de hoy <span>{number.format(transactions)} registradas</span></h2></div><Link href="/reportes">Ver reporte completo <ArrowRight size={14}/></Link></div>
        {data.recent.length ? <><div className="dashboard-sales-table-wrap"><table className="dashboard-sales-table"><thead><tr><th>Folio / Hora</th><th>Vendedor / Caja</th><th>Artículos</th><th>Método</th><th>Total</th><th>Acción</th></tr></thead><tbody>{data.recent.map(sale => <tr key={sale.id}><td><strong>#POS-{new Date().getFullYear()}-{String(sale.folio).padStart(4, '0')}</strong><small>{saleDate(sale.createdAt)}</small></td><td><strong>{sale.userName || 'Equipo de tienda'}</strong><small>Caja 01</small></td><td><strong>{sale.lineCount ?? 1} artículos</strong><small>{sale.items?.join(', ') || 'Venta registrada'}</small></td><td><span className="dashboard-payment"><CreditCard size={12}/>{paymentLabel(sale.paymentMethod)}</span></td><td><strong>{money(sale.total)}</strong><small>MXN</small></td><td><Link href={`/tickets/${sale.id}`} aria-label={`Ver ticket ${sale.folio}`}><ReceiptText size={15}/></Link></td></tr>)}</tbody></table></div><div className="dashboard-mobile-sales">{data.recent.map(sale => <Link key={sale.id} href={`/tickets/${sale.id}`} className="dashboard-mobile-sale"><span><strong>#POS-{String(sale.folio).padStart(4, '0')}</strong><small>· {saleDate(sale.createdAt)}</small><small>{sale.lineCount ?? 1} arts · {paymentLabel(sale.paymentMethod)}</small></span><b>{money(sale.total)}<small>MXN</small></b></Link>)}</div></> : <p className="dashboard-clear-state">Aún no hay ventas registradas en este periodo.</p>}
        {data.recent.length > 0 && <div className="dashboard-cash-close"><Store size={15}/><span>Cierre de turno preliminar: <strong>{money(data.cashClose ?? '0')} MXN en Caja 01</strong></span><Link href="/pos">Arqueo de cajón</Link></div>}
      </section>

      <aside className="dashboard-operations-rail">
        <section className="dashboard-panel dashboard-inventory-panel" aria-labelledby="dashboard-inventory-title"><div className="dashboard-section-heading"><h2 id="dashboard-inventory-title"><Bell size={15}/> Atención de Inventario</h2><span className="dashboard-alert-count">{number.format(data.outOfStock + data.lowStock)} avisos</span></div><div className="dashboard-alert-list"><InventoryAlert icon={CircleAlert} label={data.outOfStock === 1 ? '1 producto agotado' : `${number.format(data.outOfStock)} productos agotados`} count={data.outOfStock} items={outItems} tone="danger"/><InventoryAlert icon={AlertTriangle} label={data.lowStock === 1 ? '1 producto con stock bajo' : `${number.format(data.lowStock)} productos con stock bajo`} count={data.lowStock} items={lowItems} tone="warning"/></div><div className="dashboard-stock-health"><span>Existencias óptimas <strong>{number.format(healthyProducts)} productos ({healthyPercent}%)</strong></span><i><b style={{ width: `${healthyPercent}%` }}/></i><small>Abastecimiento general de la tienda.</small></div><Link className="dashboard-panel-action" href="/inventario">Gestionar existencias en Inventario <ArrowRight size={15}/></Link></section>
        <section className="dashboard-panel dashboard-reservations-panel" aria-labelledby="dashboard-reservations-title"><div className="dashboard-section-heading"><h2 id="dashboard-reservations-title"><Bookmark size={16}/> Apartados y Reservas</h2><span className="dashboard-reservation-count">{number.format(activeReservations)} vigentes</span></div><div className="dashboard-reservation-units"><strong>{number.format(Number(data.reservedUnits ?? 0))}</strong><span><b>Piezas en almacén</b><small>Retenidas y etiquetadas en resguardo</small></span></div><div className="dashboard-expiring"><CalendarClock size={15}/><strong>{number.format(expiringReservations)} apartados por vencer</strong><small>Plazo límite en menos de 48 hrs. Requieren confirmación o liberación de stock.</small></div><Link className="dashboard-reservation-action" href="/apartados">Ir a Gestión de Apartados <ArrowRight size={15}/></Link></section>
      </aside>
    </div>
    {empty && <div className="dashboard-empty" role="status"><LayoutDashboard aria-hidden="true" size={22}/><div><strong>Tu operación comienza aquí</strong><p>Cuando registres una venta, tus métricas y actividad aparecerán en este resumen.</p></div></div>}
  </div>;
}

function QuickLink({ href, icon: Icon, title, description }: { href: string; icon: typeof ShoppingCart; title: string; description: string }) { return <Link className="dashboard-shortcut" href={href}><span className="dashboard-shortcut-icon"><Icon aria-hidden="true" size={21}/></span><span><strong>{title}</strong><small>{description}</small></span><ArrowUpRight className="dashboard-shortcut-arrow" aria-hidden="true" size={17}/></Link>; }
function InventoryAlert({ icon: Icon, label, count, items, tone }: { icon: typeof AlertTriangle; label: string; count: number; items: StockItem[]; tone: string }) { return <div className={`dashboard-alert dashboard-alert-${tone}`}><div className="dashboard-alert-title"><Icon aria-hidden="true" size={16}/><strong>{label}</strong><span>{tone === 'warning' ? '< 10 pzas' : 'Ver SKUs'}</span></div>{items.length ? <small>{items.slice(0, 2).map(item => `${item.name}${item.variant ? ` (${item.variant})` : ''}${tone === 'warning' ? ` (${number.format(Number(item.stock))} pzas)` : ''}`).join(', ')}.</small> : <small>{count ? 'Revisar variantes para reabastecer.' : 'Todo en orden.'}</small>}</div>; }
function DashboardLoading() { return <div className="dashboard-page dashboard-workspace-page" aria-busy="true"><div className="dashboard-loading" role="status" aria-label="Cargando resumen operativo"><span className="dashboard-skeleton dashboard-skeleton-heading"/><span className="dashboard-skeleton dashboard-skeleton-cta"/><div className="dashboard-skeleton-grid">{[1, 2, 3, 4].map(item => <span className="dashboard-skeleton dashboard-skeleton-card" key={item}/>)}</div><span className="dashboard-skeleton dashboard-skeleton-panel"/><div className="dashboard-loading-message">Cargando datos operativos…</div></div></div>; }
function DashboardError({ onRetry }: { onRetry: () => void }) { return <div className="dashboard-page dashboard-workspace-page dashboard-error-state"><div className="dashboard-error-card" role="alert"><AlertTriangle aria-hidden="true" size={25}/><h1>No pudimos cargar tu resumen</h1><p>Revisa tu conexión e inténtalo de nuevo. Tus datos no se modificaron.</p><button className="button" type="button" onClick={onRetry}><RefreshCw aria-hidden="true" size={17}/> Reintentar</button></div></div>; }
