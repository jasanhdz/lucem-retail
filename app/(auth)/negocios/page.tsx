'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function Businesses() {
  const router = useRouter();
  const [businesses, setBusinesses] = useState<{ id: string; name: string }[]>([]);
  useEffect(() => { fetch('/api/businesses').then((response) => response.json()).then((data) => setBusinesses(data.businesses ?? [])); }, []);
  async function select(businessId: string) { const response = await fetch('/api/businesses/select', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ businessId }) }); if (response.ok) router.push('/dashboard'); }
  return <main style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', padding: 24 }}><section className="card" style={{ width: '100%', maxWidth: 520, padding: 28 }}><h1>Selecciona un negocio</h1><p className="muted">El contexto activo se guarda en tu sesión.</p><div style={{ display: 'grid', gap: 12 }}>{businesses.map((business) => <button className="btn btn-light" key={business.id} onClick={() => select(business.id)}>{business.name}</button>)}</div></section></main>;
}
