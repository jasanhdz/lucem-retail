'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export function BusinessSelector({ compact = false }: { compact?: boolean }) {
  const router = useRouter();
  const [data, setData] = useState<{ activeBusinessId: string | null; businesses: { id: string; name: string }[] }>();
  useEffect(() => { fetch('/api/businesses').then((response) => response.ok ? response.json() : null).then(setData); }, []);
  if (!data) return null;
  if (data.businesses.length < 2) return compact ? <span className="mobile-business-current">{data.businesses[0]?.name.split('/').pop()?.trim() || data.businesses[0]?.name}</span> : null;
  async function select(businessId: string) {
    const response = await fetch('/api/businesses/select', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ businessId }) });
    if (response.ok) router.refresh();
  }
  return <label className={`business-selector ${compact ? 'compact' : ''}`}><span>{compact ? 'Sucursal' : 'Negocio'}</span><select className="field" value={data.activeBusinessId ?? ''} onChange={(event) => select(event.target.value)}>{data.businesses.map((business) => <option key={business.id} value={business.id}>{compact ? business.name.split('/').pop()?.trim() : business.name}</option>)}</select></label>;
}
