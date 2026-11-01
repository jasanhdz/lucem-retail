'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { BarChart3, ClipboardList, Ellipsis, LayoutDashboard, LogOut, Package, RotateCcw, ShoppingCart, Warehouse } from 'lucide-react';
import { BusinessSelector } from './BusinessSelector';

const primaryLinks = [
  { href: '/pos', label: 'Punto de venta', Icon: ShoppingCart },
  { href: '/productos', label: 'Productos', Icon: Package },
  { href: '/inventario', label: 'Inventario', Icon: Warehouse },
  { href: '/reportes', label: 'Reportes', Icon: BarChart3 },
];

const moreLinks = [
  { href: '/dashboard', label: 'Resumen', Icon: LayoutDashboard },
  { href: '/apartados', label: 'Apartados', Icon: ClipboardList },
  { href: '/devoluciones', label: 'Devoluciones', Icon: RotateCcw },
  { href: '/auditoria', label: 'Auditoría', Icon: ClipboardList },
];

const allLinks = [
  ...moreLinks.slice(0, 1),
  ...primaryLinks,
  ...moreLinks.slice(1),
];

function isActive(pathname: string, href: string) {
  return pathname === href || (href !== '/dashboard' && pathname.startsWith(`${href}/`));
}

function LogoutButton({ mobile = false }: { mobile?: boolean }) {
  return <form action="/api/auth/logout" method="post" className={mobile ? 'mobile-logout' : 'desktop-logout'}>
    <button className={mobile ? 'mobile-logout-button' : 'btn sidebar-logout'} aria-label="Cerrar sesión" type="submit">
      <LogOut size={mobile ? 16 : 17} strokeWidth={2.2} aria-hidden="true" />{mobile ? <span>Salir</span> : <span>Cerrar sesión</span>}
    </button>
  </form>;
}

export function WorkspaceNavigation({ businessName }: { businessName: string }) {
  const pathname = usePathname();
  const [moreOpen, setMoreOpen] = useState(false);
  const moreActive = moreLinks.some(({ href }) => isActive(pathname, href));

  return <>
    <aside className="sidebar desktop-sidebar" aria-label="Navegación principal">
      <Link className="brand-lockup" href="/dashboard" aria-label="Lucem Retail, ir al resumen">
        <span className="brand-mark">L</span><span>lucem<span className="brand-dot">.</span><small>RETAIL</small></span>
      </Link>
      <div className="sidebar-business"><span className="nav-overline">NEGOCIO ACTIVO</span><strong>{businessName}</strong></div>
      <nav aria-label="Secciones">
        {allLinks.map(({ href, label, Icon }) => <Link aria-current={isActive(pathname, href) ? 'page' : undefined} className={isActive(pathname, href) ? 'active' : ''} key={href} href={href}><Icon size={18} strokeWidth={2} aria-hidden="true" /><span>{label}</span></Link>)}
      </nav>
      <LogoutButton />
    </aside>

    <header className="mobile-app-header">
      <Link className="brand-lockup mobile-brand" href="/dashboard" aria-label="Lucem Retail, ir al resumen">
        <span className="brand-mark">L</span><span>lucem<span className="brand-dot">.</span></span>
      </Link>
      <div className="mobile-business"><BusinessSelector compact /></div>
      <LogoutButton mobile />
    </header>

    <nav className="mobile-bottom-navigation" aria-label="Navegación móvil">
      {primaryLinks.map(({ href, label, Icon }) => <Link aria-current={isActive(pathname, href) ? 'page' : undefined} className={isActive(pathname, href) ? 'active' : ''} key={href} href={href}>
        <Icon className="mobile-nav-icon" size={20} strokeWidth={2} aria-hidden="true" /><span>{label === 'Punto de venta' ? 'POS' : label}</span>
      </Link>)}
      <button aria-expanded={moreOpen} aria-haspopup="menu" className={moreActive || moreOpen ? 'active' : ''} onClick={() => setMoreOpen((open) => !open)} type="button">
        <Ellipsis className="mobile-nav-icon" size={20} strokeWidth={2} aria-hidden="true" /><span>Más</span>
      </button>
    </nav>

    {moreOpen && <>
      <button className="mobile-more-dismiss" aria-label="Cerrar menú Más" onClick={() => setMoreOpen(false)} type="button" />
      <nav className="mobile-more-menu" aria-label="Más secciones" role="menu">
        {moreLinks.map(({ href, label, Icon }) => <Link aria-current={isActive(pathname, href) ? 'page' : undefined} className={isActive(pathname, href) ? 'active' : ''} key={href} onClick={() => setMoreOpen(false)} role="menuitem" href={href}><Icon size={18} strokeWidth={2} aria-hidden="true" /><span>{label}</span></Link>)}
      </nav>
    </>}
  </>;
}
