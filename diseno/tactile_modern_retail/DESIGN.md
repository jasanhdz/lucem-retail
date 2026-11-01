---
name: Tactile Modern Retail
colors:
  surface: '#f8f9ff'
  surface-dim: '#cbdbf5'
  surface-bright: '#f8f9ff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#eff4ff'
  surface-container: '#e5eeff'
  surface-container-high: '#dce9ff'
  surface-container-highest: '#d3e4fe'
  on-surface: '#0b1c30'
  on-surface-variant: '#45464d'
  inverse-surface: '#213145'
  inverse-on-surface: '#eaf1ff'
  outline: '#76777d'
  outline-variant: '#c6c6cd'
  surface-tint: '#565e74'
  primary: '#000000'
  on-primary: '#ffffff'
  primary-container: '#131b2e'
  on-primary-container: '#7c839b'
  inverse-primary: '#bec6e0'
  secondary: '#006c49'
  on-secondary: '#ffffff'
  secondary-container: '#6cf8bb'
  on-secondary-container: '#00714d'
  tertiary: '#000000'
  on-tertiary: '#ffffff'
  tertiary-container: '#2a1700'
  on-tertiary-container: '#b87500'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#dae2fd'
  primary-fixed-dim: '#bec6e0'
  on-primary-fixed: '#131b2e'
  on-primary-fixed-variant: '#3f465c'
  secondary-fixed: '#6ffbbe'
  secondary-fixed-dim: '#4edea3'
  on-secondary-fixed: '#002113'
  on-secondary-fixed-variant: '#005236'
  tertiary-fixed: '#ffddb8'
  tertiary-fixed-dim: '#ffb95f'
  on-tertiary-fixed: '#2a1700'
  on-tertiary-fixed-variant: '#653e00'
  background: '#f8f9ff'
  on-background: '#0b1c30'
  surface-variant: '#d3e4fe'
typography:
  headline-xl:
    fontFamily: Plus Jakarta Sans
    fontSize: 32px
    fontWeight: '700'
    lineHeight: 40px
    letterSpacing: -0.02em
  headline-xl-mobile:
    fontFamily: Plus Jakarta Sans
    fontSize: 26px
    fontWeight: '700'
    lineHeight: 32px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 24px
    fontWeight: '700'
    lineHeight: 32px
    letterSpacing: -0.015em
  headline-lg-mobile:
    fontFamily: Plus Jakarta Sans
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 28px
    letterSpacing: -0.01em
  headline-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 18px
    fontWeight: '600'
    lineHeight: 24px
    letterSpacing: -0.01em
  headline-sm:
    fontFamily: Plus Jakarta Sans
    fontSize: 16px
    fontWeight: '600'
    lineHeight: 22px
    letterSpacing: '0'
  body-lg:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
    letterSpacing: -0.005em
  body-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
    letterSpacing: '0'
  body-sm:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '400'
    lineHeight: 16px
    letterSpacing: '0'
  label-lg:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '600'
    lineHeight: 20px
    letterSpacing: 0.01em
  label-md:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '600'
    lineHeight: 16px
    letterSpacing: 0.02em
  label-sm:
    fontFamily: Inter
    fontSize: 11px
    fontWeight: '700'
    lineHeight: 14px
    letterSpacing: 0.04em
  numeric-display:
    fontFamily: Inter
    fontSize: 36px
    fontWeight: '700'
    lineHeight: 44px
    letterSpacing: -0.03em
  numeric-table:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '500'
    lineHeight: 20px
    letterSpacing: '0'
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  gutter: 1rem
  gutter-mobile: 0.75rem
  margin: 1.5rem
  margin-mobile: 1rem
  space-xs: 0.25rem
  space-sm: 0.5rem
  space-md: 1rem
  space-lg: 1.5rem
  space-xl: 2rem
---

## Brand & Style

This design system is engineered for high-throughput, low-friction point-of-sale and live inventory control. Designed specifically for boutique storefronts, apparel retailers, and specialty operations, the visual ethos blends crisp modern utility with tactile confidence. 

The aesthetic combines high-clarity utilitarian structures with purposeful physical affordances:
- **Instant Optical Hierarchy:** Crucial transactional indicators (totals, inventory health, tender states) demand immediate visual recognition under direct retail counter lighting.
- **Tactile Interaction:** Large, tap-friendly touch targets with defined structural micro-elevations replicate the rapid, confident responsiveness of physical registers.
- **Restrained Chrome, Vivid Signals:** Core work surfaces maintain an understated, cool neutral profile, allowing status badges, stock warnings, and monetary values to serve as unmistakable operational beacons.
- **Operational Density:** Layout balances dense tabular inventory information with generous touch-screen checkout states, eliminating input fatigue during extended merchant shifts.

## Colors

The palette establishes an authoritative, high-contrast commercial workspace:

- **Primary (`#0F172A` - Deep Retail Slate):** Governs structural framing, high-emphasis text, key action bars, primary tender actions, and receipt previews.
- **Secondary (`#10B981` / `#059669` - Emerald Core):** Dedicated to positive revenue events, active checkouts, completed sales, in-stock statuses (*Disponible*), and positive cash balances.
- **Tertiary (`#F59E0B` - Alert Amber):** Reserved strictly for critical thresholds, including low-stock alerts (*Por agotarse*), pending drawer reconciliations, and holds.
- **Error / Danger (`#F43F5E` - Rose Out-of-Stock):** Applied strictly to zero inventory (*Agotado*), card read failures, refunds, voided line items, and negative balances.
- **Surfaces & Borders:** 
  - Canvas: `#F8FAFC` (Slate 50)
  - Surface Tier 1 (Cards, Registers): `#FFFFFF`
  - Surface Tier 2 (Panels, Secondary Trays): `#F1F5F9` (Slate 100)
  - Borders & Dividers: `#E2E8F0` (Slate 200) for standard layout grids; `#CBD5E1` (Slate 300) for interactive control boundaries.
- **Contrast & State Governance:** Active emerald buttons employ `#047857` for pressed feedback. Slate buttons rely on `#1E293B` for hover/active states. All interactive elements satisfy WCAG AA 4.5:1 minimum contrast ratios for optical legibility under direct overhead store illumination.

## Typography

The type scale combines the modern retail presence of **Plus Jakarta Sans** for structural headers and modal titles with the functional precision of **Inter** for dense tabular screens, system labels, and inputs.

- **Tabular Numerics Rule:** Every instance of financial figures, totals, unit rates, quantities, barcode numbers, and SKUs must enforce OpenType tabular figures (`font-variant-numeric: tabular-nums`). This guarantees columnar stability across rapid ticket recalculations, ledger updates, and dynamic price displays.
- **Hierarchy Separation:** Display headers establish confident register sections, while strict micro-labels (`label-sm`, `label-md`) use uppercase formatting with widened letter spacing to clarify transactional metadata like batch status, item modifiers, tax tiers, and tender methods.

## Layout & Spacing

The layout is built on a responsive split-surface model configured for dual-mode usage: high-velocity desktop/tablet POS terminals and pocket mobile inventory counts.

- **Desktop & Countertop Tablet (>= 1024px):** 
  - Dual asymmetrical layout: A 7-column fluid catalog/grid browser alongside a fixed 5-column transaction split (sticky cart, key-value register totals, and tactile payment CTA deck).
  - Screen canvas uses `1.5rem` (`margin`) outer padding with a uniform `1rem` (`gutter`) separating functional panels.
- **Mobile Inventory Handheld (< 768px):** 
  - Collapses into a stacked unified stream. Fixed bottom bars handle scanning shortcuts, tender submission triggers, or batch verification.
  - Outer spacing condenses to `1rem` (`margin-mobile`), and item card gaps use `0.75rem` (`gutter-mobile`).
- **Internal Component Spacing:**
  - Micro clusters (badge padding, SKU metadata groups): `0.25rem` (`space-xs`) to `0.5rem` (`space-sm`).
  - Standard form rows, list row paddings, and card interiors: `1rem` (`space-md`).
  - Container separation and section blocks: `1.5rem` (`space-lg`) to `2rem` (`space-xl`).
- **Touch Target Rule:** All checkout buttons, numpad switches, and quantity modifiers must maintain minimum touch boundaries of 44x44px (48x48px on POS action strips).

## Elevation & Depth

Visual hierarchy uses tactile physical realism balanced with clean architectural outlines. Flat layers alone reduce speed in physical retail environments, so depth is conveyed through tactile surface offsets and subtle ambient shadows:

- **Flat Substrates (Canvas):** Background surfaces (`#F8FAFC`) reside flat at ground level.
- **Level 1 (Card & Module Deck):** POS item cards, inventory table rows, and filter rails use a crisp perimeter line (`1px solid #E2E8F0`) paired with a tight ambient shadow: `0 1px 3px 0 rgba(15, 23, 42, 0.06), 0 1px 2px -1px rgba(15, 23, 42, 0.04)`.
- **Level 2 (Active Cart, Sticky Sliders, Floating Bars):** Active register carts and quick-access scan shelves elevate above the canvas: `0 4px 6px -1px rgba(15, 23, 42, 0.08), 0 2px 4px -2px rgba(15, 23, 42, 0.04)` over `#FFFFFF`.
- **Level 3 (Modals, Tender Trays, Keypads):** Cash tender trays, manual barcode keypads, and refund confirmations cast an authoritative backdrop shadow: `0 20px 25px -5px rgba(15, 23, 42, 0.12), 0 8px 10px -6px rgba(15, 23, 42, 0.08)`.
- **Tactile State Cues:** Primary physical action keys (such as the POS numpad and the "Cobrar" checkout trigger) utilize a subtle 1px inner top highlight (`inset 0 1px 0 rgba(255, 255, 255, 0.2)`) and depress 1px downward on the active state to reinforce haptic input confirmation.

## Shapes

The design system implements a **Rounded (Level 2)** geometry balance. This configuration preserves a crisp professional silhouette while softening high-stress register interactions:

- **Base Radius (`0.5rem` / `8px`):** Standard form inputs, catalog product thumbnails, list selectors, numpad entry buttons, and status alert banners.
- **Large Radius (`1rem` / `16px`):** Store metric summary cards, cart drawer surfaces, POS ticket panels, and checkout modal containers.
- **Extra-Large Radius (`1.5rem` / `24px`):** Reserved for floating point-of-sale command shells and customer receipt modals.
- **Pill Radius (`9999px`):** Strictly reserved for inventory status badges (*Disponible*, *Por agotarse*, *Agotado*), user counter status pills, and toggle indicators.

## Components

### Buttons & Register Triggers
- **Primary Checkout Button:** Solid deep slate (`#0F172A`) or dynamic emerald (`#10B981`) for the definitive "Cobrar / Tender" event. Height: 48px standard, 56px on POS main register. Fully legible white text, semi-bold weight, with tabular total values integrated directly into the right edge.
- **Secondary Actions:** White fill, 1px border (`#E2E8F0`), slate text. On hover: border tints to `#CBD5E1`, background shifts to `#F8FAFC`.
- **Destructive Actions:** Light rose tint (`#FFF1F2`) with `#E11D48` label and border for line-item cancellations; solid `#F43F5E` for terminal void transactions.

### Badge Chips (Inventory Status)
Compact pill badges (`rounded-full`, 24px height, horizontal padding of `0.625rem`) that communicate immediate stock levels:
- **Disponible (In Stock):** Background `#ECFDF5`, text `#065F46`, border `1px solid #A7F3D0`. Includes a 6px solid emerald status dot.
- **Por agotarse (Low Stock):** Background `#FFFBEB`, text `#92400E`, border `1px solid #FDE68A`. Warning amber dot.
- **Agotado (Out of Stock):** Background `#FFF1F2`, text `#9F1239`, border `1px solid #FECDD3`. Danger rose dot.

### POS Quick Numpad & Toggles
- **Numpad Grid:** High-density 3x4 grid for instant unit entries and cash amounts. Key heights 52px minimum, crisp borders (`#E2E8F0`), white background with slate text. Text centered at `18px` tabular bold. Press state introduces an instant `#F1F5F9` background flash.
- **Increment Toggles:** Segmented stepper controls (`-` and `+`) surrounding tabular text counts. Bounded within a single unified bordered shell to avoid stray taps.

### Input Fields & Search Bars
- **Barcode / SKU Input:** Prominent scanning bar featuring a persistent monospaced icon adornment. 44px height, `#FFFFFF` interior, `#CBD5E1` border, focusing into a 2px outer ring in `#0F172A`. Placeholders remain high-contrast slate-muted (`#94A3B8`).

### Financial Summary Cards
- Modular cards showcasing daily net totals, margin indicators, and cash drawer reconciliations. Built with a clean `#FFFFFF` ground, 1px `#E2E8F0` border, `1rem` corner rounding, and `1rem` inner padding. 
- Headers display small muted section labels (`label-sm`), with large tabular figures (`numeric-display`) and inline change indicators tagged in emerald or rose text.

### Interactive Cart Item List
- High-efficiency linear rows with distinct 1px border separators. Product title pinned left; editable tabular price, unit count, and single-tap row removal trigger pinned right. Alternating touch row states use subtle `#F8FAFC` hovers.