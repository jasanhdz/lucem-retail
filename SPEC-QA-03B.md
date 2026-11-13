# QA-03B — Persisted QA runtime and full coverage validation

## Objetivo
Load only authorized local QA credentials automatically, verify the live isolated PostgreSQL identity, and complete QA-03 coverage, hydration, and full-audit validation with attributable evidence.

## Scope
Include secure loading of `/home/jasan/apps/lucem-retail/.qa-private/runtime.env` for mutating QA entry points, permission/path/owner checks, strict `lucem_qa` target and connected identity validation, test execution, QA-03 evidence coverage integration, hydration investigation, metric reconciliation, sanitized reporting, Forge evaluation, and fast-forward publication of QA-only commits.

Exclude fallback to `DATABASE_URL` or `E2E_DATABASE_URL`, credential disclosure, new database creation, password rotation, staging/production/Cloudflare/n8n access, commercial application changes without a reproduced cause, edits to the user's existing `SPEC.md`, unrelated local changes, main merges, and force pushes.

## User flows
1. `npm run qa:full` and `lucem-audit --full` resolve credentials from explicit `QA_DATABASE_URL` or the one authorized private runtime file; other files and environment variables are never credential fallbacks. File values are parsed without logging, validated against strict key allowlists and filesystem permissions, then passed to the serialized QA runner.
2. Before any database mutation, validate URL protocol/loopback/port/database/user and query PostgreSQL for `current_database()` and `current_user`. Refuse the run if either identity is not exactly `lucem_qa`, or if runtime credentials, lock, or fixtures are unavailable.
3. Run unit tests, typecheck, lint, QA Lab-directed tests, and `qa:full`; record commands, exit codes, suites, per-test outcomes, fixtures, cleanup, route/state/control coverage, and sanitized ZIP location/checksum.
4. Match registered test evidence to exact Playwright file/title and required assertions. Report each state/control as `PASS`, `FAIL`, `NOT_EXECUTED`, `NOT_MAPPED`, `UNCOVERED`, or `BLOCKED` as applicable, while separately reporting evidence registration as `UNREGISTERED`, `REGISTERED_UNTESTED`, or `VERIFIED`. A test without a matched executed assertion never verifies coverage.
5. Reconcile the historical and current route/state/control populations by stable keys, denominator, inclusion rules, and status. Preserve historical reports and explain unmatched/changed entities; do not derive percentages from different populations.
6. Re-run hydration capture under equivalent audited browser contexts, preserve complete console/request evidence, and compare exact SSR/client input attributes and mutations. Inspect test code, SSR/components, environment, and browser modifications; classify each event as `APP`, `TEST`, `ENVIRONMENT`, `MIXED`, or `UNDETERMINED`. Non-reproduction remains pending confirmation.
7. Evaluator writes a structured Forge findings report covering credential loading and secrecy, database identity, authenticated execution, fixture ownership/cleanup, evidence traceability, hydration classification, report generation, ZIP sanitization, blockers, and Git publication.
8. Publish only intended QA-03/03B files using focused commits and fast-forward push to `feature/lucem-ui-redesign-v1`, preserving unrelated worktree changes.

## Modelo de datos
No schema/database changes. Runtime credential source: allowlisted key/value entries in a regular, non-symlink private file owned by the current user, mode 0600, within an owned directory mode 0700. Audit evidence extends existing QA Lab report structures with credential-source status (never secret values), connected DB identity, case-to-test outcome links, state/control evidence status, baseline comparison populations, and hydration occurrence classification/provenance. Existing QA report and ZIP sanitization formats remain authoritative.

## Stack y decisiones técnicas
Use existing Node.js/TypeScript QA runner, `flock` lock, Prisma identity query, Playwright result parser, QA report/export code, local PostgreSQL service and the existing private runtime file only. The loader accepts a hard-coded repository-relative `.qa-private/runtime.env` path; rejects symlinks, permissive modes, unexpected owners, malformed/duplicate/disallowed keys; never prints values; explicit `QA_DATABASE_URL` may override the file only after the same target and connected-identity validation. Neither `DATABASE_URL` nor `E2E_DATABASE_URL` is a source. Ensure direct `lucem-audit --full` and npm QA entry points use identical safeguards. Do not start, restart, reset, provision, or clean resources outside the existing run-owned fixture cleanup contract.

Required checks: unit tests, `npm run typecheck`, `npm run lint`, QA Lab focused evidence tests, hydration probe in audited browser setup, and `npm run qa:full`. Retain run ID and sanitized ZIP SHA-256. Do not report unexecuted criteria as passed.

## Assumptions
- The runtime file path is explicitly authorized by the user; no other local secret source is authorized.
- Existing QA PostgreSQL at loopback port 55433 can be queried without restarting it. If absent or identity differs, stop before mutation and report `BLOCKED`.
- Explicit QA URL environment override is permitted only if it identifies and connects to the same dedicated `lucem_qa` target.
- Historical 76 states and 311 controls may not be directly comparable to the current 75-state/317-control inventory; comparison requires stable entity intersection and documented extraction rules.
- Historical hydration events that cannot be reproduced or fully reconstructed remain `UNDETERMINED`/pending confirmation, not resolved.
- Existing user-local changes are preserved and excluded from QA commits.

## Rubric de evaluación
1. **Authorized loader:** automatic QA runtime loading works for both npm and direct CLI full runs; only the exact private path is eligible.
2. **Secret protection:** directory/file type, symlink status, ownership, modes, key allowlist, parse errors, and duplicate keys are checked; no credential values appear in logs/reports/ZIP.
3. **Target guard:** URL and connected PostgreSQL identity both prove database/user `lucem_qa` on loopback port 55433; no DATABASE/E2E fallback is used.
4. **Serialized full run:** QA lock, preparation, real authenticated tests, observation, and owner-scoped cleanup are evidenced; unavailable prerequisites stop safely.
5. **Evidence mapping:** exact Playwright file/title/assertions, fixture/role, execution state, and report references drive state/control verification; non-executed tests do not verify.
6. **Status distinctions:** PASS, FAIL, NOT_EXECUTED, NOT_MAPPED, UNCOVERED, BLOCKED and evidence registration states remain distinct in structured output.
7. **Coverage reconciliation:** previous/current counts include explicit numerator, denominator, stable IDs, inclusion criteria, intersection and unresolved entities; no artificial percentage changes.
8. **Hydration accounting:** all recoverable historic occurrences retain IDs/provenance; exact deltas are evidence-backed, reproduction attempts preserve console/network errors, and non-reproduction is pending confirmation.
9. **Hydration classification:** each occurrence/signature has APP/TEST/ENVIRONMENT/MIXED/UNDETERMINED classification, confidence, evidence for/against, and no app fix without reproduced cause.
10. **Report integrity:** full structured report contains run/revision/commands/checks/routes/states/controls/findings/blocked items/fixtures/cleanup and sanitized exports.
11. **Verification commands:** unit, typecheck, lint and directed QA checks have actual captured exit codes and outcomes.
12. **Evaluator completeness:** all criteria are reviewed with explicit PASS/FAIL/BLOCKED and reproducible evidence; outstanding findings remain open.
13. **Publication boundaries:** only QA-03/03B changes are committed; commits are reviewed and fast-forward pushed to the requested feature branch, with no unrelated changes, main merge, or force push.
