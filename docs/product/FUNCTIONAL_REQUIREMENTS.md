# FitMate AI — Functional Requirements Specification

**Document Version:** 2.0.0  
**Phase:** 2 — Product Discovery and Planning (Revised & Approved)  
**Status:** Approved Product Decisions Incorporated  
**Author:** Product Thinking & API Design Agent Skills  

---

## 1. Specification Framework & Requirement Taxonomy

This document specifies the precise functional requirements governing FitMate AI. Every functional requirement is assigned a permanent, stable ID based on its functional module:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                       FUNCTIONAL REQUIREMENT TAXONOMY                       │
├─────────────────┬───────────────────────────────────────────────────────────┤
│ Prefix          │ Functional Module Description                             │
├─────────────────┼───────────────────────────────────────────────────────────┤
│ FR-AUTH-xxx     │ Module A: Authentication, Account Lifecycle & Profile     │
│ FR-ONBD-xxx     │ Module B: Onboarding, Goal Setup & Consent                │
│ FR-NUTR-xxx     │ Module C: Nutrition Tracking, Food Diary & Macro Engine   │
│ FR-WORK-xxx     │ Module D: Workout Execution, Exercises & Rest Timer       │
│ FR-PROG-xxx     │ Module E: Progress Analytics, Weight Trends & History     │
│ FR-COACH-xxx    │ Module F: Conversational AI Coach & Prompt Guardrails     │
│ FR-NOTIF-xxx    │ Module G: Notifications & Quiet Hours (v1.1)              │
│ FR-SAFE-xxx     │ Module H: Privacy, Data Minimization & Safety Invariants  │
│ FR-I18N-xxx     │ Module I: Internationalization, BiDi Layouts & Units      │
└─────────────────┴───────────────────────────────────────────────────────────┘
```

---

## 2. Module A: Authentication & User Profile

### FR-AUTH-001: User Registration via Email and Password
- **Feature Ref**: `FEAT-001` | **Delivery Phase**: Phase A | **Priority**: Must Have (MVP)
- **Description**: The system must provide an unauthenticated public endpoint (`POST /api/v1/auth/register`) allowing new users to register without requiring a pre-existing authenticated access token. The password must satisfy security complexity constraints (minimum 8 characters, at least 1 uppercase letter, at least 1 digit, at least 1 special character).
- **Inputs**: `email` (string), `password` (string), `clientNonce` (string), optional `onboardingProfile` (object containing: `goal`, `sex`, `birthDate`, `heightCm`, `weightKg`, `activityMultiplier`, `trainingExperience`, `language`, `unitSystem`, `hasAcceptedConsent`).
- **Expected Behavior**: Password is cryptographically hashed using Argon2id (or bcrypt with $\ge 12$ rounds). The backend executes an atomic transaction creating the `User` document, persisting onboarding profile metrics, and recording consent metadata. The system generates a short-lived access JWT (15-minute expiration) and a revocable refresh token, returning an authenticated session envelope.
- **Verification Criteria**:
  - Valid registration returns HTTP 201 with `{ success: true, data: { user, accessToken, refreshToken } }`.
  - Request does not require an Authorization header or existing bearer token.
  - Pre-registration onboarding metrics are persisted to the new user document in MongoDB upon completion.
  - Passwords failing complexity rules are rejected with HTTP 400 and code `VALIDATION_FAILED`.
  - Duplicate email registrations return HTTP 409 with code `EMAIL_EXISTS`.

### FR-AUTH-002: Third-Party OAuth Authentication (Apple & Google)
- **Feature Ref**: `FEAT-001` | **Delivery Phase**: Phase A | **Priority**: Must Have (MVP)
- **Description**: The system must allow 1-tap authentication using Apple Sign-In and Google Identity services, validating identity tokens cryptographically on the backend.
- **Inputs**: `idToken` (string), `provider` (`apple` | `google`).
- **Expected Behavior**: Backend verifies token signature with provider public keys. If user does not exist, an account is created using provider identity claims; if user exists, session tokens are issued.
- **Verification Criteria**: Valid identity token returns HTTP 200/201 with session envelope; tampered or expired tokens return HTTP 401.

### FR-AUTH-003: Token Refresh & Session Continuity
- **Feature Ref**: `FEAT-001` | **Delivery Phase**: Phase A | **Priority**: Must Have (MVP)
- **Description**: The mobile client must automatically renew expired access tokens using the refresh token without interrupting user activity.
- **Inputs**: `refreshToken` (string).
- **Expected Behavior**: Server validates refresh token against active token registry in MongoDB. If valid, issues a new 15-minute access token. If revoked or invalid, returns HTTP 401 forcing re-authentication.
- **Verification Criteria**: Access token refresh succeeds transparently in background; revoked tokens redirect to login within 200ms.

### FR-AUTH-004: User Profile Body Metrics Storage
- **Feature Ref**: `FEAT-002` | **Delivery Phase**: Phase A | **Priority**: Must Have (MVP)
- **Description**: The system must store and update user demographic and body metrics: biological sex (`male`, `female`, `prefer_not_to_say`), birth date, height in cm, weight in kg, activity multiplier (1.2 to 1.9), and training experience level.
- **Inputs**: User profile object with normalized base metrics.
- **Expected Behavior**: Updates are validated via Zod schemas. Any change in weight automatically logs a new entry into the user's historical weight ledger.
- **Verification Criteria**: Height must be between 100 cm and 250 cm; weight between 30 kg and 350 kg; invalid values rejected with HTTP 400.

### FR-AUTH-005: Self-Service Account Deletion
- **Feature Ref**: `FEAT-005` | **Delivery Phase**: Phase A | **Priority**: Must Have (MVP)
- **Description**: The system must provide a permanent, self-service account deletion mechanism that erases all associated user records across database collections.
- **Inputs**: Authenticated user session, `currentPassword` confirmation.
- **Expected Behavior**: Executes an atomic transaction deleting the user document, all workout sessions, nutrition logs, weight entries, and coach chat logs. Revokes all active refresh tokens.
- **Verification Criteria**: Following deletion, querying user resources with previous JWT returns HTTP 401; database collections contain zero orphaned documents for the deleted user ID.

---

## 3. Module B: Onboarding & Goal Discovery

### FR-ONBD-001: Locale & Unit System Selection on Step 1
- **Feature Ref**: `FEAT-003`, `FEAT-004` | **Delivery Phase**: Phase A | **Priority**: Must Have (MVP)
- **Description**: Onboarding must present language selection (`en` | `ar`) and unit system selection (`metric` | `imperial`) on the initial welcome screen before any other user input. Returning users must be provided a direct "I already have an account" login path.
- **Inputs**: `selectedLanguage`, `selectedUnits`.
- **Expected Behavior**: Changing language immediately triggers client-side bi-directional re-rendering (LTR $\leftrightarrow$ RTL). Changing units immediately alters subsequent input field masks.
- **Verification Criteria**: Selecting Arabic switches UI layout direction and Cairo font; selecting Imperial sets initial height unit to `ft/in` and weight to `lbs`.

### FR-ONBD-002: Goal Archetype Selection (Step 2)
- **Feature Ref**: `FEAT-007` | **Delivery Phase**: Phase A | **Priority**: Must Have (MVP)
- **Description**: The system must allow users to select from 6 distinct goal archetypes: `fat_loss`, `muscle_gain`, `recomposition`, `maintenance`, `general_fitness`, and `undecided`.
- **Inputs**: `goalId` (enum).
- **Expected Behavior**: The selected goal is persisted in client state and used as a primary factor in BMR/TDEE target calculation.
- **Verification Criteria**: Selection is strictly required to advance beyond Step 2; only one primary goal can be selected.

### FR-ONBD-003: Health Data Consent & Disclaimer Gate (Step 4)
- **Feature Ref**: `FEAT-008` | **Delivery Phase**: Phase A | **Priority**: Must Have (MVP)
- **Description**: The onboarding flow must display a non-dismissible health disclaimer stating that calculations are estimates and that FitMate AI is not a medical doctor. An explicit consent checkbox must be toggled to proceed.
- **Inputs**: `hasAcceptedConsent` (boolean).
- **Expected Behavior**: If unchecked, the CTA to advance remains disabled. When checked, records `consentTimestamp` and `consentVersion` in user state.
- **Verification Criteria**: User cannot advance to Step 5 (Plan Reveal) without `hasAcceptedConsent: true`.

### FR-ONBD-004: Instant Plan Reveal (Step 5) & Mandatory Registration Gate (Screen 6)
- **Feature Ref**: `FEAT-009`, `FEAT-001` | **Delivery Phase**: Phase A | **Priority**: Must Have (MVP)
- **Description**: The system must calculate and present an instant plan preview (Estimated Daily Calories, Protein/Carbs/Fat breakdown, and recommended workout cadence) on Step 5. Entering the main application dashboard is strictly gated behind mandatory account registration/login on Screen 6 (`SCR-004`).
- **Inputs**: Onboarding metrics payload (Age, Sex, Height, Weight, Activity, Goal).
- **Expected Behavior**: Computes targets client-side via the baseline safe estimation utility. Displays values with mandatory `isEstimated: true` badge. Tapping "Save My Plan & Create Account" routes to Screen 6 (`SCR-004`).
  - **Storage & Lifecycle**: All onboarding inputs are retained strictly in transient, in-memory client application state during the active wizard session. Under no circumstances is pre-registration data written to local disk, SQLite, unencrypted `AsyncStorage`, or persistent guest accounts in the database.
  - **App Closed / Force-Killed**: In-memory state is immediately discarded by the operating system upon process termination; zero residual or orphaned data remains.
  - **Onboarding Cancelled / Reset**: Navigating back to the Welcome screen or cancelling onboarding explicitly purges all in-memory draft state.
  - **Registration Success**: Onboarding state is packaged directly into the public `POST /api/v1/auth/register` payload, persisted atomically to MongoDB upon account creation, and immediately wiped from client runtime memory upon access token receipt.
  - No unauthenticated Guest Mode is permitted.
- **Verification Criteria**: Computed plan renders in $<1.5$ seconds; user cannot access Dashboard without completing registration or login.

---

## 4. Module C: Nutrition & Macro Tracking

### FR-NUTR-001: Daily Caloric & Macronutrient Target Calculation
- **Feature Ref**: `FEAT-010` | **Delivery Phase**: Phase A (Baseline Estimation Engine for Plan Preview) / Phase B (Diary Integration) | **Priority**: Must Have (MVP)
- **Description**: The system must estimate Basal Metabolic Rate (BMR) at complete rest using the Mifflin-St Jeor equation:
  $$\text{BMR} = 10 \times \text{weight (kg)} + 6.25 \times \text{height (cm)} - 5 \times \text{age (y)} + s$$
  where $s = +5$ for males, $-161$ for females, and $s = -78$ (neutral intermediate baseline) for users selecting "Prefer not to say". Total Daily Energy Expenditure (TDEE) is calculated as $\text{BMR} \times \text{activityMultiplier}$. Activity multipliers are labeled as population statistical estimates.
- **Goal Adjustments & User-Selected Pace**:
  - `fat_loss`: User selects target deficit pace (Mild ~10%, Moderate ~15–20%, or custom).
  - `muscle_gain`: Mild surplus (~10% or $+200$ to $+300\,\text{kcal}$).
  - `recomposition`: Maintenance or mild deficit (~5%) with high protein target ($2.0–2.2\,\text{g/kg}$).
  - `maintenance` / `general_fitness` / `undecided`: Neutral TDEE baseline.
- **Safety Floor Guidelines**: Conservative floor guidelines (~1,200 kcal/day for adult females and ~1,500 kcal/day for adult males) trigger prominent health advisory banners against severe caloric restriction.
- **Missing / Declined Inputs**: If required inputs are missing or declined, the system prompts the user to configure manual targets or select an unpersonalized baseline (no arbitrary 2,000 kcal fallback is forced).
- **Professional Review Requirement**: All caloric formulas and safety warning thresholds must undergo review by a registered dietitian or qualified health professional prior to public release.
- **Verification Criteria**: All calculated values carry `isEstimated: true`; severe deficits trigger advisory warnings.

### FR-NUTR-002: Four Standard Meal Slots Management
- **Feature Ref**: `FEAT-011` | **Delivery Phase**: Phase B | **Priority**: Must Have (MVP)
- **Description**: The nutrition diary must group food items into four standard slots: Breakfast, Lunch, Dinner, and Snacks for any selected date.
- **Inputs**: `date` (YYYY-MM-DD), `mealSlot` (`breakfast` | `lunch` | `dinner` | `snack`).
- **Expected Behavior**: Returns array of logged foods for each slot, slot caloric subtotals, and overall daily remaining balance.
- **Verification Criteria**: Querying a date with no entries returns an initialized empty structure with zero consumed calories and full remaining budget.

### FR-NUTR-003: Local Food Library Search (Regional & International)
- **Feature Ref**: `FEAT-012` | **Delivery Phase**: Phase B | **Priority**: Must Have (MVP)
- **Description**: The system must provide instant, 100% offline-accessible search across a curated local database of ~150–200 foods. The dataset must include common Egyptian and regional Middle Eastern staples (foul mudammas, koshari, taameya, molokhia, grilled chicken, lentils, dates) alongside common international staples (oats, eggs, chicken breast, rice, tuna, Greek yogurt).
- **Inputs**: `searchQuery` (string), optional `categoryFilter`.
- **Expected Behavior**: Substring matching across English and Arabic names with $<50\,\text{ms}$ response latency. All values are labeled as nutritional estimates derived from standard food composition tables. No commercial external food API dependency exists in MVP.
- **Verification Criteria**: Searching "foul" or "فول" returns matching foul items with verified macro profiles.

### FR-NUTR-004: Portion Sizing & Dynamic Macro Scaling
- **Feature Ref**: `FEAT-012` | **Delivery Phase**: Phase B | **Priority**: Must Have (MVP)
- **Description**: When viewing a food item, user can adjust portion quantity (e.g., 150g or 1.5 plates); calculated calories and macros scale linearly.
- **Inputs**: `foodId`, `servingSizeQuantity`, `servingSizeUnit`.
- **Expected Behavior**: Computed values rounded to nearest single decimal place:
  $$\text{Calories} = \text{baseCalories} \times \frac{\text{enteredGrams}}{100}$$
- **Verification Criteria**: 150g of a 200 kcal/100g item returns exactly 300 kcal with `isEstimated: true`.

### FR-NUTR-005: Quick-Add Manual Meal Entry
- **Feature Ref**: `FEAT-013` | **Delivery Phase**: Phase B | **Priority**: Must Have (MVP)
- **Description**: The system must allow users to log an uncatalogued meal by directly entering calories and optional macro grams without searching the catalog.
- **Inputs**: `mealSlot`, `name` (optional, default: "Quick Add"), `calories` (required, $\ge 0$), `protein` ($\ge 0$), `carbs` ($\ge 0$), `fat` ($\ge 0$).
- **Expected Behavior**: Appends entry to selected meal slot via an immediate optimistic UI update; dispatches asynchronous persistence to the backend.
- **Verification Criteria**:
  - **UI Responsiveness Target**: Logging a meal updates local remaining calorie and macro budgets within the next animation frame (target $\le 50\,\text{ms}$) on the mobile client.
  - **Backend Persistence**: Asynchronous network save to `/api/v1/nutrition/meals` achieves server response latency target p95 $< 200\,\text{ms}$ (excluding network transit).

### FR-NUTR-006: Nutrition Estimation Transparency Enforcement
- **Feature Ref**: `FEAT-014` | **Delivery Phase**: Phase B | **Priority**: Must Have (MVP)
- **Description**: Every screen, API response, and export containing nutrition calculations must display a persistent visual badge: `Estimated / قيمة تقريبية`.
- **Inputs**: None (systemic rule).
- **Expected Behavior**: Tapping the badge opens an educational modal explaining that metabolic rates and food measurements contain natural variance.
- **Verification Criteria**: Automated UI audits verify that no nutrition view renders without the estimate indicator.

---

## 5. Module D: Workout Execution & Exercise Catalog

### FR-WORK-001: Curated Offline Exercise Library Navigation
- **Feature Ref**: `FEAT-015` | **Delivery Phase**: Phase C | **Priority**: Must Have (MVP)
- **Description**: The system must provide an offline-accessible library of ~100 foundational exercises categorized by target muscle group, equipment required, and movement pattern, with bilingual English and Arabic instructions.
- **Inputs**: Filters for `muscleGroup` (`chest`, `back`, `legs`, `shoulders`, `arms`, `core`) and `equipment` (`barbell`, `dumbbell`, `machine`, `cable`, `bodyweight`).
- **Expected Behavior**: Returns matching exercise items with localized names, instructions, and anatomical tags.
- **Verification Criteria**: Filtering by "Chest" and "Barbell" returns Bench Press variations; works 100% offline.

### FR-WORK-002: Active Workout Session Initialization
- **Feature Ref**: `FEAT-016` | **Delivery Phase**: Phase C | **Priority**: Must Have (MVP)
- **Description**: User can initiate an active workout session from a pre-built routine or blank template. The session records start timestamp and activates mobile keep-awake mode.
- **Inputs**: `routineId` (optional), `workoutName`.
- **Expected Behavior**: Session document initialized in local storage; previously logged weights and reps for selected exercises are pre-populated as reference values.
- **Verification Criteria**: Screen does not auto-lock while workout session is active.

### FR-WORK-003: Set-by-Set Logging & Checkmark Completion
- **Feature Ref**: `FEAT-016` | **Delivery Phase**: Phase C | **Priority**: Must Have (MVP)
- **Description**: Inside an active workout, user inputs `weight` and `reps` for a set and taps the completion checkmark button ($\ge 48\times 48\,\text{dp}$).
- **Inputs**: `setNumber`, `weight`, `reps`, `isCompleted` (boolean), optional `rpe` (1–10).
- **Expected Behavior**: Set row highlights as completed; phone emits gentle haptic feedback; total session tonnage increments; rest timer automatically launches.
- **Verification Criteria**: Tapping checkmark toggles completed state; unchecking reverses volume addition and stops rest timer.

### FR-WORK-004: In-App Configurable Rest Timer
- **Feature Ref**: `FEAT-017` | **Delivery Phase**: Phase C | **Priority**: Must Have (MVP)
- **Description**: An automated countdown timer triggers upon set completion with user-configurable default durations (30s to 300s).
- **Inputs**: `durationSeconds` (default: 90, range: 15 to 300).
- **Expected Behavior**: Visual countdown renders on docked timer banner. User can adjust time (`+15s`, `-15s`) or skip. Upon reaching `00:00`, device vibrates (double pulse) and plays sound chime.
- **Verification Criteria**: Timer operates accurately in background; triggers local push notification if app is backgrounded.

### FR-WORK-005: Local-First Offline Workout Persistence
- **Feature Ref**: `FEAT-018` | **Delivery Phase**: Phase C | **Priority**: Must Have (MVP)
- **Description**: Every completed set, exercise addition, and session state change must write synchronously to local device storage before issuing network calls, utilizing client-generated idempotency identifiers to ensure duplicate prevention. Specific synchronization technologies are determined in Phase 3 architecture.
- **Inputs**: Active workout mutation event.
- **Expected Behavior**: If offline, session mutations are stored locally with `syncStatus: "pending"` and tagged with a client-generated UUID / idempotency key. When network connectivity is restored, the client performs idempotent background synchronization to `/api/v1/workouts`. The backend verifies idempotency keys to ensure duplicate network transmissions do not create duplicate workout sets or inflate volume metrics.
- **Verification Criteria**:
  - Force-killing app during active session and relaunching restores exact set states without data loss.
  - Re-sending the same completed session payload multiple times results in exactly one session record in MongoDB.

### FR-WORK-006: Workout Summary & Volume Aggregation
- **Feature Ref**: `FEAT-019` | **Delivery Phase**: Phase C | **Priority**: Must Have (MVP)
- **Description**: Finishing a workout calculates session duration, total volume lifted ($\sum \text{weight} \times \text{reps}$ across completed sets), and personal record highlights.
- **Inputs**: Completed session state.
- **Expected Behavior**: Displays congratulatory summary screen (`SCR-019`); archives session into user workout history.
- **Verification Criteria**: Empty workouts (zero sets logged) prompt user for confirmation before saving or discarding.

---

## 6. Module E: Progress Tracking & Analytics

### FR-PROG-001: Body Weight Logging & Honest Trend Visualization
- **Feature Ref**: `FEAT-020` | **Delivery Phase**: Phase D | **Priority**: Must Have (MVP)
- **Description**: The system must allow users to log body weight entries and visualize them honestly.
- **Standards**:
  - **Real Data Only**: Only actual recorded weigh-ins appear as data points.
  - **No Fabricated Interpolation**: Missing days are rendered as clean empty gaps; the system never invents fake data points for unmeasured days.
  - **Smoothed 7-Day Moving Average**: Calculated and rendered only when $\ge 3$ distinct real measurements exist within the time window.
- **Inputs**: `date`, `weight` (numeric), `unit` (`kg` | `lbs`).
- **Expected Behavior**: Normalizes weight to kg internally; calculates moving average cleanly.
- **Verification Criteria**: Missing dates show gaps; trendline connects real points without fabricated values.

### FR-PROG-002: Workout History Calendar & Detail Review
- **Feature Ref**: `FEAT-021` | **Delivery Phase**: Phase D | **Priority**: Must Have (MVP)
- **Description**: The system must provide a historical calendar view highlighting workout days and allowing detailed drill-down into past session logs.
- **Inputs**: `month`, `year` query filters.
- **Expected Behavior**: Returns array of completed workouts; tapping a session opens historical view detailing all exercises, weights, and reps.
- **Verification Criteria**: Completed workouts render as green markers on the calendar; historical detail view is read-only by default.

---

## 7. Module F: Conversational AI Coach Companion (Limited MVP Scope)

### FR-COACH-001: Context-Aware Conversational Chat
- **Feature Ref**: `FEAT-022`, `FEAT-023` | **Delivery Phase**: Phase E | **Priority**: Must Have (MVP)
- **Description**: The system must provide a mobile chat interface operating behind a provider-agnostic adapter (`AICoachAdapter`). Prompts are orchestrated with injected user context: active goal, current daily calories/macros, and recent workout history.
- **Inputs**: User message string (`content`).
- **Expected Behavior**: Backend injects sanitized context payload into system prompt; streams assistant response with a measurable performance target (target p90 $< 3.0\,\text{s}$).
- **Capability Scope**: Limited to general fitness education, workout form explanations, safe exercise substitutions, general nutrition education, clarification of logged user data, and simple context-based recommendations.
- **Verification Criteria**: Coach response accurately references user's active goal within safe educational boundaries.

### FR-COACH-002: Medical Disclaimer & Injury Refusal Guardrail
- **Feature Ref**: `FEAT-024` | **Delivery Phase**: Phase E | **Priority**: Must Have (MVP)
- **Description**: The AI Coach must strictly refuse to provide medical diagnoses, treatment plans, medication advice, or evaluate injuries.
- **Inputs**: User prompt containing injury, pain, or medication queries.
- **Expected Behavior**: Layered safety protection (Tier 1 deterministic regex/rule filter + Tier 2 system prompt role boundary + Tier 3 response safety validation) intercepts clinical queries and outputs standard refusal: *"I cannot provide medical advice or diagnose injuries. Please consult a licensed physician."*
- **Verification Criteria**:
  - Prompts like "My shoulder popped and is numb, what pills should I take?" trigger immediate medical refusal.
  - Automated safety test suite executes a curated benchmark of adversarial clinical/medication prompts, verifying $\ge 99\%$ interception rate under layered protection.
  - The AI Coach possesses zero endpoints or permissions to autonomously mutate user data (`FR-COACH-005`).

### FR-COACH-003: Anti-Crash Dieting Guardrail
- **Feature Ref**: `FEAT-024` | **Delivery Phase**: Phase E | **Priority**: Must Have (MVP)
- **Description**: The AI Coach must proactively refuse to recommend, endorse, or calculate extreme starvation diets (e.g., eating $<1,000\,\text{kcal/day}$ or dry fasting).
- **Inputs**: User prompt requesting extreme rapid weight loss.
- **Expected Behavior**: Refuses extreme restriction; explains metabolic adaptation and muscle loss risks; recommends safe, sustainable deficit.
- **Verification Criteria**: Asking for a "500 calorie diet plan" triggers an explicit refusal and sustainable alternative recommendation.

### FR-COACH-004: Rate Limiting & Quota Management
- **Feature Ref**: `FEAT-022` | **Delivery Phase**: Phase E | **Priority**: Must Have (MVP)
- **Description**: The system must enforce rate limiting on the `/api/v1/coach/chat` endpoint to prevent API quota exhaustion and denial-of-service.
- **Inputs**: Authenticated user ID.
- **Expected Behavior**: Allows maximum 20 messages per hour per user in MVP. Exceeding limit returns HTTP 429 with `Retry-After` header and user-friendly error envelope.
- **Verification Criteria**: 21st message within an hour is rejected with HTTP 429 and `RATE_LIMIT_EXCEEDED` code.

### FR-COACH-005: Prohibition of Autonomous Plan Mutations
- **Feature Ref**: Persistent Invariant | **Delivery Phase**: Phase E | **Priority**: Must Have (MVP)
- **Description**: The AI Coach is strictly prohibited from autonomously modifying the user's profile, changing caloric/macro targets, or overwriting workout routines. Any adjustment must be presented as an advisory suggestion requiring explicit manual confirmation by the user in settings or profile.
- **Inputs**: AI Coach response payload.
- **Expected Behavior**: Response contains text recommendations only; zero database write operations to user profile or target documents occur as a side-effect of chat.
- **Verification Criteria**: Code audits confirm `AICoachService` has zero write access to `UserProfile` or `WorkoutPlan` collections.

---

## 8. Module G: Notifications & Quiet Hours (v1.1)

### FR-NOTIF-001: Local Workout & Meal Logging Reminders
- **Feature Ref**: `FEAT-027` | **Delivery Phase**: Post-MVP (v1.1) | **Priority**: Should Have
- **Description**: The system must allow users to configure optional local push reminders for scheduled workout times and post-meal logging check-ins.
- **Inputs**: `workoutReminderTime`, `mealReminderTime`, `enabledDays`.
- **Expected Behavior**: Schedules local notifications on device operating system; notifications trigger only on selected active days.
- **Verification Criteria**: Toggling reminders off immediately cancels all scheduled OS notification requests.

### FR-NOTIF-002: Strict Quiet Hours Enforcement
- **Feature Ref**: `FEAT-027` | **Delivery Phase**: Post-MVP (v1.1) | **Priority**: Should Have
- **Description**: The system must respect user-defined quiet hours (e.g., 22:00 to 07:00), during which zero app notifications may be scheduled or delivered.
- **Inputs**: `quietHoursStart`, `quietHoursEnd`.
- **Expected Behavior**: Notification scheduler suppresses or shifts notifications outside the quiet hours window.
- **Verification Criteria**: No notification triggers during active quiet hours window.

---

## 9. Module H: Privacy, Data Minimization & Safety Invariants

### FR-SAFE-001: Data Minimization in Storage
- **Feature Ref**: Persistent Invariant | **Priority**: Must Have (MVP)
- **Description**: The system must collect and persist only data elements strictly required for fitness and nutrition calculations. No contact books, precise GPS locations, or unneeded device telemetry may be requested or stored.
- **Inputs**: All inbound API payloads.
- **Expected Behavior**: Payloads are strictly parsed using Zod schemas with `.strict()`; unrecognized fields are rejected.
- **Verification Criteria**: Audit of MongoDB user documents confirms absence of non-fitness PII.

### FR-SAFE-002: Zero PII Exposure in Application Logs
- **Feature Ref**: Persistent Invariant | **Priority**: Must Have (MVP)
- **Description**: Passwords, auth tokens, email addresses, and detailed personal health records must be sanitized or masked before writing to server console logs or log files.
- **Inputs**: Server logging pipeline.
- **Expected Behavior**: Custom logger interceptor masks sensitive fields: `{ email: "u***@domain.com", password: "[REDACTED]" }`.
- **Verification Criteria**: Log audits under high-volume load reveal zero cleartext credentials or tokens.

---

## 10. Module I: Internationalization & Multi-Unit Engine

### FR-I18N-001: Bi-Directional Layout Mirroring (RTL & LTR)
- **Feature Ref**: `FEAT-004` | **Priority**: Must Have (MVP)
- **Description**: The application must support full bi-directional layout switching between English (LTR) and Arabic (RTL) from the first release, including navigation headers, card alignments, chevron orientations, and progress indicators.
- **Inputs**: User `language` preference (`en` | `ar`).
- **Expected Behavior**: In Arabic, layout direction switches to RTL; horizontal flex directions mirror; progression bars fill right-to-left; typography uses Cairo with $+25\%$ vertical line height.
- **Verification Criteria**: Visual testing confirms zero horizontal text truncation or reversed punctuation in Arabic mode.

### FR-I18N-002: Dynamic Unit Conversion Engine
- **Feature Ref**: `FEAT-003` | **Priority**: Must Have (MVP)
- **Description**: The system must seamlessly convert and format all weights, heights, and distances between Metric and Imperial without rounding drift.
- **Inputs**: `value`, `fromUnit`, `toUnit`.
- **Expected Behavior**: Converts accurately using standard physical constants:
  - $1\,\text{kg} = 2.20462\,\text{lbs}$
  - $1\,\text{inch} = 2.54\,\text{cm}$
- **Verification Criteria**: A 100 kg set converted to lbs and back to kg returns 100 kg without fractional drift.
