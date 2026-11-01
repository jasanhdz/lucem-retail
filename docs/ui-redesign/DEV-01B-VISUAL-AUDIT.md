# DEV-01B visual audit

## Environment and evidence

Captured with the project's production server and Playwright Chromium at 1440×900 and 390×844. Evidence is under [`dev-01b-visual-evidence/before/`](dev-01b-visual-evidence/before/) and [`dev-01b-visual-evidence/after/`](dev-01b-visual-evidence/after/); the latter contains login, businesses, and workspace captures for both viewports. The after captures are explicitly marked **VISUAL FIXTURE · NO-AUTH · NOT AN AUTHENTICATED SESSION**. Selector business data was provided only by a Playwright route fixture; runtime selector/switcher calls the existing `getBusinesses()` service. The workspace capture uses a temporary fixture page and was removed before final checks. No login/session was created, no database was mutated, and no credentials or real business information appear in captures.

### Baseline observations

The six baseline captures in `before/` were captured before the DEV-01B implementation. At desktop, login used a split dark brand panel and white form region; selector likewise used split composition and list-like business choices. At mobile, login/selector did not use the requested centered Stitch card composition. The desktop workspace already had a simplified persistent sidebar and header around the placeholder, but it lacked the fuller business switcher, operational CTA and user menu composition in the approved shell reference. On mobile it used a drawer/placeholder presentation rather than the requested fixed five-item bottom navigation. The historical mobile mock contains a broken logo; it is not treated as a valid mark.

## Before / after against screen references

References: [login PNG](../../diseno/pantalla_a_iniciar_sesi_n/screen.png) and [HTML](../../diseno/pantalla_a_iniciar_sesi_n/code.html); [selector PNG](../../diseno/pantalla_b_selecci_n_de_negocio/screen.png) and [HTML](../../diseno/pantalla_b_selecci_n_de_negocio/code.html); [desktop shell PNG](../../diseno/pantalla_c_shell_de_aplicaci_n_web_escritorio/screen.png) and [HTML](../../diseno/pantalla_c_shell_de_aplicaci_n_web_escritorio/code.html); [mobile shell PNG](../../diseno/pantalla_d_navegaci_n_m_vil_web_responsiva/screen.png) and [HTML](../../diseno/pantalla_d_navegaci_n_m_vil_web_responsiva/code.html). Token conflict decisions and both system palettes are in [DEV-01B-DESIGN-MAPPING.md](DEV-01B-DESIGN-MAPPING.md).

| Screen | Before | After | Remaining differences |
| --- | --- | --- | --- |
| Login desktop/mobile | Split desktop, stacked mobile, no centered auth card. | Centered light card on neutral/mint field at both viewports; layered SVG brand mark, labeled fields, visibility toggle, submission/loading/error behavior. | Different exact copy, proportions, icon artwork, and card dimensions from Stitch. |
| Businesses desktop/mobile | Split/list-like selection presentation; prior captures show baseline UI. | Centered card with stacked selectable cards and membership role; loading/empty/error/retry remain in the flow; selection submits API ID. | Only fixture data is pictured; visual card details and copy are approximate. Authentic selected-membership session could not be used. |
| Workspace desktop | Placeholder / no operational shell. | Persistent 300px sidebar, grouped routes, active-state styling, top header, actual business switcher, POS CTA, account/logout menu; placeholder content preserved. | Capture uses explicit empty visual fixture rather than live page data; exact desktop mock content, search/notification controls and spacing are not reproduced. |
| Workspace mobile | Drawer and placeholder; no five destination fixed bar. | Fixed Inicio/POS/Productos/Inventario/Más navigation, safe-area padding, existing-route sheet, compact header switcher; content padded clear of nav. | Placeholder remains intentionally; exact iconography, density, business-specific content and polish differ from mock. |

The implementation is a visual approximation and is **not pixel-exact**. The supplied comps are full operating screens while the existing modules must remain placeholders for this scope.

## Responsible implementation files

- `src/components/AuthScreens.tsx`, `src/components/Brand.tsx`
- `src/components/WorkspaceShell.tsx`, `src/components/MobileBottomNavigation.tsx`, `src/lib/workspace-navigation.ts`, `app/(workspace)/layout.tsx`
- `app/globals.css` imports `app/styles/{tokens,base,auth,workspace,mobile}.css`
- Tests: `e2e/dev-01-auth.spec.ts`, `tests/client-services.test.ts`, `tests/workspace-navigation.test.ts`; existing `e2e/dev-00-placeholder.spec.ts` remains in smoke coverage.

## Verification status and limits

- Auth login and selector service-flow E2E, recoverable states, local validation, response redirect, and selected business ID contract are covered by `e2e/dev-01-auth.spec.ts`.
- Role filtering is tested for all real roles (`ADMIN`, `SELLER`, `INVENTORY_MANAGER`) in `tests/workspace-navigation.test.ts`; only ADMIN receives an Audit navigation link.
- During visual capture, the temporary Playwright check verified 5 mobile navigation targets, “Más” ADMIN route, selected business ID submission through the existing service, and POST logout. The capture test and temporary `/visual-audit-preview` page were deleted before final build/E2E verification.
- Final serialized checks: `npm run lint` PASS; `npm run typecheck` PASS; `npm run test` PASS (4 suites / 6 tests); `npm run build` PASS (all existing routes listed; pre-existing Next ESLint plugin warning); `CI=1 npm run test:e2e -- --reporter=list` PASS (10 passed, 11 intentionally skipped legacy UI cases); `CI=1 npm run test:e2e -- e2e/dev-00-placeholder.spec.ts --reporter=list` PASS (4/4 smoke). A pre-existing local `next dev` on port 3000 was stopped after it was found writing into the shared `.next` build output and causing Playwright production server failures; final production checks ran after it was stopped.
- **BLOCKED — authentic selector-in-session verification:** no authorized integration session was available. The non-auth visual fixture is not an integration/authentication pass.
- Existing server guards remain authoritative. `GET /api/audit` remains ADMIN-guarded and the pre-existing warning remains: **each audit row includes `user.passwordHash` in the response, exposing hashes of credentials**. This scope does not correct that issue.
- No database, session, API/auth contracts, Prisma schema/migrations, dependencies, infrastructure, or `diseno/` files were changed. Existing operational modules remain placeholders.
- Lucem Retail is **not production-ready**; this UI increment is not a production-readiness claim.
