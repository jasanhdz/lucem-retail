# QA-01 Lab

`npx tsx scripts/qa/lucem-audit.ts --help` documents the `lucem-audit` options. `--coverage` discovers App Router pages and route handlers under `app/` and `src/app/`, normalizes route groups and dynamic segments, and writes JSON, Markdown and HTML reports under the ignored `test-results/qa-01/`. Discovery is inventory only: routes without an explicitly registered executable feature remain `UNCOVERED`.

The registry is `qa/features/registry.ts`. Definitions must reference an existing route, have unique IDs, tags, area and profile, and use a recognized state. Existing domain E2E projects have not been proven to target the dedicated QA database, so the functional, visual, accessibility, performance and packaging modes report `NOT_IMPLEMENTED` and do not start a browser/server.

## Dedicated database

Only `QA_DATABASE_URL` is accepted by the guard. It must target `lucem_qa` as user `lucem_qa` on loopback port `55433`; the connected database and user must be checked before mutation. `DATABASE_URL` is never a fallback. `compose.qa.yml` binds only `127.0.0.1:55433` and uses an isolated project volume. No QA credentials are provisioned in this repository.

## Evidence and status

States are `PASS`, `UNCOVERED`, `NOT_EXECUTED`, `NOT_IMPLEMENTED`, and `BLOCKED`; no state other than PASS denotes completed coverage. `sanitize` redacts common token, cookie, password, PostgreSQL credential, email and SSN patterns. Browser evidence sanitization/ZIP generation is not yet implemented; therefore no evidence package is emitted. Never label unsanitized evidence as publishable.

Run `npm test -- tests/qa` for utility and safety tests. E2E, visual baselines, axe and performance remain BLOCKED/NOT_IMPLEMENTED pending a dedicated QA environment and executable scenarios.
