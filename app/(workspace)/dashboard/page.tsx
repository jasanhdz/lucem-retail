'use client';

import { useEffect, useState } from 'react';
import { Header, Stat, money } from '@/components/Screen';
import { SkeletonStack } from '@/components/Skeleton';
import { Boxes, CircleSlash, DollarSign, Receipt, TrendingUp, TriangleAlert } from 'lucide-react';

type DashboardData = { net: string; gross: string; units: number; cogs: string; profit: string; outOfStock: number; lowStock: number; recent: Array<{ id: string; folio: number; total: string; status: string; createdAt: string }> };

export default function Dashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [error, setError] = useState('');
  const [reload, setReload] = useState(0);

  useEffect(() => {
    const today = new Date().toISOString().slice(0, 10);
    fetch(`/api/dashboard?from=${today}&to=${today}`)
      .then(async (response) => { if (!response.ok) throw new Error('No fue posible cargar el resumen.'); return response.json(); })
      .then(setData)
      .catch((reason) => setError(reason instanceof Error ? reason.message : 'Error de conexión.'));
  }, [reload]);

  return <>
    <Header title="Resumen" kicker="Hoy / operación general" />
    {error ? <section className="surface-state error-state" role="alert"><strong>{error}</strong><button className="btn btn-light" onClick={() => { setError(''); setReload((value) => value + 1); }}>Reintentar</button></section> : <>
      <section className="dashboard-kpis" aria-label="Indicadores de hoy">
        <Stat icon={DollarSign} label="Ventas netas" value={data ? money(data.net) : 'Cargando…'} accent="#006c49" />
        <Stat icon={Boxes} label="Unidades" value={data?.units ?? 'Cargando…'} />
        <Stat icon={Receipt} label="Costo mercancía" value={data ? money(data.cogs) : 'Cargando…'} />
        <Stat icon={TrendingUp} label="Utilidad bruta" value={data ? money(data.profit) : 'Cargando…'} accent="#006c49" />
      </section>
      <section className="dashboard-alerts" aria-label="Estado de inventario">
        <Stat icon={CircleSlash} label="Agotados" value={data?.outOfStock ?? 'Cargando…'} accent="#ba1a1a" />
        <Stat icon={TriangleAlert} label="Alertas de stock" value={data?.lowStock ?? 'Cargando…'} accent="#b87500" />
      </section>
      <section className="card dashboard-recent">
        <div className="section-heading"><div><p className="section-eyebrow">Actividad de tienda</p><h2>Ventas recientes</h2></div><span className="subtle-chip">Hoy</span></div>
        {!data ? <SkeletonStack count={3} /> : data.recent.length ? <div className="recent-sales-list">{data.recent.map((sale) => <article className="recent-sale" key={sale.id}>
          <span className="recent-sale-icon" aria-hidden="true"><Receipt size={17}/></span><div className="recent-sale-info"><strong>Folio #{sale.folio}</strong><small>{new Date(sale.createdAt).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })} · {sale.status === 'CANCELLED' ? 'Cancelada' : 'Venta confirmada'}</small></div><strong className={sale.status === 'CANCELLED' ? 'text-danger' : 'text-money'}>{money(sale.total)}</strong>
      </article>)}</div> : <div className="surface-state empty-state"><Receipt size={26} aria-hidden="true"/><strong>Aún no hay ventas</strong><p>Registra la primera desde el punto de venta.</p></div>}
      </section>
    </>}
  </>;
}
