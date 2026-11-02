---
name: mobile-ui-ux
description: Use this skill when designing mobile user experience, screen flows, navigation structures, accessibility, loading/empty/error states, and RTL/LTR internationalization for FitMate AI.
---

# Mobile UI/UX Skill

## Skill Purpose
The `mobile-ui-ux` skill defines user experience principles, screen flows, navigation structures, ergonomic interaction patterns, and accessibility guidelines tailored for a premier mobile fitness and nutrition app. It guarantees that FitMate AI provides a frictionless, intuitive, and inclusive experience in both English (LTR) and Arabic (RTL) across gym and home environments.

---

## When to Use This Skill
- Designing user flows and screen transitions (e.g., onboarding, active workout logging, meal logging, progress review, AI coach consultation).
- Designing information architecture and navigation patterns (tabs, stacks, modal bottom sheets).
- Specifying the complete state matrix for every screen: Idle, Loading (skeletons), Partial Data, Empty State, Error with Retry, and Offline mode.
- Designing for bi-directional layouts (Arabic RTL vs. English LTR mirroring and typography accommodations).
- Ensuring WCAG 2.1 AA accessibility (touch target ergonomics, screen readers, dynamic type scaling, high contrast).

---

## When NOT to Use This Skill
- Defining raw color palettes, font tokens, or atomic design tokens (delegate to `design-system`).
- Writing React Native JSX, hooks, or Expo Router component code (delegate to `react-native-expo`).
- Writing backend APIs or defining database schema relationships (delegate to `api-design` and `mongodb-data-modeling`).
- Defining business scope, personas, or feature prioritization (delegate to `product-thinking`).

---

## Required Context to Inspect Before Acting
Before executing UI/UX workflows, inspect:
1. Approved user stories and acceptance criteria from `product-thinking`.
2. Existing design tokens, theme definitions, and component guidelines from `design-system`.
3. Expo Router navigation paradigms outlined in `react-native-expo`.
4. Platform design conventions (Apple Human Interface Guidelines for iOS and Material 3 for Android).

---

## Step-by-Step Workflow

### Step 1: User Journey & Information Architecture
Map the high-level path through the app:
- **Root Level**: Auth flow (Sign up, Log in, Password recovery) vs. Main App.
- **Main App (Bottom Tab Bar)**:
  - Tab 1: **Today / Dashboard** (Daily overview, calories/macros summary, today's workout CTA).
  - Tab 2: **Workouts** (Routine library, active workout tracker, past sessions).
  - Tab 3: **Nutrition** (Daily log, meal breakdown, water intake, quick add).
  - Tab 4: **AI Coach** (Chat interface, habit check-ins, fitness guidance).
  - Tab 5: **Profile & Progress** (Body metric graphs, unit toggle, settings, consent center).
- **Transient Modals**: Active workout sheet, meal search modal, unit settings drawer.

### Step 2: Screen State Matrix Specification
For every screen designed, map all 5 mandatory states:
1. **Loading State**: Content-shaped skeleton loaders matching exact layout (no blocking spinners).
2. **Empty State**: Friendly illustration/icon, contextual explanatory message, and a clear primary Call-to-Action (e.g., "No workouts logged yet. Start your first workout!").
3. **Populated State**: Active content optimized for mobile scanning.
4. **Error State**: Non-technical explanation of failure, with a prominent "Retry" or "Refresh" action.
5. **Offline State**: Non-intrusive offline banner, cached data indicators, and queued action indicators.

### Step 3: Bi-Directional Design (RTL & LTR)
- **Mirroring Rules**:
  - Horizontal reading flows, back navigation arrows, chevron indicators, and progression timelines must mirror in Arabic (RTL).
  - Media controls (play/pause/skip for workout audio/video) and numeric charts (time progressing left-to-right) maintain conventional orientation.
- **Typography & Spacing**:
  - Arabic script requires ~20% more vertical line height to prevent diacritics clipping.
  - Avoid tight horizontal button boundaries that truncate Arabic text strings.

### Step 4: Gym-Environment Ergonomics & Touch Targets
- **One-Thumb Zone**: Place critical logging actions (e.g., "Add Set", "Complete Workout", "Log Meal") in the bottom ergonomic thumb zone.
- **Touch Target Sizing**: Minimum touch target of **48 x 48 dp** for all interactive elements to accommodate sweaty fingers or movement during workouts.
- **Haptic Feedback**: Subtle haptics on set completion, timer completion, and errors to provide tactile confirmation without looking at the screen.

### Step 5: Accessibility & Compliance
- Contrast ratio: Minimum 4.5:1 for normal text, 3:1 for large text and UI components.
- Screen reader accessibility labels (`accessibilityLabel`, `accessibilityHint`, `accessibilityRole`).
- Dynamic Type support: Layouts must accommodate system font scaling up to 200% without breaking or truncating critical metrics.
- Prominent disclaimers: Sticky or visible disclaimer banners indicating estimated nutrition values and non-medical AI coaching.

---

## Project-Specific Standards
- **Quick-Logging Speed**: A user should be able to log a workout set or a quick meal in under 3 taps from the relevant screen.
- **Glanceability**: Important numbers (remaining calories, current set weight/reps, rest timer) must be readable from an arm's length (e.g., phone sitting on a gym bench).
- **Explicit Consent Screens**: Dedicated modal or onboarding screen explaining camera usage and AI data handling before requesting system permissions.

---

## Best Practices
- Use bottom sheets for secondary contextual interactions (e.g., editing set details, swapping an exercise).
- Keep form fields focused and scrollable with keyboard avoidance.
- Provide instant optimistic UI feedback when logging sets or meals.

---

## Anti-Patterns and Mistakes to Avoid
- **Desktop Grid Thinking**: Putting wide, multi-column tables for workout sets that require horizontal scrolling on phones.
- **Dead-End Screens**: Showing an error message without an actionable retry button or fallback route.
- **Ignoring Arabic RTL**: Testing only English LTR and assuming layout auto-flips without visual flaws.
- **Small Tap Targets**: Designing tiny 24px icon buttons for critical in-workout actions.

---

## Quality Checklist
- [ ] Are all 5 screen states (Loading, Empty, Populated, Error, Offline) specified?
- [ ] Are interactive touch targets at least 48 x 48 dp?
- [ ] Is RTL mirroring defined for navigation, chevrons, and text alignment?
- [ ] Are Arabic line-height and string expansion accommodations noted?
- [ ] Are estimated nutrition and non-medical AI coach disclaimers visually incorporated?
- [ ] Are primary actions situated within the one-thumb zone?

---

## Expected Deliverables
- **Screen Flow Maps**: Navigation hierarchy and state transition diagrams.
- **Screen Specification Sheets**: Wireframe layouts detailing all 5 states, touch zones, and interactions.
- **RTL/LTR Translation & Mirroring Guidelines**: Component-by-component alignment rules.
- **Accessibility Specification**: Focus order, accessibility labels, and contrast verification notes.

---

## Rules for Asking Clarification Instead of Making Assumptions
- If a screen journey lacks clarity on how a user recovers from an interrupted session (e.g., app kill during active workout), ask the product owner for the session restoration policy before finalizing UX flows.
- If navigation hierarchy between tabs vs. modal sheets is contested, confirm the priority user journey before specifying transitions.

