# Lucem QA Lab — arquitectura QA-01

## Componentes

```text
lucem-audit CLI
 ├─ route discovery (app/ + src/app/)
 ├─ declarative capability registry (qa/features/registry.ts)
 ├─ source-level interactive-control inventory
 ├─ coverage/status engine
 ├─ Playwright orchestration + existing E2E suites
 │   ├─ read-only public UI runner (loopback:3113)
 │   └─ mutation runner (QA_DATABASE_URL only; loopback:55433)
 ├─ axe / responsive / performance / visual evidence
 └─ sanitized reports and ZIP package (qa/reports/)
```

The application under test remains independent: the auditor records behavior and evidence and never edits application features or applies fixes. Forge Planner owns the rubric; Generator owns QA infrastructure; Evaluator records findings only. A route or interactive element appearing in source is inventory evidence, not a functional pass.

## Discovery and capability registry

`scripts/qa/core.ts` walks `app/` and `src/app/` for `page.*` and `route.*`, removes route groups, normalizes `[id]`, `[...slug]`, and `[[...slug]]`, extracts route-handler methods, and computes deterministic IDs. The registry `qa/features/registry.ts` describes business capabilities, target routes/methods, roles, criticality, required states, test files, fixtures, screenshot requirements, invariants, and Stitch references. Imported JSX surfaces are inspected for forms and interactive controls; actions with no registered feature/control contract are reported as `UNCOVERED`.

The audit states are `PASS`, `FAIL`, `UNCOVERED`, `NOT_EXECUTED`, `NOT_IMPLEMENTED`, and `BLOCKED`. Discovery never changes any non-PASS state into PASS. Future states that cannot be discovered from code must be declared explicitly in the feature's `requiredStates`.

## Runner and data safety

Read-only public-screen checks run on a private development server bound to `127.0.0.1:3113`, with a dummy loopback DB URL and no database operations. Functional Playwright runs require `QA_DATABASE_URL` exactly identifying PostgreSQL database/user `lucem_qa`, loopback host, port `55433`; no fallback to `DATABASE_URL` or `E2E_DATABASE_URL` is allowed. Before migrations, seed, cleanup, or server startup, Prisma queries `current_database()` and `current_user`. Existing E2E guards accept QA only when `QA_RUN=1`, the explicit QA URL agrees and the serialized runner lock is held; default E2E identity remains `lucem_retail_e2e`/`lucem_e2e`/55432. Full runs are serialized per checkout with `flock`, reseed only the owned DEV-TEST-01 business/user namespace before each Playwright config, and use a fresh session secret per suite so retained global rate-limit bucket rows cannot collide. No global rate-limit rows are deleted in QA. The shared DEV-TEST-01 multi-file E2E config uses one worker because tests share stock, sales and session fixtures. QA security simulates valid CF client-IP headers only on its loopback server; it does not start a tunnel or contact Cloudflare.

`compose.qa.yml` has its own PostgreSQL service and project volume, bound only to loopback. The service joins a dedicated bridge with IP masquerading disabled to avoid container egress NAT. A Docker `internal` network is intentionally not used for the published service: the host-engine diagnostic showed `HostConfig.PortBindings` configured but `NetworkSettings.Ports` null when PostgreSQL was attached only to an internal network. The provisioner verifies the actual `docker port` mapping and loopback TCP before it reports READY. Its `reconcile` operation validates exact project/service labels, database identity, and the one named QA data mount before force-recreating only the container; it never removes the data volume. In `QA_RUN=1`, product image uploads/readback use only `.qa-uploads/products`, never `public/uploads/products`; cleanup verifies the QA DB identity, refuses symlink/escaped/non-regular paths, and removes only files whose names have an exact owned QA business-ID prefix. Playwright traces and storage states are written below the private per-run `qa/reports/<runId>/traces/` tree; the portable ZIP omits the entire trace tree. Local `docker compose down -v` is intentionally not part of the auditor; operators must verify the exact Compose project before destructive volume removal. No QA service or QA credentials were provisioned during initial implementation because Docker access and QA secrets were unavailable.

## Observations and reports

Playwright captures console/page errors, failed requests, unexpected HTTP errors, responsive overflow/offscreen/overlap, screenshots at 1440×900, 768×1024, and 390×844, axe violations, and five navigation samples per public route. When QA DB is available, it creates a namespaced 10,000-product synthetic performance fixture and samples paginated product/dashboard APIs; cleanup is limited to the fixture business and QA-only storage. Missing visual baselines are reported as `NOT_EXECUTED`; no baseline is approved automatically. The Stitch report pairs current screen captures with checked-in Stitch references. Existing domain suites are reused in sequence only after the QA URL guard passes.

Each run writes the report schema described in `QA-LAB-REPORT-SCHEMA.md` to ignored `qa/reports/<runId>/`. `PLAYWRIGHT-TESTS.json` records test IDs/titles/status/evidence separately from command checks; full reports compare same-revision test IDs against prior isolated runs. Findings carry an evidence-backed classification, and uncertain failures remain `UNDETERMINED` or `SUSPECTED`. A default QA performance fixture seeds 10,000 products and 10,000 variants in 500-row batches only after exact QA identity checks; it is removed by namespaced QA cleanup. Export sanitizes textual artifacts, omits HAR/trace/storage-state/database artifacts, includes synthetic-fixture screenshots, writes a package manifest and SHA-256 checksum, and aborts if sanitization or required files fail. The HTML report is `index.html`; a shareable ZIP is `qa/reports/lucem-audit-YYYYMMDD-HHMMSS.zip`.

No AI provider is configured. The audit does not send screenshots or application data to external services.

## Current limitations

- The baseline registry covers major modules but reports uncovered routes and UI controls as findings; discovered routes do not imply behavior coverage.
- Authenticated cross-module Playwright runs require local `lucem_qa` plus synthetic `E2E_*_PASSWORD` values.
- Read-only visual/axe/performance checks cover public login/registration screens; authenticated checks run after QA DB preflight, with each individual result distinct from suite/route coverage.
- No approved visual baselines exist yet. Stitch references are paired for human inspection but are not declared pixel-perfect PASS.
- Lighthouse and load/stress tests are not run; performance uses bounded browser navigation samples only.
- Automated axe is partial accessibility evidence, not certification.
