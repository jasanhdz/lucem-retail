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

Los E2E de DEV-01 usan rutas Playwright para respuestas controladas, sin iniciar sesión real ni escribir en base de datos. El shell autenticado está protegido por `getAuth`; no se generó una sesión de prueba persistida ni se presenta una captura como validación visual en dispositivo. Comparación pixel a pixel con Stitch y recorrido de shell con sesión autenticada requieren evidencia adicional del entorno con sesión aislada.

En esta pasada `npm run build` pasó en el segundo intento (el primero falló durante generación estática con `Invariant: no direct app page entry found for /_not-found`; el reintento generó las 32 páginas). `CI=1 npm run test:e2e -- --reporter=list` quedó bloqueado al iniciar el servidor de Playwright: Next falló repetidamente al cargar `.next/server/vendor-chunks/@swc.js` (`MODULE_NOT_FOUND`; el build emite chunks para `bcryptjs`, `lucide-react` y `next`, no ese archivo), agotando el timeout de 120 s. Por tanto, los E2E nuevos están implementados pero no verificados en navegador.
