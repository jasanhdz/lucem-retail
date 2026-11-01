# DEV-01B design mapping

Editable mapping for DEV-01B. The supplied, screen-specific Stitch PNG/HTML is the composition authority; the two broader design systems inform shared tokens and controls. No files under `diseno/` are modified.

## Sources and precedence

- [Retail Operational Clarity](../../diseno/retail_operational_clarity/DESIGN.md): light neutral surfaces, restrained green actions, clear operational hierarchy.
- [Retail POS Inventory System](../../diseno/retail_pos_inventory_system/DESIGN.md): mint accents, touch-ready controls, compact operational navigation.
- Login: [PNG](../../diseno/pantalla_a_iniciar_sesi_n/screen.png) · [HTML](../../diseno/pantalla_a_iniciar_sesi_n/code.html).
- Business selector: [PNG](../../diseno/pantalla_b_selecci_n_de_negocio/screen.png) · [HTML](../../diseno/pantalla_b_selecci_n_de_negocio/code.html).
- Desktop shell: [PNG](../../diseno/pantalla_c_shell_de_aplicaci_n_web_escritorio/screen.png) · [HTML](../../diseno/pantalla_c_shell_de_aplicaci_n_web_escritorio/code.html).
- Mobile shell: [PNG](../../diseno/pantalla_d_navegaci_n_m_vil_web_responsiva/screen.png) · [HTML](../../diseno/pantalla_d_navegaci_n_m_vil_web_responsiva/code.html).
- Layered Lucem mark: inline reference A is embodied as the hand-authored SVG in `src/components/Brand.tsx`; there is no official public logo asset.

## Mapping

| Design concept | Implementation | Decision |
| --- | --- | --- |
| Forest ink / dark operational actions | `--brand`, `--ink` in `app/styles/tokens.css`; `.button` in `base.css` | Use shared brand colors for primary CTA, avoid large dark auth panel per screen comps. |
| Pale neutral / mint backdrop and soft surfaces | `--canvas`, `--surface-muted`, `--accent-soft`; `.auth-page` | Specific login and selector comps require a centered white card and airy neutral/mint canvas. |
| Login card, badge, email/password controls | `AuthFrame`, `LoginScreen`, `auth.css` | One centered card at desktop and mobile; no split-pane treatment. |
| Membership cards and active outline | `BusinessesScreen`, `.business-option` | Real API businesses and membership role only; empty/error/loading are explicit; no registration or OAuth. |
| Persistent desktop navigation and business context | `WorkspaceShell`, `.sidebar`, `.workspace-topbar` | 300px desktop sidebar, existing route groups, active route, real switch and POS CTA. |
| Mobile five-item bottom bar and “Más” sheet | `MobileBottomNavigation`, `mobile.css` | Exactly Inicio/POS/Productos/Inventario/Más; additional routes are existing role-permitted destinations. Broken reference logo is intentionally not reproduced. |
| Focus, touch, cards and spacing | `base.css`, `auth.css`, `workspace.css`, `mobile.css` | Semantic CSS tokens/components, visible keyboard focus, 44px minimum interactive targets. |

### Conflict resolution

Generic DESIGN.md language might suggest a split authentication story or a dense POS-first shell. Those treatments conflict with the supplied login/selector cards and with the shell's desktop/mobile screen compositions. Defer to the individual screen comps: centered auth cards; persistent desktop sidebar; fixed five-destination mobile navigation. Shared palettes remain light neutral, ink, mint/green. Module content stays placeholder and no business operations were introduced.
