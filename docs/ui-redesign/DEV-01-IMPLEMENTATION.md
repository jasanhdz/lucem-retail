# DEV-01 — Implementación de interfaz

## Alcance realizado

- Página de entrada pública `/` con identidad Lucem Retail y acceso explícito al login.
- `/login` conectado sin intermediarios a `signIn` de `src/services/auth.ts`; valida campos en el navegador, informa errores recuperables, muestra progreso y permite mostrar/ocultar contraseña.
- `/negocios` consume `getBusinesses` y `selectBusiness` sin cambiar sus endpoints ni payloads. Incluye carga, error/reintento, vacío informativo, selección efímera y confirmación.
- Shell de rutas workspace: navegación agrupada según las secciones existentes, negocio/usuario de la sesión actual, estado activo de ruta y drawer móvil operable con Escape, overlay y cierre al navegar. El layout conserva `getAuth` y el redirect a `/login`. Los contenidos workspace DEV-00 continúan como placeholder; no se implementan módulos DEV-02. `/tickets/[id]` queda intacta.
- Tokens CSS, estados de foco, objetivos táctiles, estilos responsivos, fuentes locales y pruebas E2E con mocks de red.

## Autoridad visual y diferencias

La interfaz adopta como autoridad `diseno/retail_operational_clarity/DESIGN.md`: Plus Jakarta Sans, primario profundo `#102B2A`, acento verde, superficies blancas/neutrales, bordes finos, radios suaves y controles de mínimo 44 px. El panel de acceso utiliza el primario oscuro como superficie de marca; las páginas de autenticación y el workspace conservan fondos claros y tarjetas neutras.

`diseno/retail_pos_inventory_system/DESIGN.md` se considera referencia suplementaria centrada en POS/inventario. Propone base mint `#E7FEF8` y composición alternativa con Inter para texto denso; esos rasgos no sustituyen la paleta neutra ni la composición primaria en DEV-01. Se aprovechan únicamente patrones compatibles de legibilidad, contraste, foco y ergonomía táctil. No se modificó ningún archivo bajo `diseno/`.

## Límites de evidencia

Los E2E de DEV-01 usan rutas Playwright para respuestas controladas, sin iniciar sesión real ni escribir en base de datos. Se verificaron la navegación solicitada a `/dashboard` después del login/selección y se dejó que la guarda sin sesión redirigiera a `/login`; el shell autenticado está protegido por `getAuth` y no se generó una sesión de prueba persistida. Por eso la UI autenticada del shell y su navegación no se afirman como verificadas en navegador. No se presenta una captura como validación visual en dispositivo; comparación pixel a pixel con Stitch requiere evidencia adicional.

En verificación inicial, `CI=1 npm run test:e2e -- --reporter=list` reportó 4 fallos por selectores ambiguos. Se corrigieron los selectores, se añadieron escenarios de rechazo de red/reintento para login y carga de negocios, y se hizo explícito el outline de foco por teclado en los campos. La ejecución final pasó 10/10 pruebas activas y omitió 11 pruebas E2E legacy DEV-00. `npm run lint`, `npm run typecheck`, `npm test` (3 suites, 5 pruebas) y `npm run build` terminaron con código 0. El build muestra la advertencia existente de que el plugin Next.js no está detectado en ESLint. Una ejecución intermedia de Playwright no pudo iniciar porque un servidor previo aún ocupaba el puerto 3101; se detuvo ese proceso y la ejecución final se completó correctamente.
