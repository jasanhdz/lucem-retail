'use client';

import { Activity, Archive, BarChart3, Bell, Bookmark, Calculator, ChevronDown, LayoutDashboard, LogOut, Plus, RotateCcw, Search, Settings, Store, UsersRound, Warehouse, type LucideIcon } from 'lucide-react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { getBusinesses, selectBusiness } from '@/services/businesses';
import { visibleWorkspaceRoutes, type WorkspaceRole } from '@/lib/workspace-navigation';
import { Brand } from './Brand';
import { MobileBottomNavigation } from './MobileBottomNavigation';

type Role = WorkspaceRole;
type Business = { id: string; name: string; role: Role };
type WorkspaceItem = { href: string; label: string; icon: LucideIcon; admin?: boolean; disabled?: boolean };
const groups: { label: string; items: WorkspaceItem[] }[] = [
  { label: 'Operaciones', items: [{ href: '/pos', label: 'Punto de venta', icon: Calculator }, { href: '/productos', label: 'Productos', icon: Archive }, { href: '/inventario', label: 'Inventario', icon: Warehouse }, { href: '/apartados', label: 'Apartados', icon: Bookmark }] },
  { label: 'Gestión', items: [{ href: '/dashboard', label: 'Resumen', icon: LayoutDashboard }, { href: '/reportes', label: 'Reportes', icon: BarChart3 }, { href: '/devoluciones', label: 'Devoluciones', icon: RotateCcw }] },
  { label: 'Administración', items: [{ href: '/usuarios', label: 'Usuarios y permisos', icon: UsersRound, admin: true, disabled: true }, { href: '/auditoria', label: 'Auditoría', icon: Activity, admin: true }, { href: '/configuracion', label: 'Configuración', icon: Settings, admin: true, disabled: true }] },
];
const names: Record<string, string> = Object.fromEntries(groups.flatMap(group => group.items.map(item => [item.href, item.label])));

export function WorkspaceShell({ children, businessName, role, userName, userEmail }: { children: React.ReactNode; businessName: string; role: Role; userName: string; userEmail: string }) {
  const pathname = usePathname(); const router = useRouter();
  const [businessOpen, setBusinessOpen] = useState(false); const [userOpen, setUserOpen] = useState(false);
  const userButtonRef = useRef<HTMLButtonElement>(null);
  const [userMenuPosition, setUserMenuPosition] = useState({ top: 0, left: 12 });
  const [catalogSearch, setCatalogSearch] = useState('');
  const operationSearchRef = useRef<HTMLInputElement>(null);
  const [topbarElement, setTopbarElement] = useState<HTMLElement | null>(null);
  const [businesses, setBusinesses] = useState<Business[]>([]); const [loading, setLoading] = useState(false); const [error, setError] = useState(''); const [switching, setSwitching] = useState('');
  const initials = userName.split(/\s+/).filter(Boolean).slice(0, 2).map(part => part[0]).join('').toUpperCase() || 'U';
  async function loadBusinesses() { setLoading(true); setError(''); try { const response = await getBusinesses(); const body = await response.json(); if (!response.ok) throw new Error(body.error || 'No se pudieron cargar los negocios.'); setBusinesses(Array.isArray(body.businesses) ? body.businesses : []); } catch (reason) { setError(reason instanceof Error ? reason.message : 'Error de conexión.'); } finally { setLoading(false); } }
  async function chooseBusiness(id: string) { if (!id || switching) return; setSwitching(id); setError(''); try { const response = await selectBusiness(id); const body = await response.json(); if (!response.ok) throw new Error(body.error || 'No se pudo cambiar de negocio.'); setBusinessOpen(false); router.push(typeof body.redirect === 'string' ? body.redirect : '/dashboard'); router.refresh(); } catch (reason) { setError(reason instanceof Error ? reason.message : 'Error de conexión.'); } finally { setSwitching(''); } }
  async function logout() { const response = await fetch('/api/auth/logout', { method: 'POST' }); if (response.ok) { router.push('/login'); router.refresh(); } }
   useEffect(() => { setBusinessOpen(false); setUserOpen(false); }, [pathname]);
   useEffect(() => { setCatalogSearch(''); }, [pathname]);
   const operationRoutes = ['/pos', '/productos', '/inventario', '/apartados', '/tickets'];
   const isOperationsRoute = operationRoutes.some((route) => pathname === route || pathname.startsWith(`${route}/`));
     const hasOperationSearch = true;
   useEffect(() => {
     const focusOperationSearch = () => {
       if (window.matchMedia('(min-width: 761px)').matches) operationSearchRef.current?.focus();
        else (document.querySelector<HTMLInputElement>('.pos-search input, .inventory-search input, .reservations-search input, .products-search input') ?? document.querySelector<HTMLInputElement>('.topbar-operation-search input'))?.focus();
     };
     const syncSearch = (event: Event) => {
       const value = (event as CustomEvent<string>).detail;
       if (typeof value === 'string') setCatalogSearch(value);
     };
     const shortcut = (event: KeyboardEvent) => {
       if (event.key === 'F1' && isOperationsRoute && pathname !== '/pos') {
         event.preventDefault();
         router.push('/pos');
       } else if (event.key === 'F3' && hasOperationSearch) {
         event.preventDefault();
         focusOperationSearch();
       }
     };
     window.addEventListener('pos:focus-search', focusOperationSearch);
     window.addEventListener('products:search-sync', syncSearch);
     window.addEventListener('operation-search-sync', syncSearch);
     window.addEventListener('keydown', shortcut);
     return () => {
       window.removeEventListener('pos:focus-search', focusOperationSearch);
       window.removeEventListener('products:search-sync', syncSearch);
       window.removeEventListener('operation-search-sync', syncSearch);
       window.removeEventListener('keydown', shortcut);
     };
   }, [hasOperationSearch, isOperationsRoute, pathname, router]);
    const operationSearchPlaceholder = pathname === '/pos'
     ? 'Buscar producto, SKU o código de barras… (F3)'
     : pathname.startsWith('/inventario')
       ? 'Buscar por producto, SKU o ubicación…'
       : pathname === '/apartados'
         ? 'Buscar producto, SKU o cliente…'
         : 'Buscar producto, SKU o código de barras…';
     const operationSearchLabel = pathname === '/pos' || pathname === '/productos' || pathname.startsWith('/tickets/')
      ? 'Buscar productos'
      : pathname.startsWith('/inventario')
        ? 'Buscar inventario'
        : pathname === '/apartados'
          ? 'Buscar apartados'
          : 'Buscar en el catálogo';
   function searchCatalog(value: string) {
     setCatalogSearch(value);
     if (pathname === '/pos') window.dispatchEvent(new CustomEvent('pos:search', { detail: value }));
      else if (pathname === '/inventario') window.dispatchEvent(new CustomEvent('inventory:search', { detail: value }));
      else if (pathname === '/inventario/movimientos') window.dispatchEvent(new CustomEvent('inventory-movements:search', { detail: value }));
      else if (pathname.startsWith('/inventario/')) return;
      else if (pathname === '/apartados') window.dispatchEvent(new CustomEvent('reservations:search', { detail: value }));
      else if (pathname.startsWith('/tickets/')) return;
      else if (pathname === '/dashboard' || pathname === '/devoluciones' || pathname === '/reportes' || pathname === '/auditoria') return;
      else window.dispatchEvent(new CustomEvent('products:search', { detail: value }));
    }
   useEffect(() => { setTopbarElement(document.querySelector<HTMLElement>('.workspace-topbar')); }, []);
  const allowed = new Set<string>(visibleWorkspaceRoutes(role).map(item => item.href));
  const permittedGroups = groups.map(group => ({ ...group, items: group.items.filter(item => item.disabled ? role === 'ADMIN' : allowed.has(item.href)) })).filter(group => group.items.length);
  const extraRoutes = permittedGroups.flatMap(group => group.items).filter(item => !item.disabled && !['/dashboard', '/pos', '/productos', '/inventario'].includes(item.href));
    return <><div className={`workspace ${isOperationsRoute ? 'workspace-operations' : ''}`}>
   <aside className="sidebar" aria-label="Navegación principal"><Brand/><div className="business-context" aria-label={`Negocio actual: ${businessName}, ${roleLabel(role)}`}><span className="business-avatar"><Store size={18}/></span><span className="business-context-label"><strong>{businessName}</strong><small>{roleLabel(role)}</small></span></div>
        <nav className="sidebar-nav" aria-label="Secciones del negocio">{permittedGroups.map(group => <div className="nav-group" key={group.label}><p className="nav-label">{group.label}</p>{group.items.map(item => { const Icon = item.icon; const active = pathname === item.href || pathname.startsWith(`${item.href}/`) || item.href === '/pos' && pathname.startsWith('/tickets/'); return item.disabled ? <span className="nav-link" key={item.href} aria-disabled="true"><Icon aria-hidden="true"/><span>{item.label}</span></span> : <Link className="nav-link" key={item.href} href={item.href} aria-current={active ? 'page' : undefined}><Icon aria-hidden="true"/><span>{item.label}</span></Link>; })}</div>)}</nav>
       <footer className="sidebar-footer"><span>Lucem Retail Cloud</span><small>v0.1.0</small></footer>
     </aside>
      <main className="workspace-main">
         <header className="workspace-topbar workspace-topbar-main">
          <Brand className="topbar-brand" />
          <div className="topbar-switch-wrap">
            <button type="button" className="topbar-switch" aria-expanded={businessOpen} onClick={() => { const next = !businessOpen; setBusinessOpen(next); if (next && !businesses.length) void loadBusinesses(); }}>
              <Store size={17} />
              <span className="topbar-switch-label"><small>Sucursal Activa</small><strong>{businessName}</strong></span>
              <ChevronDown size={16} />
            </button>
            {businessOpen && <div className="switcher-menu topbar-switcher-menu" aria-label="Seleccionar negocio">{loading ? <p role="status">Cargando negocios…</p> : error ? <div role="alert">{error}<button onClick={() => void loadBusinesses()}>Reintentar</button></div> : businesses.map(business => <button key={business.id} type="button" disabled={Boolean(switching)} aria-current={business.name === businessName ? 'true' : undefined} onClick={() => void chooseBusiness(business.id)}><strong>{business.name}</strong><small>{roleLabel(business.role)}</small>{switching === business.id ? '…' : ''}</button>)}</div>}
          </div>
          <Link className="button topbar-cta" href="/pos" aria-label="Nueva venta"><Plus size={17} /><span>Nueva venta</span></Link>
          {role === 'ADMIN' && <Link className="topbar-notifications" href="/auditoria" aria-label="Ver actividad de auditoría"><Bell size={20} aria-hidden="true" /><span aria-hidden="true" /></Link>}
          <div className="topbar-user-wrap">
             <button ref={userButtonRef} className="topbar-user" aria-expanded={userOpen} onClick={() => { if (!userOpen && userButtonRef.current) { const bounds = userButtonRef.current.getBoundingClientRect(); const menuWidth = Math.min(320, window.innerWidth - 24); setUserMenuPosition({ top: bounds.bottom + 10, left: Math.max(12, Math.min(bounds.right - menuWidth, window.innerWidth - menuWidth - 12)) }); } setUserOpen(value => !value); }}>
              <span className="topbar-user-copy"><strong>{userName}</strong><small>{roleLabel(role)}</small></span>
              <span className="user-avatar">{initials}</span>
            </button>
          </div>
        </header>
        {error && !businessOpen && <div className="shell-error" role="alert">{error}<button onClick={() => void loadBusinesses()}>Reintentar</button></div>}
        <div className="workspace-content">{children}</div>
        <MobileBottomNavigation extraRoutes={extraRoutes} />
      </main>
    </div>{hasOperationSearch && topbarElement && createPortal(<label className="topbar-operation-search"><Search size={18} aria-hidden="true"/><span className="sr-only">{operationSearchLabel}</span><input ref={operationSearchRef} aria-label={operationSearchLabel} placeholder={operationSearchPlaceholder} value={catalogSearch} onChange={(event) => searchCatalog(event.target.value)} onKeyDown={(event) => { if (pathname.startsWith('/tickets/') && event.key === 'Enter' && catalogSearch.trim()) router.push(`/pos?search=${encodeURIComponent(catalogSearch.trim())}`); if (pathname.startsWith('/inventario/') && pathname !== '/inventario/movimientos' && event.key === 'Enter' && catalogSearch.trim()) router.push(`/inventario?search=${encodeURIComponent(catalogSearch.trim())}`); }}/><kbd>F3</kbd></label>, topbarElement)}{userOpen && typeof document !== 'undefined' && createPortal(<div className="user-menu topbar-user-menu" style={{ top: userMenuPosition.top, left: userMenuPosition.left, right: 'auto' }}><div className="user-menu-profile"><span className="user-avatar">{initials}</span><span><strong>{userName}</strong><small>{userEmail}</small><em>{roleLabel(role)}</em></span></div><div className="user-menu-divider"/><nav className="user-menu-links" aria-label="Opciones de usuario"><Link href="/dashboard" onClick={() => setUserOpen(false)}><LayoutDashboard size={17}/><span>Resumen del negocio</span></Link><Link href="/negocios" onClick={() => setUserOpen(false)}><Store size={17}/><span>Cambiar de negocio</span></Link><Link href="/negocios/crear" onClick={() => setUserOpen(false)}><Plus size={17}/><span>Crear negocio</span></Link>{role === 'ADMIN' && <Link href="/auditoria" onClick={() => setUserOpen(false)}><Activity size={17}/><span>Actividad y auditoría</span></Link>}</nav><div className="user-menu-divider user-menu-divider-bottom"/><button type="button" onClick={() => void logout()}><LogOut size={16} /> Cerrar sesión</button></div>, document.body)}</>;
}
function roleLabel(role: Role) { return ({ ADMIN: 'Administrador', SELLER: 'Vendedor', INVENTORY_MANAGER: 'Encargado de inventario' })[role]; }
