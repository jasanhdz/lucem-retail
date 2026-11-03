# DEV-11 Stitch Final Audit

## Scope and Method

The audit compared the actual Lucem runtime against every `screen.png`/`code.html` pair under `diseno/`. Stitch images were the primary visual reference. Existing functional E2E evidence was not treated as visual proof.

The runtime was captured against a disposable PostgreSQL E2E database using Playwright Chromium at 1440x900, 768x1024 and 390x844. The capture covered 14 real surfaces: login, registration, three onboarding screens, Dashboard shell, POS, ticket, products, inventory, movement history, inventory detail, Apartados and Devoluciones. Evidence is in [`dev-11-visual-evidence/`](dev-11-visual-evidence/).

## Findings

| Priority | Reference and runtime | Difference | Correction or decision |
|---|---|---|---|
| P0 | All approved MVP references | No missing approved route was found. | None open. |
| P1 | POS and Inventario primary references | The runtime was previously too sparse in operational hierarchy. POS cards lacked an explicit availability badge; Inventario exposed only three summary metrics. | Added accessible availability/empty badges to POS cards and a fourth derived `Alertas activas` inventory metric. No backend or commercial rule changed. |
| P1 | `desktop_completar_perfil_inicial` | No equivalent profile-completion route exists in the approved MVP contracts. | N/A, explicitly excluded from the approved onboarding flow. It is not counted as implemented. |
| P2 | Auth and onboarding references | Copy, exact card proportions, footer wording and some icon artwork differ from Stitch. | Kept existing accessible, functional forms; differences are low-risk and documented. |
| P2 | POS references | Stitch contains photographic product assets, global search/keyboard hints, richer category pills, VAT/coupon/customer presentation and a denser ticket. The current API does not provide all of those concepts. | Kept real contract-backed catalog, payment methods, stock and ticket; did not invent unsupported fields or modules. |
| P2 | Inventario references | Stitch contains decorative metrics, supplier/transfer cards and richer row metadata not returned by current APIs. | Kept real physical/available/reserved balances, movement history, mutation dialog and conflict states. |
| P2 | Shell/mobile references | Exact Stitch search/notification artwork and copy are not reproduced; route-aware navigation and responsive bottom navigation are present. | Preserved the existing Design System and accessible route controls rather than adding non-functional controls. |

## Before/After Evidence

The current screenshots are named by route and viewport, for example:

- [`auth-login-desktop.png`](dev-11-visual-evidence/auth-login-desktop.png)
- [`onboarding-business-mobile.png`](dev-11-visual-evidence/onboarding-business-mobile.png)
- [`pos-main-desktop.png`](dev-11-visual-evidence/pos-main-desktop.png)
- [`pos-ticket-desktop.png`](dev-11-visual-evidence/pos-ticket-desktop.png)
- [`products-catalog-tablet.png`](dev-11-visual-evidence/products-catalog-tablet.png)
- [`inventory-main-desktop.png`](dev-11-visual-evidence/inventory-main-desktop.png)
- [`inventory-movements-mobile.png`](dev-11-visual-evidence/inventory-movements-mobile.png)
- [`inventory-detail-tablet.png`](dev-11-visual-evidence/inventory-detail-tablet.png)
- [`reservations-mobile.png`](dev-11-visual-evidence/reservations-mobile.png)
- [`returns-desktop.png`](dev-11-visual-evidence/returns-desktop.png)

Each screenshot is a real runtime capture with E2E fixtures, not a mock or a copy of `diseno/`. Original Stitch files were not modified.

## Accessibility and Responsive Review

- Existing focus, dialog, Escape, return-focus, role and label behavior remains covered by the directed suites.
- POS availability state is conveyed by text and color through `Agotado` or `<n> disp.` badges.
- Inventory alert count is derived from actual available stock and threshold values.
- DEV-11 captures passed at all three target viewport sizes without introducing a new horizontal-scroll contract.

## Final Status

DEV-11 closes the approved MVP visual scope with zero P0/P1 findings. It does not claim pixel-perfect reproduction of unsupported Stitch-only data or assets. Five P2 differences remain documented and are deliberately bounded to copy, decorative assets, and non-contract visual density.
