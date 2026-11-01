'use client';

import { Boxes, Ellipsis, Home, Package, ShoppingCart } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';

const primary = [{ href: '/dashboard', label: 'Inicio', icon: Home }, { href: '/pos', label: 'POS', icon: ShoppingCart }, { href: '/productos', label: 'Productos', icon: Package }, { href: '/inventario', label: 'Inventario', icon: Boxes }];
export function MobileBottomNavigation({ extraRoutes }: { extraRoutes: { href: string; label: string }[] }) {
  const pathname = usePathname();
  const [more, setMore] = useState(false);
  useEffect(() => { const close = (event: KeyboardEvent) => { if (event.key === 'Escape') setMore(false); }; window.addEventListener('keydown', close); return () => window.removeEventListener('keydown', close); }, []);
  return <><div className="mobile-more" hidden={!more}><button className="mobile-more-dismiss" aria-label="Cerrar más opciones" onClick={() => setMore(false)}/><nav className="mobile-more-sheet" aria-label="Más secciones">{extraRoutes.map(route => <Link key={route.href} href={route.href} aria-current={pathname === route.href ? 'page' : undefined} onClick={() => setMore(false)}>{route.label}</Link>)}</nav></div><nav className="mobile-bottom-nav" aria-label="Navegación móvil">{primary.map(({ href, label, icon: Icon }) => <Link key={href} href={href} aria-current={pathname === href ? 'page' : undefined}><Icon aria-hidden="true"/><span>{label}</span></Link>)}<button type="button" aria-expanded={more} aria-haspopup="true" onClick={() => setMore(value => !value)}><Ellipsis aria-hidden="true"/><span>Más</span></button></nav></>;
}
