'use client';

import { Activity, BarChart3, Boxes, ChevronDown, ClipboardList, LayoutDashboard, Menu, Package, RotateCcw, ShoppingCart, Store, X } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Brand } from './Brand';

const groups = [
  { label: 'Operaciones', items: [
    { href: '/pos', label: 'Punto de venta', icon: ShoppingCart },
    { href: '/productos', label: 'Productos', icon: Package },
    { href: '/inventario', label: 'Inventario', icon: Boxes },
    { href: '/apartados', label: 'Apartados', icon: ClipboardList },
  ] },
  { label: 'Gestión', items: [
    { href: '/dashboard', label: 'Resumen', icon: LayoutDashboard },
    { href: '/reportes', label: 'Reportes', icon: BarChart3 },
    { href: '/devoluciones', label: 'Devoluciones', icon: RotateCcw },
  ] },
  { label: 'Administración', items: [{ href: '/auditoria', label: 'Auditoría', icon: Activity }] },
];
const names: Record<string, string> = Object.fromEntries(groups.flatMap(group => group.items.map(item => [item.href, item.label])));

export function WorkspaceShell({ children, businessName, userName, userEmail }: { children: React.ReactNode; businessName: string; userName: string; userEmail: string }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => { if (event.key === 'Escape') setOpen(false); };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);
  useEffect(() => { setOpen(false); }, [pathname]);
  const initials = userName.split(/\s+/).filter(Boolean).slice(0, 2).map(part => part[0]).join('').toUpperCase() || 'U';

  return <div className="workspace">
    <button className="mobile-overlay" data-open={open} aria-label="Cerrar navegación" tabIndex={open ? 0 : -1} onClick={() => setOpen(false)} />
    <aside className="sidebar" data-open={open} aria-label="Navegación principal">
      <Brand />
      <button className="mobile-close" type="button" aria-label="Cerrar menú" onClick={() => setOpen(false)}><X size={19} /></button>
      <div className="business-context"><span className="business-avatar"><Store size={17} aria-hidden="true" /></span><div><strong>{businessName}</strong><span>Espacio de trabajo</span></div><ChevronDown size={15} aria-hidden="true" /></div>
      <nav aria-label="Secciones del negocio">{groups.map(group => <div className="nav-group" key={group.label}><p className="nav-label">{group.label}</p>{group.items.map(item => { const Icon = item.icon; const active = pathname === item.href || pathname.startsWith(`${item.href}/`); return <Link className="nav-link" key={item.href} href={item.href} aria-current={active ? 'page' : undefined} onClick={() => setOpen(false)}><Icon aria-hidden="true" /><span>{item.label}</span></Link>; })}</div>)}</nav>
      <div className="sidebar-bottom"><div className="user-summary"><span className="user-avatar" aria-hidden="true">{initials}</span><div><strong>{userName}</strong><span>{userEmail}</span></div></div></div>
    </aside>
    <main className="workspace-main">
      <header className="workspace-topbar"><button type="button" className="mobile-menu-button" aria-label="Abrir menú de navegación" aria-expanded={open} onClick={() => setOpen(true)}><Menu size={20} aria-hidden="true" /></button><div className="breadcrumb"><strong>{names[pathname] ?? 'Espacio de trabajo'}</strong></div><div className="topbar-right"><div className="topbar-business"><Store size={15} aria-hidden="true" /> <span>{businessName}</span></div></div></header>
      <div className="workspace-content">{children}</div>
    </main>
  </div>;
}
