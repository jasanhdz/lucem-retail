'use client';

import { useEffect, useState } from 'react';
import { money } from '@/lib/money';
import { SkeletonStack } from './Skeleton';
import { Search, Wifi, type LucideIcon } from 'lucide-react';

export function Header({ title, kicker }: { title: string; kicker?: string }) {
  return <header className="page-header">
    <div className="page-heading">
      <p className="page-kicker">{kicker ?? 'American Outfit / Sucursal Centro'}</p>
      <h1>{title}</h1>
    </div>
    <span className="connection-chip"><Wifi size={14} strokeWidth={2.2} aria-hidden="true" /> Conectado</span>
  </header>;
}

export function DataList({ url, render, empty = 'No hay registros todavía' }: { url: string; render: (x: any) => React.ReactNode; empty?: string }) {
  const [data, setData] = useState<any[] | null>(null);
  useEffect(() => {
    let active = true;
    setData(null);
    fetch(url).then((response) => response.ok ? response.json() : Promise.reject()).then((result) => { if (active) setData(result); }).catch(() => { if (active) setData([]); });
    return () => { active = false; };
  }, [url]);
  if (data === null) return <SkeletonStack count={3} />;
  return data.length ? <div className="data-list">{data.map((item, index) => <article className="card data-card" key={item.id ?? index}>{render(item)}</article>)}</div> : <div className="surface-state empty-state"><Search size={26} aria-hidden="true"/><strong>{empty}</strong></div>;
}

export function Stat({ label, value, accent, icon: Icon }: { label: string; value: string | number; accent?: string; icon?: LucideIcon }) {
  const loading = typeof value === 'string' && (value === '…' || value.startsWith('Cargando'));
  return <article className="metric-card">
    <div className="metric-top"><div className="metric-label">{label}</div>{Icon && <span className="metric-icon" aria-hidden="true"><Icon size={17} strokeWidth={2} /></span>}</div>
    <strong className={`metric-value ${loading ? 'is-loading' : ''}`} style={accent && !loading ? { color: accent } : undefined}>{loading ? <span className="skeleton-metric" aria-label="Cargando" /> : value}</strong>
  </article>;
}

export { money };
