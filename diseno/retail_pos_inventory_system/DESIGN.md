---
name: Retail POS & Inventory System
colors:
  surface: '#e7fef8'
  surface-dim: '#c8dfd9'
  surface-bright: '#e7fef8'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#e2f9f2'
  surface-container: '#dcf3ec'
  surface-container-high: '#d6ede7'
  surface-container-highest: '#d1e7e1'
  on-surface: '#0b1f1b'
  on-surface-variant: '#414847'
  inverse-surface: '#203430'
  inverse-on-surface: '#dff6ef'
  outline: '#727878'
  outline-variant: '#c1c8c7'
  surface-tint: '#496362'
  primary: '#001615'
  on-primary: '#ffffff'
  primary-container: '#102b2a'
  on-primary-container: '#789391'
  inverse-primary: '#b0ccca'
  secondary: '#166b55'
  on-secondary: '#ffffff'
  secondary-container: '#a4f2d6'
  on-secondary-container: '#1f715a'
  tertiary: '#1c1000'
  on-tertiary: '#ffffff'
  tertiary-container: '#372300'
  on-tertiary-container: '#b3863c'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#cbe8e6'
  primary-fixed-dim: '#b0ccca'
  on-primary-fixed: '#04201f'
  on-primary-fixed-variant: '#314b4a'
  secondary-fixed: '#a4f2d6'
  secondary-fixed-dim: '#89d5ba'
  on-secondary-fixed: '#002117'
  on-secondary-fixed-variant: '#00513f'
  tertiary-fixed: '#ffddaf'
  tertiary-fixed-dim: '#f1be6e'
  on-tertiary-fixed: '#281800'
  on-tertiary-fixed-variant: '#614000'
  background: '#e7fef8'
  on-background: '#0b1f1b'
  surface-variant: '#d1e7e1'
typography:
  display-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 36px
    fontWeight: '700'
    lineHeight: 44px
  headline-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 28px
    fontWeight: '700'
    lineHeight: 36px
  headline-lg-mobile:
    fontFamily: Plus Jakarta Sans
    fontSize: 24px
    fontWeight: '700'
    lineHeight: 32px
  headline-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 22px
    fontWeight: '600'
    lineHeight: 28px
  headline-sm:
    fontFamily: Plus Jakarta Sans
    fontSize: 18px
    fontWeight: '600'
    lineHeight: 24px
  title-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 16px
    fontWeight: '600'
    lineHeight: 22px
  body-lg:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  body-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  body-sm:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '400'
    lineHeight: 16px
  label-lg:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '600'
    lineHeight: 20px
  label-md:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '500'
    lineHeight: 16px
  label-sm:
    fontFamily: Inter
    fontSize: 11px
    fontWeight: '600'
    lineHeight: 14px
  numeric-total:
    fontFamily: Plus Jakarta Sans
    fontSize: 32px
    fontWeight: '800'
    lineHeight: 36px
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  gutter: 1rem
  gutter-lg: 1.5rem
  margin: 1rem
  margin-md: 1.5rem
  margin-lg: 2rem
  space-xs: 0.25rem
  space-sm: 0.5rem
  space-md: 1rem
  space-lg: 1.5rem
  space-xl: 2rem
  space-2xl: 3rem
---

## Brand & Style

This design system embodies an elevated, trustworthy, and tactically swift retail operational environment. Tailored for enterprise retail storefronts, boutique chains, and modern inventory operators in Latin America, the visual language merges the grounded prestige of deep botanical tones with the crisp utility of modern SaaS ergonomics.

### Design Movement
**Refined Contemporary SaaS with Tactile Subtlety**: A balance between high-efficiency density (speed at checkout, instant SKU recognition) and visual poise. It eliminates unnecessary clutter, favoring spacious input targets, crisp structural separation, and clear focal feedback for high-stress cashier shifts.

### Emotional Goals
- **Control and Composure**: Cashiers and inventory managers handle high volumes under pressure; the deep forest green base anchors the interface in stability and authority.
- **Immediate Clarity**: High typographic contrast and precise status signifiers prevent costly transaction and stock errors.
- **Refinement**: Far removed from legacy grey POS terminals, this interface feels bespoke, clean, and deliberate.

## Colors

The palette uses dark botanical hues layered over soft, organic-tinted neutrals to maintain eye comfort during long operational shifts.

### Roles & Assignments
- **Primary (`#102B2A`)**: Primary actions, critical headers, navigation anchors, active state fills.
- **Secondary (`#176B55`)**: Secondary confirmations, success badges, metric increases, highlights.
- **Tertiary Accent (`#D9A85A`)**: Attention triggers, inventory alerts, VIP customer badges, secondary action callouts.
- **Neutral Base**:
  - App Canvas / Page Background: `#F4F6F5`
  - Cards, Modals, Panels: `#FFFFFF`
  - Structural Borders / Dividers: `#DCE4E1`
  - Neutral Secondary Surface: `#EBF0EE`
- **Typography**:
  - Primary Text: `#102B2A` (optimal contrast for scanner inputs and numerical totals)
  - Muted Text: `#5D726D` (subtitles, SKUs, table column headers)
- **Functional Semantics**:
  - Success: `#176B55` (Cobrado, En stock)
  - Warning: `#D9A85A` (Stock bajo, Pedido pendiente)
  - Danger: `#C24141` (Agotado, Cancelación, Descuento no autorizado)
  - Info: `#2B6CB0` (Sincronizando catálogo, En tránsito)

## Typography

The type system blends the friendly structure of **Plus Jakarta Sans** for headlines and cashier-facing summaries with the neutral utility of **Inter** for dense transactional tables and forms.

- **Tabular Figures**: Force tabular numerals (`font-feature-settings: 'tnum'`) on all currency, SKU lists, and barcode readings to prevent column shifting during quantity increments.
- **Language Nuance (Spanish - Mexico)**: Maintain clear letter-spacing on uppercase labels (`label-sm` tracking +0.02em) for tags like `PUNTO DE VENTA`, `IVA INCLUIDO`, and `CANTIDAD`.

## Layout & Spacing

The layout is built around high-speed point-of-sale operations alongside deep inventory analytics.

### Layout Architecture
- **Desktop / Terminal POS (Breakpoint ≥ 1024px)**: Asymmetrical split view.
  - Left Canvas (7 or 8 columns): Fluid product catalog grid, search/filter bars, and category rails.
  - Right Rail (4 or 5 columns): Fixed transaction summary panel (`Nueva venta`, cart list, tax calculation, checkout buttons).
- **Tablet / Mobile (Breakpoint < 1024px)**:
  - Stacked view with sticky bottom ticket drawer (`Total: $0.00 MXN` with swipeable drawer to complete checkout).
- **Gutter & Margins**: 16px (`1rem`) on standard tablet views, 24px (`1.5rem`) on desktop widescreen stations.
- **Rhythm**: Component interiors prioritize 8px (`0.5rem`) and 16px (`1rem`) padding to guarantee large, touch-safe hit zones for touchscreens without bloated heights.

## Elevation & Depth

This system avoids aggressive, deep drop shadows, using crisp outlines paired with delicate ambient surfaces.

- **Structural Borders**: `#DCE4E1` (1px solid) defines all cards, containers, input states, and tabular structures.
- **Level 0 (Flat)**: Background canvas `#F4F6F5`.
- **Level 1 (Panels & Cards)**: Background `#FFFFFF`, border `1px solid #DCE4E1`, shadow `0 1px 3px rgba(16, 43, 42, 0.04)`.
- **Level 2 (Active Cart / Flyouts / Menus)**: Background `#FFFFFF`, border `1px solid #DCE4E1`, shadow `0 4px 12px rgba(16, 43, 42, 0.08)`.
- **Level 3 (Modal Dialogs / Cobro Confirmation)**: Background `#FFFFFF`, shadow `0 12px 32px rgba(16, 43, 42, 0.14)`. Backdrop tinted with `rgba(16, 43, 42, 0.45)` with 4px blur.

## Shapes

The design system maintains consistent geometry balanced between friendly retail touchpoints and systematic enterprise precision.

- **Base Radius (8px)**: Inputs, small buttons, product image thumbnails, table row highlights.
- **Large Radius (12px - 16px)**: Transaction summary containers, inventory modals, stat summary cards.
- **Pill (Full Round / 9999px)**: Status badges (`En stock`, `Agotado`), category pills, and numeric quantity adjuster toggles.

## Components

### Buttons
- **Primary (`Cobrar`, `Nueva venta`)**: Background `#102B2A`, text `#FFFFFF`, border radius 8px (`0.5rem`). Hover: `#176B55`. Active: scale 0.98. Touch height minimum 44px.
- **Secondary (`Guardar borrador`, `Imprimir ticket`)**: Background `#FFFFFF`, text `#102B2A`, border `1px solid #DCE4E1`. Hover: background `#F4F6F5`.
- **Accent / Destructive (`Cancelar venta`, `Eliminar SKU`)**: Background `#FFF5F5`, text `#C24141`, border `1px solid #F8D7D7`.

### Chips & Badges
- **Status Pills**: Pill-shaped (`rounded-full`), `space-xs` vertical by `space-sm` horizontal padding.
  - *En stock*: `#E8F3F0`, text `#176B55`.
  - *Stock bajo*: `#FCF6EC`, text `#B07D2B`.
  - *Agotado*: `#FDF2F2`, text `#C24141`.
- **Category Filter Chips**: Background `#FFFFFF`, border `1px solid #DCE4E1`, text `#5D726D`. When selected: background `#102B2A`, text `#FFFFFF`, border color `#102B2A`.

### Input Fields & Search Bars
- **POS Search Bar**: Height 48px, background `#FFFFFF`, border `1.5px solid #DCE4E1`, radius 8px, font size 15px.
- **Placeholder**: "Buscar producto, código de barras o SKU...", text color `#5D726D`.
- **Focus State**: Border color `#176B55`, ring `3px solid rgba(23, 107, 85, 0.15)`.

### Lists & Inventory Data Tables
- Header row: background `#F4F6F5`, uppercase text in `label-sm` (`#5D726D`), height 40px.
- Row items: background `#FFFFFF`, bottom border `1px solid #DCE4E1`, height 56px, hover background `#F9FBFA`.
- Numerical columns (`Precio`, `Existencias`, `Subtotal`): Right-aligned with tabular numbers.

### Transaction Panel (Punto de Venta Cart)
- Surface: `#FFFFFF`, left border `1px solid #DCE4E1`.
- Item Row: Flex layout with product title in `title-md`, SKU in `body-sm` (`#5D726D`), quantity stepper (`-`, count, `+`) enclosed in a pill border, and subtotal right-aligned in `Plus Jakarta Sans` semi-bold.
- Sticky Footer: Subtotal, IVA 16%, Descuentos, followed by Total in `numeric-total` (`#102B2A`), finishing with a full-width high-prominence `Cobrar` button.