export type WorkspaceRole = 'ADMIN' | 'SELLER' | 'INVENTORY_MANAGER';
export const workspaceRoutes = [
  { href: '/pos', label: 'Punto de venta', group: 'Operaciones' },
  { href: '/productos', label: 'Productos', group: 'Operaciones' },
  { href: '/inventario', label: 'Inventario', group: 'Operaciones' },
  { href: '/apartados', label: 'Apartados', group: 'Operaciones' },
  { href: '/dashboard', label: 'Resumen', group: 'Gestión' },
  { href: '/reportes', label: 'Reportes', group: 'Gestión' },
  { href: '/devoluciones', label: 'Devoluciones', group: 'Gestión' },
  { href: '/auditoria', label: 'Auditoría', group: 'Administración', adminOnly: true },
] as const;
export function visibleWorkspaceRoutes(role: WorkspaceRole) {
  return workspaceRoutes.filter(route => !('adminOnly' in route && route.adminOnly) || role === 'ADMIN');
}
