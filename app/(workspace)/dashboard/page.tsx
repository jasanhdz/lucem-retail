'use client';

import { AlertTriangle, Boxes, ClipboardList, Package, RefreshCw, ShoppingCart, TriangleAlert } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';

type RecentSale = { id: string; folio: number; total: string; status: 'CONFIRMED' | 'CANCELLED'; createdAt: string };
type DashboardData = { gross: string; net: string; units: number; cogs: string; profit: string; outOfStock: number; lowStock: number; recent: RecentSale[] };
const currency = new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' });
const number = new Intl.NumberFormat('es-MX');
const date = new Intl.DateTimeFormat('es-MX', { dateStyle: 'medium', timeStyle: 'short' });

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
function formatMoney(value: string) { const parsed = Number(value); return Number.isFinite(parsed) ? currency.format(parsed) : '—'; }
function formatSaleDate(value: string) { const parsed = new Date(value); return Number.isNaN(parsed.getTime()) ? 'Fecha no disponible' : date.format(parsed); }

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let active = true;
    setLoading(true); setError(false);
    fetch('/api/dashboard', { credentials: 'same-origin' }).then(async response => {
      if (!response.ok) throw new Error('dashboard request failed');
      const body: unknown = await response.json();
      if (!isDashboardData(body)) throw new Error('dashboard response invalid');
      return body;
    }).then(body => { if (active) setData(body); }).catch(() => { if (active) setError(true); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [attempt]);
  if (loading) return <DashboardLoading />;
  if (error || !data) return <DashboardError onRetry={() => { setData(null); setAttempt(value => value + 1); }} />;
  const empty = data.net === '0.00' && data.units === 0 && data.cogs === '0.00' && data.profit === '0.00' && data.outOfStock === 0 && data.lowStock === 0 && data.recent.length === 0;
  return <div className="dashboard-page">
    <header className="dashboard-heading"><div><p className="dashboard-kicker">Resumen operativo</p><h1>Buenos días, aquí tienes el pulso de tu negocio.</h1><p className="dashboard-period">Periodo actual · Hoy</p></div><Link className="button dashboard-sale-button" href="/pos"><ShoppingCart aria-hidden="true" size={18}/> Venta y cobro directo</Link></header>
    <section className="dashboard-shortcuts" aria-labelledby="dashboard-shortcuts-title"><div className="dashboard-section-heading"><h2 id="dashboard-shortcuts-title">Accesos rápidos</h2><span>Opera sin rodeos</span></div><div className="dashboard-shortcut-grid"><QuickLink href="/pos" icon={ShoppingCart} title="Punto de venta" description="Inicia una nueva venta"/><QuickLink href="/productos" icon={Package} title="Catálogo" description="Consulta tus productos"/><QuickLink href="/inventario" icon={Boxes} title="Inventario" description="Revisa existencias"/></div></section>
    <section aria-labelledby="dashboard-metrics-title"><div className="dashboard-section-heading"><h2 id="dashboard-metrics-title">Rendimiento de hoy</h2><span>Datos del negocio</span></div><div className="dashboard-metrics-grid"><Metric label="Ventas netas" value={formatMoney(data.net)} tone="primary"/><Metric label="Unidades vendidas" value={number.format(data.units)}/><Metric label="Costo de ventas" value={formatMoney(data.cogs)}/><Metric label="Utilidad estimada" value={formatMoney(data.profit)} tone="positive"/></div></section>
    <div className="dashboard-lower-grid"><section className="dashboard-panel" aria-labelledby="dashboard-alerts-title"><div className="dashboard-section-heading"><h2 id="dashboard-alerts-title">Atención de inventario</h2><Link href="/inventario">Ver inventario</Link></div><div className="dashboard-alert-list"><InventoryAlert icon={AlertTriangle} label="Productos agotados" count={data.outOfStock} tone="danger"/><InventoryAlert icon={TriangleAlert} label="Stock bajo" count={data.lowStock} tone="warning"/></div>{data.outOfStock === 0 && data.lowStock === 0 && <p className="dashboard-clear-state">No hay alertas de inventario por atender.</p>}</section>
      <section className="dashboard-panel dashboard-recent" aria-labelledby="dashboard-recent-title"><div className="dashboard-section-heading"><h2 id="dashboard-recent-title">Actividad reciente</h2><span>Últimas ventas</span></div>{data.recent.length ? <ul className="dashboard-sale-list">{data.recent.map(sale => <li key={sale.id}><span className="dashboard-sale-icon"><ShoppingCart aria-hidden="true" size={17}/></span><span className="dashboard-sale-detail"><strong>Venta #{sale.folio}</strong><small>{formatSaleDate(sale.createdAt)}</small></span><span className="dashboard-sale-total"><strong>{formatMoney(sale.total)}</strong><small className={`dashboard-status dashboard-status-${sale.status.toLowerCase()}`}>{sale.status === 'CONFIRMED' ? 'Confirmada' : 'Cancelada'}</small></span></li>)}</ul> : <p className="dashboard-clear-state">Aún no hay ventas registradas en este periodo.</p>}</section></div>
    {empty && <div className="dashboard-empty" role="status"><ClipboardList aria-hidden="true" size={22}/><div><strong>Tu operación comienza aquí</strong><p>Cuando registres una venta, tus métricas y actividad aparecerán en este resumen.</p></div></div>}
  </div>;
}
function QuickLink({ href, icon: Icon, title, description }: { href: string; icon: typeof ShoppingCart; title: string; description: string }) { return <Link className="dashboard-shortcut" href={href}><span className="dashboard-shortcut-icon"><Icon aria-hidden="true" size={21}/></span><span><strong>{title}</strong><small>{description}</small></span><span className="dashboard-shortcut-arrow" aria-hidden="true">→</span></Link>; }
function Metric({ label, value, tone = '' }: { label: string; value: string; tone?: string }) { return <article className={`dashboard-metric ${tone ? `dashboard-metric-${tone}` : ''}`}><span>{label}</span><strong>{value}</strong><small>Hoy</small></article>; }
function InventoryAlert({ icon: Icon, label, count, tone }: { icon: typeof AlertTriangle; label: string; count: number; tone: string }) { return <div className={`dashboard-alert dashboard-alert-${tone}`}><span className="dashboard-alert-icon"><Icon aria-hidden="true" size={19}/></span><span><strong>{label}</strong><small>{count === 0 ? 'Todo en orden' : `${number.format(count)} ${count === 1 ? 'producto requiere' : 'productos requieren'} atención`}</small></span><b>{number.format(count)}</b></div>; }
function DashboardLoading() { return <div className="dashboard-page" aria-busy="true"><div className="dashboard-loading" role="status" aria-label="Cargando resumen operativo"><span className="dashboard-skeleton dashboard-skeleton-heading"/><span className="dashboard-skeleton dashboard-skeleton-cta"/><div className="dashboard-skeleton-grid">{[1, 2, 3, 4].map(item => <span className="dashboard-skeleton dashboard-skeleton-card" key={item}/>)}</div><span className="dashboard-skeleton dashboard-skeleton-panel"/><div className="dashboard-loading-message">Cargando datos operativos…</div></div></div>; }
function DashboardError({ onRetry }: { onRetry: () => void }) { return <div className="dashboard-page dashboard-error-state"><div className="dashboard-error-card" role="alert"><AlertTriangle aria-hidden="true" size={25}/><h1>No pudimos cargar tu resumen</h1><p>Revisa tu conexión e inténtalo de nuevo. Tus datos no se modificaron.</p><button className="button" type="button" onClick={onRetry}><RefreshCw aria-hidden="true" size={17}/> Reintentar</button></div></div>; }
