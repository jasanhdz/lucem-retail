'use client';

import { Activity, BarChart3, Boxes, ChevronDown, ClipboardList, LayoutDashboard, LogOut, Package, RotateCcw, ShoppingCart, Store } from 'lucide-react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { getBusinesses, selectBusiness } from '@/services/businesses';
import { visibleWorkspaceRoutes, type WorkspaceRole } from '@/lib/workspace-navigation';
import { Brand } from './Brand';
import { MobileBottomNavigation } from './MobileBottomNavigation';

type Role = WorkspaceRole;
type Business = { id: string; name: string; role: Role };
const groups = [
  { label: 'Operaciones', items: [{ href: '/pos', label: 'Punto de venta', icon: ShoppingCart }, { href: '/productos', label: 'Productos', icon: Package }, { href: '/inventario', label: 'Inventario', icon: Boxes }, { href: '/apartados', label: 'Apartados', icon: ClipboardList }] },
  { label: 'Gestión', items: [{ href: '/dashboard', label: 'Resumen', icon: LayoutDashboard }, { href: '/reportes', label: 'Reportes', icon: BarChart3 }, { href: '/devoluciones', label: 'Devoluciones', icon: RotateCcw }] },
  { label: 'Administración', items: [{ href: '/auditoria', label: 'Auditoría', icon: Activity, admin: true }] },
];
const names: Record<string, string> = Object.fromEntries(groups.flatMap(group => group.items.map(item => [item.href, item.label])));

export function WorkspaceShell({ children, businessName, role, userName, userEmail }: { children: React.ReactNode; businessName: string; role: Role; userName: string; userEmail: string }) {
  const pathname = usePathname(); const router = useRouter();
  const [businessOpen, setBusinessOpen] = useState(false); const [userOpen, setUserOpen] = useState(false);
  const [businesses, setBusinesses] = useState<Business[]>([]); const [loading, setLoading] = useState(false); const [error, setError] = useState(''); const [switching, setSwitching] = useState('');
  const initials = userName.split(/\s+/).filter(Boolean).slice(0, 2).map(part => part[0]).join('').toUpperCase() || 'U';
  async function loadBusinesses() { setLoading(true); setError(''); try { const response = await getBusinesses(); const body = await response.json(); if (!response.ok) throw new Error(body.error || 'No se pudieron cargar los negocios.'); setBusinesses(Array.isArray(body.businesses) ? body.businesses : []); } catch (reason) { setError(reason instanceof Error ? reason.message : 'Error de conexión.'); } finally { setLoading(false); } }
  async function chooseBusiness(id: string) { if (!id || switching) return; setSwitching(id); setError(''); try { const response = await selectBusiness(id); const body = await response.json(); if (!response.ok) throw new Error(body.error || 'No se pudo cambiar de negocio.'); setBusinessOpen(false); router.push(typeof body.redirect === 'string' ? body.redirect : '/dashboard'); router.refresh(); } catch (reason) { setError(reason instanceof Error ? reason.message : 'Error de conexión.'); } finally { setSwitching(''); } }
  async function logout() { const response = await fetch('/api/auth/logout', { method: 'POST' }); if (response.ok) { router.push('/login'); router.refresh(); } }
  useEffect(() => { setBusinessOpen(false); setUserOpen(false); }, [pathname]);
  const allowed = new Set<string>(visibleWorkspaceRoutes(role).map(item => item.href));
  const permittedGroups = groups.map(group => ({ ...group, items: group.items.filter(item => allowed.has(item.href)) })).filter(group => group.items.length);
  const extraRoutes = permittedGroups.flatMap(group => group.items).filter(item => !['/dashboard', '/pos', '/productos', '/inventario'].includes(item.href));
  return <div className="workspace">
    <aside className="sidebar" aria-label="Navegación principal"><Brand/><div className="sidebar-switch-wrap"><button type="button" className="business-context" aria-expanded={businessOpen} onClick={() => { const next = !businessOpen; setBusinessOpen(next); if (next && !businesses.length) void loadBusinesses(); }}><span className="business-avatar"><Store size={18}/></span><span className="business-context-label"><strong>{businessName}</strong><small>{roleLabel(role)}</small></span><ChevronDown size={17}/></button>{businessOpen && <div className="switcher-menu" aria-label="Seleccionar negocio">{loading ? <p role="status">Cargando negocios…</p> : error ? <div role="alert">{error}<button onClick={() => void loadBusinesses()}>Reintentar</button></div> : businesses.map(business => <button key={business.id} type="button" disabled={Boolean(switching)} aria-current={business.name === businessName ? 'true' : undefined} onClick={() => void chooseBusiness(business.id)}><strong>{business.name}</strong><small>{roleLabel(business.role)}</small>{switching === business.id ? '…' : ''}</button>)}</div>}</div>
      <nav className="sidebar-nav" aria-label="Secciones del negocio">{permittedGroups.map(group => <div className="nav-group" key={group.label}><p className="nav-label">{group.label}</p>{group.items.map(item => { const Icon = item.icon; const active = pathname === item.href || pathname.startsWith(`${item.href}/`); return <Link className="nav-link" key={item.href} href={item.href} aria-current={active ? 'page' : undefined}><Icon aria-hidden="true"/><span>{item.label}</span></Link>; })}</div>)}</nav>
      <div className="sidebar-bottom"><button className="user-summary" type="button" aria-expanded={userOpen} onClick={() => setUserOpen(value => !value)}><span className="user-avatar">{initials}</span><span className="user-details"><strong>{userName}</strong><small>{roleLabel(role)}</small></span><ChevronDown size={16}/></button>{userOpen && <div className="user-menu"><span>{userEmail}</span><button type="button" onClick={() => void logout()}><LogOut size={16}/> Cerrar sesión</button></div>}</div>
    </aside>
    <main className="workspace-main"><header className="workspace-topbar"><div className="topbar-switch-wrap"><button type="button" className="topbar-switch" aria-expanded={businessOpen} onClick={() => { const next = !businessOpen; setBusinessOpen(next); if (next && !businesses.length) void loadBusinesses(); }}><Store size={17}/><span>{businessName}</span><ChevronDown size={16}/></button>{businessOpen && <div className="switcher-menu topbar-switcher-menu" aria-label="Seleccionar negocio">{loading ? <p role="status">Cargando negocios…</p> : error ? <div role="alert">{error}<button onClick={() => void loadBusinesses()}>Reintentar</button></div> : businesses.map(business => <button key={business.id} type="button" disabled={Boolean(switching)} aria-current={business.name === businessName ? 'true' : undefined} onClick={() => void chooseBusiness(business.id)}><strong>{business.name}</strong><small>{roleLabel(business.role)}</small>{switching === business.id ? '…' : ''}</button>)}</div>}</div><Link className="button topbar-cta" href="/pos" aria-label="Nueva venta"><ShoppingCart size={17}/><span>Nueva venta</span></Link><div className="topbar-user-wrap"><button className="topbar-user" aria-expanded={userOpen} onClick={() => setUserOpen(value => !value)}><span>{userName}</span><span className="user-avatar">{initials}</span></button>{userOpen && <div className="user-menu topbar-user-menu"><span>{userEmail} · {roleLabel(role)}</span><button type="button" onClick={() => void logout()}><LogOut size={16}/> Cerrar sesión</button></div>}</div></header>{error && !businessOpen && <div className="shell-error" role="alert">{error}<button onClick={() => void loadBusinesses()}>Reintentar</button></div>}<div className="workspace-content">{children}</div><MobileBottomNavigation extraRoutes={extraRoutes}/></main>
  </div>;
}
function roleLabel(role: Role) { return ({ ADMIN: 'Administrador', SELLER: 'Vendedor', INVENTORY_MANAGER: 'Encargado de inventario' })[role]; }
