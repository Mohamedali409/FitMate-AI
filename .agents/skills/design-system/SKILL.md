---
name: design-system
description: Use this skill to define, maintain, and evolve FitMate AI design tokens, typography, color palettes, spacing systems, theme modes (dark/light), and reusable UI component contracts.
---

# Design System Skill

## Skill Purpose
The `design-system` skill governs the visual design tokens, atomic styling rules, typography hierarchies, color schemes, spacing scales, and reusable component contracts for FitMate AI. It guarantees visual cohesion, brand identity, accessibility compliance, and seamless dark/light theme switching across English (LTR) and Arabic (RTL) surfaces.

---

## When to Use This Skill
- Defining and standardizing design tokens (colors, typography, spacing, border radii, shadows, elevations).
- Creating specifications for reusable UI components (Buttons, Cards, Inputs, Badges, Modals, Progress Rings, Macro Bars).
- Establishing theme tokens for Dark Mode (primary for gym environments) and Light Mode (clean daylight mode).
- Standardizing typography scales for both Latin (e.g., Inter, system sans-serif) and Arabic (e.g., Cairo, Noto Sans Arabic) font families.
- Specifying semantic status colors (Success, Warning, Error, Info) and nutrition domain colors (Protein, Carbohydrates, Fats).

---

## When NOT to Use This Skill
- Writing concrete React Native component implementation code or state hooks (delegate to `react-native-expo`).
- Designing screen-level navigation flows or state journey maps (delegate to `mobile-ui-ux`).
- Formulating business requirements, user stories, or feature priorities (delegate to `product-thinking`).
- Designing database schemas or backend APIs (delegate to `mongodb-data-modeling` and `api-design`).

---

## Required Context to Inspect Before Acting
Before executing design system workflows, inspect:
1. Product requirements and brand direction from `product-thinking`.
2. Mobile ergonomic patterns and state requirements from `mobile-ui-ux`.
3. Accessibility standards (WCAG 2.1 AA color contrast: 4.5:1 text, 3:1 graphical elements).
4. Any existing token definitions or theme constants in the project.

---

## Step-by-Step Workflow

### Step 1: Design Token Architecture
Structure tokens using a three-tier hierarchy:
1. **Global / Primitive Tokens**: Raw values independent of theme or context (e.g., `palette.blue.500: '#2563EB'`, `space.4: 16`).
2. **Semantic / Theme Tokens**: Role-based aliases that change between themes (e.g., `color.background.primary`, `color.surface.elevated`, `color.text.secondary`).
3. **Component Tokens**: Specific component mappings (e.g., `button.primary.bg`, `card.border.radius`).

### Step 2: Color Palette Architecture
Define semantic palettes for both Dark and Light themes:
- **Brand Identity**:
  - Primary: Energetic, athletic accent (e.g., electric teal or vibrant cyan).
  - Secondary: Deep complement for contrast.
- **Surface & Backgrounds**:
  - Dark Theme (Default for workout focus): Pure deep charcoal/near-black backgrounds (`#0F172A` / `#121212`) to save battery on OLED and reduce gym glare.
  - Light Theme: Crisp, high-clarity surfaces (`#F8FAFC` / `#FFFFFF`).
- **Nutrition Macro Palette (Strict Semantic Standard)**:
  - **Protein**: Distinct color (e.g., Coral / Red-Orange `#FF6B6B`).
  - **Carbohydrates**: Distinct color (e.g., Amber / Golden Yellow `#F59E0B`).
  - **Fats**: Distinct color (e.g., Emerald / Blue-Green `#10B981`).
  - These colors must remain consistent across charts, loggers, and summary rings.
- **Feedback & Alerts**: Success (`#22C55E`), Warning (`#EAB308`), Error (`#EF4444`), Info (`#3B82F6`).

### Step 3: Typography & Multi-Script Scale
Define font metrics accommodating both English and Arabic:
- **Font Scale (Modular 8pt scale)**:
  - `display`: 32pt / Line-height: 40pt
  - `titleLarge`: 24pt / Line-height: 32pt
  - `titleMedium`: 20pt / Line-height: 28pt
  - `bodyLarge`: 16pt / Line-height: 24pt
  - `bodyMedium`: 14pt / Line-height: 20pt
  - `caption`: 12pt / Line-height: 16pt
- **Arabic Script Adjustment**:
  - Apply `lineHeightMultiplier: 1.25` for Arabic script variants to prevent clipping of diacritics and ascenders/descenders.

### Step 4: Spacing & Layout Grid
- Implement an **8-point grid** with a 4-point micro-scale:
  - `spacing.2xs` = 2px
  - `spacing.xs` = 4px
  - `spacing.sm` = 8px
  - `spacing.md` = 16px
  - `spacing.lg` = 24px
  - `spacing.xl` = 32px
  - `spacing.2xl` = 48px
- Border Radii: `none: 0`, `sm: 4px`, `md: 8px`, `lg: 12px`, `xl: 16px`, `pill: 9999px`.

### Step 5: Reusable Component Specifications
For each atomic component, define:
- **Variants**: Primary, Secondary, Ghost, Destructive, Outline.
- **Sizes**: Small (compact), Medium (default), Large (hero/CTA).
- **Interactive States**: Default, Pressed, Focused, Disabled, Loading.
- **RTL Behavior**: Auto-mirrored icons vs. fixed numeric displays.

---

## Project-Specific Standards
- **OLED Gym Optimization**: The dark theme must provide high readability under harsh fluorescent gym lighting and sunlight glare.
- **Macro Color Immutability**: Never interchange protein, carb, or fat colors in different charts; users build muscle-memory associations with macro colors.
- **Disclaimer Component**: A standardized disclaimer badge component (`<DisclaimerBadge text="Estimated nutrition" />`) must be reusable across all relevant views.

---

## Best Practices
- Never allow raw hex codes or magic number paddings in component designs; reference semantic tokens exclusively.
- Verify every color combination against WCAG AA contrast standards using automated color checkers.
- Keep component APIs small, predictable, and composition-friendly.

---

## Anti-Patterns and Mistakes to Avoid
- **Hard-Coded Values**: Specifying `padding: 13` or `color: '#1a1a1a'` instead of `space.md` and `color.surface.card`.
- **Inconsistent Dark Mode Inversion**: Inverting black to white without adjusting contrast ratios, resulting in washed-out text.
- **Incompatible Arabic Fonts**: Choosing fancy display fonts that have missing Arabic glyphs or incompatible character widths.
- **Ignoring Disabled States**: Creating buttons that look clickable even when disabled, or disappearing into the background.

---

## Quality Checklist
- [ ] Are semantic tokens defined for both Dark and Light themes?
- [ ] Do all text/surface pairings pass WCAG AA contrast (>= 4.5:1)?
- [ ] Are macro colors (Protein, Carbs, Fats) distinct, semantic, and standardized?
- [ ] Is the 4pt/8pt spacing scale adhered to without arbitrary pixel values?
- [ ] Are typography line-heights adjusted for Arabic script?
- [ ] Are interactive states (default, pressed, disabled, loading) fully specified?

---

## Expected Deliverables
- **Design Token Catalog**: Structured JSON/TypeScript token specifications (colors, spacing, typography, radii, shadows).
- **Component Style Specifications**: Visual and prop specifications for core components (Buttons, Inputs, MacroBars, WorkoutCards).
- **Theme Matrix**: Side-by-side Dark and Light theme mapping.

---

## Rules for Asking Clarification Instead of Making Assumptions
- If introducing a brand color that alters the primary accent, ask the user/product owner for confirmation.
- If approving dark-only vs. dark-and-light dual support for MVP, confirm user preference before defining extensive light theme tokens.

