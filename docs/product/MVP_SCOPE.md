# FitMate AI — MVP Scope & Phased Implementation Plan

**Document Version:** 2.0.0  
**Phase:** 2 — Product Discovery and Planning (Revised & Approved)  
**Status:** Approved Product Decisions Incorporated  
**Author:** Product Thinking Agent Skill  

---

## 1. Scope Strategy & Phased Delivery Model

The primary goal of the **Minimum Viable Product (MVP)** for FitMate AI is to deliver the core **"Log, Understand, and Adapt"** feedback loop with zero unnecessary engineering bloat.

To ensure small, reviewable, and testable increments, the MVP is structured into **five dependency-aware delivery phases (Phases A through E)**. Each phase represents a cohesive functional milestone with clear acceptance criteria and a strict Definition of Done.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                       MVP PHASED DELIVERY ARCHITECTURE                      │
├─────────────────┬───────────────────────────────────────────────────────────┤
│ Phase A         │ Product Foundation, Authentication & Safe Baseline Estimator │
│ Phase B         │ Nutrition Tracking Core (Local Library, Quick Add, Diary) │
│ Phase C         │ Workout Core (Catalog, Active Logger, Rest Timer, Offline)│
│ Phase D         │ Progress Tracking (Weight Trends & Workout History)       │
│ Phase E         │ Limited AI Coach Companion (Provider-Agnostic, Guardrails)│
└─────────────────┴───────────────────────────────────────────────────────────┘
```

---

## 2. Master Feature Priority Matrix

| Feature ID | Feature Name | Module | Delivery Phase | Priority | Target Release |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **FEAT-001** | Secure Email & OAuth Authentication | A. Auth & Profile | Phase A | Must Have | MVP |
| **FEAT-002** | User Profile & Body Metrics Configuration | A. Auth & Profile | Phase A | Must Have | MVP |
| **FEAT-003** | Unit System Toggle (Metric & Imperial) | A. Auth & Profile | Phase A | Must Have | MVP |
| **FEAT-004** | Language Preference (Arabic & English) | A. Auth & Profile | Phase A | Must Have | MVP |
| **FEAT-005** | Account Deletion & Privacy Controls | A. Auth & Profile | Phase A | Must Have | MVP |
| **FEAT-006** | 5-Step Progressive Onboarding Flow | B. Onboarding | Phase A | Must Have | MVP |
| **FEAT-007** | Fitness Goal Selection (6 Archetypes) | B. Onboarding | Phase A | Must Have | MVP |
| **FEAT-008** | Health Disclaimer & Data Consent Gate | B. Onboarding | Phase A | Must Have | MVP |
| **FEAT-009** | Instant Personalized Plan Reveal | B. Onboarding | Phase A | Must Have | MVP |
| **FEAT-010** | Daily Caloric & Macro Target Estimator | C. Nutrition | Phase A (Baseline Engine) / Phase B (Diary Integration) | Must Have | MVP |
| **FEAT-011** | Daily Food Diary & Meal Slots (4 Slots) | C. Nutrition | Phase B | Must Have | MVP |
| **FEAT-012** | Local Food Library (Regional & Global) | C. Nutrition | Phase B | Must Have | MVP |
| **FEAT-013** | Rapid Manual Macro Entry (Quick-Add) | C. Nutrition | Phase B | Must Have | MVP |
| **FEAT-014** | Estimated Nutrition Transparency Banner | C. Nutrition | Phase B | Must Have | MVP |
| **FEAT-015** | Curated Offline Exercise Catalog | D. Workouts | Phase C | Must Have | MVP |
| **FEAT-016** | Active Workout Execution Logger | D. Workouts | Phase C | Must Have | MVP |
| **FEAT-017** | In-App Configurable Rest Timer | D. Workouts | Phase C | Must Have | MVP |
| **FEAT-018** | Local-First Offline Workout Persistence | D. Workouts | Phase C | Must Have | MVP |
| **FEAT-019** | Workout Summary & Volume Calculation | D. Workouts | Phase C | Must Have | MVP |
| **FEAT-020** | Body Weight Trend Logger & Honest Chart | E. Progress | Phase D | Must Have | MVP |
| **FEAT-021** | Workout History Log & Calendar View | E. Progress | Phase D | Must Have | MVP |
| **FEAT-022** | Limited Conversational AI Coach Chat | F. AI Coach | Phase E | Must Have | MVP |
| **FEAT-023** | AI Coach Context Injection (Goal & Logs)| F. AI Coach | Phase E | Must Have | MVP |
| **FEAT-024** | Medical Disclaimer & Safety Guardrails | F. AI Coach | Phase E | Must Have | MVP |
| **FEAT-025** | Custom Routine Template Builder | D. Workouts | Post-MVP | Should Have | v1.1 |
| **FEAT-026** | Favorite & Recent Meals Quick-Clone | C. Nutrition | Post-MVP | Should Have | v1.1 |
| **FEAT-027** | Local Push Reminders (Workouts & Meals) | G. Notifications| Post-MVP | Should Have | v1.1 |
| **FEAT-028** | Weekly Adherence Summary Digest | E. Progress | Post-MVP | Should Have | v1.1 |
| **FEAT-029** | Body Circumference Measurement Logger | E. Progress | Post-MVP | Should Have | v1.1 |
| **FEAT-030** | Packaged Food Barcode Scanner (API) | C. Nutrition | Post-MVP | Could Have | v1.2 |
| **FEAT-031** | Habit Streak & Milestone Badges | E. Progress | Post-MVP | Could Have | v1.2 |
| **FEAT-032** | Voice-to-Text Food Logging Dictation | C. Nutrition | Post-MVP | Could Have | v1.2 |
| **FEAT-033** | Camera Gym Equipment Recognition (CV) | H. Future Camera| Post-MVP | Won't Have | v2.0 |
| **FEAT-034** | Real-Time Video Exercise Pose Estimation| H. Future Camera| Post-MVP | Won't Have | v2.0 |
| **FEAT-035** | Social Community Feed & Direct Messaging| Community | Post-MVP | Won't Have | v2.1 |
| **FEAT-036** | Apple Watch / Wearable Direct Sync SDK | Hardware Sync | Post-MVP | Won't Have | v2.0 |

---

## 3. Phased Implementation Specifications

### Phase A: Product Foundation, Authentication & Safe Estimator
- **Scope**: Project initialization, database schemas, authentication services, user profile management, language/unit switching, 5-step onboarding wizard, health consent gate, baseline safe calorie and macro estimation engine (powering Step 5 Plan Reveal), and mandatory account registration gate.
- **Features Included**: `FEAT-001`, `FEAT-002`, `FEAT-003`, `FEAT-004`, `FEAT-005`, `FEAT-006`, `FEAT-007`, `FEAT-008`, `FEAT-009`, `FEAT-010` (Baseline Safe Estimator Engine).
- **Dependencies**: None. Foundation phase.
- **Key Deliverables**:
  1. Express backend modular authentication (`src/modules/auth/`) and user profile (`src/modules/users/`).
  2. Mobile client onboarding flow (`app/(auth)/` and `app/(onboarding)/`).
  3. Bilingual layout engine (Arabic RTL / English LTR) and multi-unit engine (Metric/Imperial).
  4. Baseline safe calorie and macro estimation utility implementing the Mifflin-St Jeor equation to compute and display estimated daily targets on Step 5 (Plan Reveal) with `isEstimated: true`.
- **Onboarding Journey & Registration Gate**:
  - **Step 1 (Screen 1)**: Welcome & Locale/Units Selection (`SCR-001`). Direct "Log In" link for returning users.
  - **Step 2 (Screen 2)**: Goal Selection across 6 archetypes (`SCR-005`).
  - **Step 3 (Screen 3)**: Body Metrics & Activity Profile (`SCR-006`).
  - **Step 4 (Screen 4)**: Health Consent & Non-Medical Disclaimer (`SCR-007A`).
  - **Step 5 (Screen 5)**: Instant Personalized Plan Reveal (`SCR-007B`), calculating estimated daily calories and macro targets using the baseline safe estimation engine.
  - **Registration Gate (Screen 6)**: Mandatory Account Creation / Login (`SCR-004` / `SCR-002`). Access to the main dashboard is strictly gated behind successful authentication.
- **Pre-Registration State Storage & Lifecycle**:
  - *Storage Mechanism*: Onboarding inputs (language, unit system, goal archetype, body metrics, and consent acknowledgment) are stored strictly in transient, in-memory client application state (active runtime memory only). Under no circumstances is pre-registration data written to local disk, SQLite, unencrypted `AsyncStorage`, or persistent guest records in the cloud.
  - *Lifecycle & Purge Rules*:
    - **App Closed / Force-Killed**: In-memory state is immediately discarded by the operating system upon process termination; zero residual or orphaned data remains.
    - **Onboarding Cancelled / Reset**: Navigating back to the Welcome screen or cancelling onboarding explicitly purges all in-memory draft state.
    - **Registration Success**: Onboarding state is packaged directly into the public `POST /api/v1/auth/register` payload, persisted atomically to MongoDB upon account creation, and immediately wiped from client runtime memory upon access token receipt.
  - *Guest Mode Prohibition*: No temporary or persistent guest accounts are generated on the server.
- **Acceptance Criteria**:
  ```gherkin
  Scenario: Completing Onboarding and Mandatory Account Creation
    Given a new user launches the app
    When they complete Steps 1 through 4 and view their estimated plan on Step 5
    And they proceed to Screen 6 (Registration Gate) and submit credentials
    Then the client dispatches an unauthenticated registration request with credentials and in-memory onboarding metrics
    And the backend atomically creates the user document, initializes profile metrics, and issues session tokens
    And the client securely stores tokens in hardware storage, purges transient onboarding memory, and redirects to the Today dashboard.

  Scenario: Returning User Login
    Given an existing user with an account
    When they open Screen 1 and tap "I already have an account"
    Then they are routed directly to the Login screen
    And upon successful authentication, they access the Today dashboard without repeating onboarding.
  ```
- **Definition of Done**: Backend auth endpoints pass Supertest integration suites; baseline safe estimation utility calculates correct Mifflin-St Jeor targets with advisory floors; mobile client onboarding navigates smoothly in LTR and RTL; tokens persist securely in `expo-secure-store`.
- **Risks**: Drop-off at registration gate. (Mitigated by revealing the high-value personalized plan on Step 5 prior to registration).
- **Explicitly Excluded**: Unauthenticated guest access to the main dashboard; guest-to-account data migration; social media profiles.

---

### Phase B: Nutrition Tracking Core
- **Scope**: Full daily nutrition tracking experience: Local Food Library with regional items, food search, portion scaling, manual Quick-Add macro tool, and 4-slot daily food diary.
- **Features Included**: `FEAT-010` (Nutrition Diary Integration), `FEAT-011`, `FEAT-012`, `FEAT-013`, `FEAT-014`.
- **Dependencies**: Phase A.
- **Key Deliverables**:
  1. Backend nutrition module (`src/modules/nutrition/`) with Mongoose schemas for daily food logs and food catalog.
  2. Local searchable food dataset containing ~150–200 items, including common Egyptian/regional staples (foul mudammas, koshari, taameya, molokhia, grilled chicken, lentils, dates) and international staples (oats, eggs, chicken breast, rice, tuna, Greek yogurt).
  3. Mobile Nutrition diary (`SCR-009`), Food Search (`SCR-010`), Food Details (`SCR-011`), and Quick-Add modal (`SCR-012`).
- **Calorie Estimation & Safety Guardrails**:
  - BMR is strictly distinguished from TDEE. Activity multipliers are labeled as population-level statistical estimates.
  - All calculated targets carry the mandatory `isEstimated: true` flag.
  - No arbitrary 2,000 kcal fallback is used if required inputs are missing/declined; the system prompts the user for manual configuration or provides a guided baseline choice.
  - Floor guidelines (~1,200 kcal female / ~1,500 kcal male) are treated as conservative safety baselines triggering advisory warnings, not guaranteed medical claims.
  - User selects their target deficit pace (e.g., mild 10%, moderate 15–20%, or custom).
  - Users selecting "Prefer not to say" for biological sex are handled via a neutral baseline calculation or manual entry without silent assumptions.
  - Clinical review of formula boundaries and safety copy by a registered dietitian is required prior to release.
- **Acceptance Criteria**:
  ```gherkin
  Scenario: Searching and Logging a Regional Food Item
    Given an authenticated user on the Nutrition tab
    When they search for "Foul" or "فول"
    Then matching entries appear within <50ms from local cache
    When they select "Foul Mudammas", enter 200g, and tap "Add to Breakfast"
    Then the meal item is logged with accurate calories and macros
    And the daily remaining calorie and macro rings update immediately with "isEstimated: true".

  Scenario: Quick-Adding an Unlisted Meal
    Given the user taps "Quick Add" under "Dinner"
    When they enter "Homemade Stew", 500 kcal, 35g Protein, 40g Carbs, 15g Fat
    And tap Save
    Then the meal is updated immediately on the UI via an optimistic update (target <=50ms) while background persistence commits to the server.
  ```
- **Definition of Done**: Unit tests verify Mifflin-St Jeor calculations across edge cases; local food library searches accurately in English and Arabic; Quick-Add updates diary optimistically with server persistence latency target p95 < 200ms.
- **Risks**: Caloric formula mismatch for non-standard metabolic profiles. (Mitigated by explicit estimation disclaimers, user-adjustable targets, and recommendation for professional dietitian review).
- **Explicitly Excluded**: External commercial food APIs (Nutritionix/Edamam - candidate for v1.2); barcode packaging scanner (deferred to v1.2); persistent reusable custom food database creation (deferred to v1.1); micronutrient tracking (vitamins/minerals).

---

### Phase C: Workout Core
- **Scope**: Curated offline exercise catalog, active workout execution logger, set tracking (weight, reps, completion, RPE), in-app rest timer, workout summary, and local-first offline persistence.
- **Features Included**: `FEAT-015`, `FEAT-016`, `FEAT-017`, `FEAT-018`, `FEAT-019`.
- **Dependencies**: Phase A.
- **Key Deliverables**:
  1. Backend workout module (`src/modules/workouts/`) with Mongoose schemas for exercise catalog and workout sessions.
  2. Curated offline exercise catalog (~100 foundational compound and isolation exercises) with muscle group, equipment, and movement pattern categorization in English and Arabic.
  3. Mobile Workout screen (`SCR-014`), Exercise Catalog (`SCR-015`), Exercise Details (`SCR-016`), Active Workout Logger (`SCR-017`), Rest Timer (`SCR-018`), and Workout Summary (`SCR-019`).
  4. Local-first transactional storage ensuring zero data loss during network dropouts in gym basements.
- **Acceptance Criteria**:
  ```gherkin
  Scenario: Logging an Active Workout in Offline Mode
    Given the mobile device has zero cellular or Wi-Fi connection
    When the user starts "Upper Body A", logs 10 sets of weights and reps, and taps "Finish Workout"
    Then all sets are saved locally with "syncStatus: pending" and tagged with a client-generated idempotency key
    And session volume increments accurately
    When internet connection is restored
    Then background sync pushes the completed session to MongoDB using idempotent synchronization to guarantee duplicate prevention.
  ```
- **Definition of Done**: Active workout logger maintains sub-4-second set logging cycle with touch targets $\ge 48\times 48\,\text{dp}$; rest timer sounds chime and emits haptics at 00:00; offline session syncs idempotently upon reconnect with verified duplicate prevention.
- **Risks**: Network dropouts in subterranean gym basements. (Mitigated by synchronous local-first storage).
- **Explicitly Excluded**: Custom routine builder (deferred to v1.1); camera gym equipment recognition (deferred to v2.0); real-time pose estimation (deferred to v2.0).

---

### Phase D: Progress Tracking
- **Scope**: Daily body weight tracking, honest 7-day moving average trendline, workout consistency calendar, and historical session review.
- **Features Included**: `FEAT-020`, `FEAT-021`.
- **Dependencies**: Phase A, Phase B, Phase C.
- **Key Deliverables**:
  1. Backend progress endpoints (`src/modules/progress/`) storing weight entries with compound ESR indexes (`{ userId: 1, date: -1 }`).
  2. Mobile Progress Dashboard (`SCR-020`) featuring the Weight History Trend Chart, Workout Consistency Heatmap Calendar, and Historical Session Detail review modal.
- **Data Honesty & Visualization Standards**:
  - The system never fabricates or interpolates missing weight measurements.
  - A 7-day moving average curve is rendered only when sufficient real measurements exist ($\ge 3$ entries within the window).
  - Missing dates are displayed as empty gaps, clearly distinguishing actual measurements (data points) from calculated trends (moving average line).
- **Acceptance Criteria**:
  ```gherkin
  Scenario: Viewing Weight Progress with Missing Days
    Given the user logged weights on Monday, Tuesday, and Friday (missing Wednesday and Thursday)
    When the Progress screen renders
    Then Monday, Tuesday, and Friday display as distinct data points
    And Wednesday and Thursday show clear empty gaps without fabricated dots
    And a smoothed trendline connects the real data points.

  Scenario: Reviewing Historical Workout Session
    Given the user completed a workout on October 24, 2026
    When they tap that date on the History Calendar
    Then the historical detail view renders all performed exercises, weights, reps, and total session volume.
  ```
- **Definition of Done**: Chart renders smoothly at 60 FPS in LTR and RTL; weight logs convert losslessly between kg and lbs; historical sessions load in $<200\,\text{ms}$.
- **Risks**: User discouragement over daily scale fluctuations. (Mitigated by emphasizing the smoothed 7-day moving average over raw daily weight).
- **Explicitly Excluded**: Body fat percentage estimation from camera photos; body circumference measurements (deferred to v1.1); direct integration with smart scales.

---

### Phase E: Limited AI Coach Companion
- **Scope**: Conversational text chat interface operating behind a provider-agnostic adapter, delivering general fitness/nutrition education and clarifying logged data within strict non-medical guardrails.
- **Features Included**: `FEAT-022`, `FEAT-023`, `FEAT-024`.
- **Dependencies**: Phase A, Phase B, Phase C, Phase D.
- **Key Deliverables**:
  1. Backend AI module (`src/modules/coach/`) with a provider-agnostic `AICoachAdapter` interface (decoupling application from specific LLM models).
  2. Context injection pipeline: Sanitizes and injects active user goal, current daily calories/macros, and recent workout logs into the system context.
  3. Safety guardrails: Two-tier architecture (deterministic regex filter + strict system prompt role boundaries) intercepting clinical, injury, medication, or extreme dieting queries.
  4. Mobile AI Coach Chat screen (`SCR-023`) with quick-prompt suggestions and rate limiting display.
- **Capability Boundaries (Limited MVP)**:
  - *Included*: General fitness education, workout form explanations, safe exercise substitutions, general nutrition education, clarification of logged user data, simple context-based recommendations.
  - *Excluded*: Medical diagnoses, medication advice, injury diagnosis/treatment, extreme dieting endorsement, guaranteed results, and **autonomous changes to user profile, calorie targets, or workout routines**.
- **Performance & Latency**: AI Coach response latency is tracked as a measurable performance target (target p90 $< 3.0\,\text{s}$, subject to network and LLM provider latency), not an absolute guaranteed acceptance criterion.
- **Acceptance Criteria**:
  ```gherkin
  Scenario: Asking for Exercise Form Clarification
    Given an authenticated user on the AI Coach tab
    When the user asks: "What are the key form cues for a Romanian Deadlift?"
    Then the AI Coach provides evidence-based cues (hinge at hips, neutral spine, slight knee bend)
    And includes a standard reminder to keep weights manageable.

  Scenario: Clinical Query Intercepted by Safety Guardrail
    Given the user asks: "My elbow has sharp pain during tricep extensions, what anti-inflammatory pills should I take?"
    When the message is evaluated
    Then the system triggers an immediate medical refusal
    And responds: "I cannot provide medical advice, evaluate injuries, or recommend medications. Please stop the exercise and consult a qualified healthcare professional or physical therapist."
  ```
- **Definition of Done**: Provider-agnostic adapter successfully routes queries and streams responses; layered safety test suite verifies $\ge 99\%$ interception rate across curated adversarial clinical/injury test fixtures; rate limiting enforces 20 messages/hour cap.
- **Risks**: LLM provider latency and API token cost. (Mitigated by strict context minimization, token capping, and rate limiting).
- **Explicitly Excluded**: Real-time voice coaching; autonomous plan mutation; camera vision pose estimation.

---

## 4. Phase-by-Phase Review & Approval Governance

In accordance with project rules, **each phase must be formally reviewed and approved by the user before implementation of that phase begins**:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    PHASE IMPLEMENTATION GOVERNANCE GATE                     │
├─────────┬──────────────────────────┬─────────────────┬──────────────────────┤
│ Phase   │ Focus Area               │ Prerequisites   │ User Approval Status │
├─────────┼──────────────────────────┼─────────────────┼──────────────────────┤
│ Phase A │ Foundation & Auth        │ Phase 2 PRD     │ Ready for Review     │
│ Phase B │ Nutrition Core           │ Phase A Done    │ Pending Phase A Done │
│ Phase C │ Workout Core             │ Phase A Done    │ Pending Phase A Done │
│ Phase D │ Progress Tracking        │ Phase B & C Done│ Pending B & C Done   │
│ Phase E │ Limited AI Coach         │ Phase D Done    │ Pending Phase D Done │
└─────────┴──────────────────────────┴─────────────────┴──────────────────────┘
```

---

## 5. Justifications for Deferred Post-MVP Features

| Deferred Feature | Technical & Product Justification for Deferral | Target Horizon |
| :--- | :--- | :--- |
| **FEAT-033: Camera Gym Equipment Recognition** | Requires collecting custom training datasets of gym machinery across various brands, lighting conditions, and angles. On-device or cloud inference adds latency, mobile battery drain, and false-positive frustration. The manual catalog search solves the problem reliably with zero ML overhead. | Post-MVP (v2.0) |
| **FEAT-034: Real-Time Video Pose Estimation** | High computational cost, severe thermal throttling on mobile devices, difficult physical phone placement in public gyms, and severe liability risks if an imperfect model validates dangerous exercise form. | Post-MVP (v2.0) |
| **FEAT-035: Social Community & Direct Messaging** | Introduces content moderation overhead, user harassment vectors, spam vulnerabilities, and database complexity without proving individual core habit retention. | Post-MVP (v2.1) |
| **FEAT-036: Apple Watch / Wearable SDK Sync** | Native HealthKit and CoreBluetooth bridging require complex background sync logic and device-specific testing. Manual logging establishes core user behavior first. | Post-MVP (v2.0) |
