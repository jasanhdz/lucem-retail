export const qaConfig = {
  viewports: [
    { id: 'desktop', width: 1440, height: 900 },
    { id: 'tablet', width: 768, height: 1024 },
    { id: 'mobile', width: 390, height: 844 },
  ],
  publicPages: [
    { id: 'home', area: 'auth', path: '/', stitch: undefined },
    { id: 'login', area: 'auth', path: '/login', stitch: 'diseno/pantalla_a_iniciar_sesi_n/screen.png' },
    { id: 'register', area: 'auth', path: '/registro', stitch: 'diseno/desktop_registro_crear_cuenta/screen.png' },
  ],
  authenticatedPages: [
    { id: 'businesses', area: 'businesses', path: '/negocios', role: 'ADMIN' },
    { id: 'business-create', area: 'businesses', path: '/negocios/crear', role: 'ADMIN' },
    { id: 'business-giro', area: 'businesses', path: '/negocios/giro', role: 'ADMIN' },
    { id: 'business-confirmation', area: 'businesses', path: '/negocios/confirmacion', role: 'ADMIN' },
    { id: 'dashboard', area: 'dashboard', path: '/dashboard', role: 'ADMIN' },
    { id: 'products', area: 'products', path: '/productos', role: 'ADMIN' },
    { id: 'product-create', area: 'products', path: '/productos/nuevo', role: 'ADMIN' },
    { id: 'inventory', area: 'inventory', path: '/inventario', role: 'ADMIN' },
    { id: 'kardex', area: 'inventory', path: '/inventario/movimientos', role: 'ADMIN' },
    { id: 'pos', area: 'pos', path: '/pos', role: 'ADMIN' },
    { id: 'reservations', area: 'reservations', path: '/apartados', role: 'ADMIN' },
    { id: 'returns', area: 'returns', path: '/devoluciones', role: 'ADMIN' },
    { id: 'reports', area: 'reports', path: '/reportes', role: 'ADMIN' },
    { id: 'audit', area: 'audit', path: '/auditoria', role: 'ADMIN' },
    { id: 'profile', area: 'profile', path: '/perfil', role: 'ADMIN' },
  ],
  thresholds: {
    publicNavigationP95Ms: 2500,
    publicApiP95Ms: 1500,
    accessibilityFailImpacts: ['critical', 'serious'] as const,
  },
};
