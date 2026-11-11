# QA Lab report schema

## Directorio

`qa/reports/<runId>/` contiene:

| Archivo | Contenido |
|---|---|
| `EXECUTIVE-SUMMARY.md` | Perfil, estado, rutas, controles, hallazgos y bloqueos |
| `FUNCTIONAL-REPORT.md` | Ruta, estado de cobertura y asociación de test |
| `UX-VISUAL-REPORT.md` | Overflow, baseline y diferencias UX verificables |
| `ACCESSIBILITY-REPORT.md` | Violaciones axe, regla, impacto y nodo |
| `PERFORMANCE-REPORT.md` | Muestras, métrica, unidad, entorno, repeticiones y umbral |
| `COVERAGE-MATRIX.md` | Rutas y controles con estado individual |
| `ROUTE-INVENTORY.json` | Inventario normalizado, métodos, fuente, roles, tests y estado |
| `FINDINGS.json` | Hallazgos estructurados con ID/severidad/reproducción/evidencia |
| `SCREENSHOT-MANIFEST.json` | Ruta, viewport, tamaño, referencia Stitch y comparación |
| `metadata.json` | Run ID, commit, perfil, tiempos y conteos |
| `index.html` | Resumen HTML navegable |
| `screenshots/`, `diffs/`, `stitch/` | Evidencia visual vigente, diffs y referencias copiadas |
| `browser-events/`, `accessibility/`, `performance/` | Evidencia de navegador redactada y mediciones |
| `traces/`, `playwright-report/` | Artefactos locales; traces/HAR quedan fuera del ZIP portable |

## RouteRecord

```json
{
  "id": "stable-sha256-prefix",
  "path": "/productos/:id",
  "kind": "page|api",
  "methods": ["GET"],
  "source": "app/(workspace)/productos/[id]/page.tsx",
  "dynamicSegments": ["id"],
  "fixtureStatus": "registered|FIXTURE_PENDING|not-dynamic",
  "excluded": false,
  "auth": "public|protected|unknown",
  "roles": ["ADMIN"],
  "featureIds": ["PRODUCT-DETAIL-EDIT"],
  "tests": ["e2e/dev-03/products.spec.ts"],
  "coverageStatus": "PASS|FAIL|UNCOVERED|NOT_EXECUTED|NOT_IMPLEMENTED|BLOCKED"
}
```

Dynamic routes with no declared sample fixture retain `fixtureStatus: FIXTURE_PENDING`; a matching path template alone is not treated as resolved coverage.

## Finding

`FINDINGS.json` entries carry: `id`, `category`, `severity`, `module`, `feature`, `route`, `role`, `device`, `scenario`, `steps`, `expected`, `actual`, `evidence`, `source`, `confidence`, `status`, and `recommendation`. Hallazgo técnico reproducible = `CONFIRMED`; señal heurística = `SUSPECTED`; juicio visual pendiente = `NEEDS_MANUAL_REVIEW`; corrección demostrada = `RESOLVED`; falso positivo con justificación = `FALSE_POSITIVE`.

## Evidencia portable

`PACKAGE-MANIFEST.json` dentro del ZIP enumera cada archivo incluido, bytes, SHA-256 y si fue sanitizado, más los omitidos con motivo. El ZIP tiene un `.sha256` externo. Los archivos textuales se redactan con los secretos conocidos, cookies, tokens, URLs de DB, correos y patrones de PII; storage states, traces, HAR y datos de DB se omiten. Si un artefacto requerido no pasa sanitización, no se crea ZIP.
