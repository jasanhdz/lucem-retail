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
| `COVERAGE-MATRIX.md` | Rutas, controles y estados requeridos con resultado individual |
| `ROUTE-INVENTORY.json` | Inventario normalizado, métodos, fuente, roles, tests y estado |
| `FEATURE-COVERAGE.json` | Capacidades registradas y cobertura de cada estado requerido |
| `FINDINGS.json` | Hallazgos estructurados con ID/severidad/reproducción/evidencia |
| `PLAYWRIGHT-TESTS.json` | ID estable, suite/proyecto, archivo/título, estado individual y log de evidencia |
| `ISOLATED-FULL-COMPARISON.json` | Diferencias por ID entre suites aisladas y full en la misma revisión |
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
  "module": "products",
  "methods": ["GET"],
  "source": "app/(workspace)/productos/[id]/page.tsx",
  "dynamicSegments": ["id"],
  "lastValidatedAt": "ISO-8601 timestamp",
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

## FeatureStateRecord

Each `FEATURE-COVERAGE.json` row contains `featureId`, `featureTitle`, `area`, `state`, `testIds`, and a state result. A required state without a `testCases`/`stateTests` mapping is `UNCOVERED`; a mapped test not run is `NOT_EXECUTED`; a target or fixture missing is `BLOCKED`; only executed assertions can be `PASS`.

## Finding

`FINDINGS.json` entries carry: `id`, `category`, `severity`, `module`, `feature`, `route`, `role`, `device`, `scenario`, `steps`, `expected`, `actual`, `evidence`, `source`, `confidence`, optional `classification`, `status`, and `recommendation`. Classifications distinguish `PRODUCT_DEFECT`, `TEST_DEFECT`, `FIXTURE_CONTAMINATION`, `ENVIRONMENT_FAILURE`, `COVERAGE_GAP`, `SUSPECTED`, and `UNDETERMINED`. Weak heuristic signals stay `SUSPECTED`/`UNDETERMINED`; no difference is called a false positive without evidence. Hallazgo técnico reproducible = `CONFIRMED`; juicio visual pendiente = `NEEDS_MANUAL_REVIEW`; corrección demostrada = `RESOLVED`; falso positivo con justificación = `FALSE_POSITIVE`.

## Evidencia portable

`PACKAGE-MANIFEST.json` dentro del ZIP enumera cada archivo incluido, bytes, SHA-256 y si fue sanitizado, más los omitidos con motivo. El ZIP tiene un `.sha256` externo. Los archivos textuales se redactan con los secretos conocidos, cookies, tokens, URLs de DB, correos y patrones de PII; storage states, traces, HAR y datos de DB se omiten. Si un artefacto requerido no pasa sanitización, no se crea ZIP.
