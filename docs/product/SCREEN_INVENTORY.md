# FitMate AI — Screen Inventory & State Specifications

**Document Version:** 2.0.0  
**Phase:** 2 — Product Discovery and Planning (Revised & Approved)  
**Status:** Approved Product Decisions Incorporated  
**Author:** Mobile UI/UX Agent Skill  

---

## 1. Screen Architecture & Navigation Hierarchy

FitMate AI follows a clean, mobile-first navigation architecture utilizing **Expo Router** with strict modular separation:
- **Root Layer**: Dynamic splash router (`SCR-000`) evaluating auth state and onboarding completion.
- **Auth & Onboarding Stack (`app/(auth)/` & `app/(onboarding)/`)**: Modal/card flow for unauthenticated users:
  - **Step 1 (Screen 1)**: Welcome & Locale/Units Selection (`SCR-001`).
  - **Step 2 (Screen 2)**: Goal Selection (`SCR-005`).
  - **Step 3 (Screen 3)**: Body Metrics & Activity Profile (`SCR-006`).
  - **Step 4 (Screen 4)**: Health Consent & Non-Medical Disclaimer (`SCR-007A`).
  - **Step 5 (Screen 5)**: Instant Personalized Plan Reveal (`SCR-007B`).
  - **Registration Gate (Screen 6)**: Mandatory Account Creation / Login (`SCR-004` / `SCR-002`) required before accessing the main application.
- **Main App Bottom Tab Navigator (`app/(tabs)/`)**: Gated strictly behind successful authentication:
  - Tab 1: **Today / Dashboard** (`SCR-008`)
  - Tab 2: **Nutrition** (`SCR-009`)
  - Tab 3: **Workouts** (`SCR-014`)
  - Tab 4: **AI Coach** (`SCR-023`)
  - Tab 5: **Progress** (`SCR-020`)
- **Fullscreen Modal Sessions (`app/workout/`)**: Active workout execution (`SCR-017`) and post-session summary (`SCR-019`).
- **Secondary Stacks**: Food Search & Portion modal, Exercise Details modal, Settings modal.

---

## 2. Master Screen Directory

| Screen ID | Screen Name | Route Path | Navigation Type | Associated Journey |
| :--- | :--- | :--- | :--- | :--- |
| **SCR-000** | Splash Screen | `/` | Transient Root | Initial App Launch |
| **SCR-001** | Step 1: Welcome & Locale/Units | `/welcome` | Stack Screen | `UJ-001` |
| **SCR-002** | Login (Existing User) | `/login` | Stack Screen | `UJ-002` |
| **SCR-003** | Forgot Password | `/forgot-password` | Stack Screen | `UJ-002` |
| **SCR-004** | Registration Gate: Account Creation | `/register` | Stack Screen (Gate) | `UJ-001` |
| **SCR-005** | Step 2: Goal Selection | `/onboarding/goal` | Stack Screen | `UJ-001`, `UJ-003` |
| **SCR-006** | Step 3: Body Metrics & Activity Profile | `/onboarding/metrics` | Stack Screen | `UJ-001` |
| **SCR-007A**| Step 4: Health Consent & Disclaimers | `/onboarding/consent` | Stack Screen | `UJ-001` |
| **SCR-007B**| Step 5: Instant Personalized Plan Reveal | `/onboarding/reveal` | Stack Screen | `UJ-001` |
| **SCR-008** | Today / Main Dashboard | `/(tabs)/index` | Bottom Tab 1 | All Journeys |
| **SCR-009** | Daily Nutrition Diary | `/(tabs)/nutrition` | Bottom Tab 2 | `UJ-004`, `UJ-005` |
| **SCR-010** | Local Food Library Search | `/nutrition/search` | Modal Stack | `UJ-005` |
| **SCR-011** | Food Details & Portion Selector | `/nutrition/food/[id]`| Modal Stack | `UJ-005` |
| **SCR-012** | Quick-Add Meal Modal | `/nutrition/quick-add`| Bottom Sheet | `UJ-004` (MVP) |
| **SCR-013** | Custom Food Creator | `/nutrition/custom` | Modal Stack | Deferred to v1.1 (`DEC-010`) |
| **SCR-014** | Workout Plans & Routines | `/(tabs)/workouts` | Bottom Tab 3 | `UJ-006` |
| **SCR-015** | Curated Exercise Catalogue | `/workouts/exercises` | Stack Screen | `UJ-006` |
| **SCR-016** | Exercise Details & Instructions | `/workouts/exercises/[id]`| Modal Stack | `UJ-006` |
| **SCR-017** | Active Workout Execution Logger | `/workout/active` | Fullscreen Modal| `UJ-006`, `UJ-010` |
| **SCR-018** | In-App Rest Timer | `/workout/timer` | Floating Dock | `UJ-006` |
| **SCR-019** | Workout Summary & Volume Report | `/workout/summary` | Fullscreen Modal| `UJ-006` |
| **SCR-020** | Progress & Analytics Dashboard | `/(tabs)/progress` | Bottom Tab 5 | `UJ-007` |
| **SCR-021** | User Profile & Goal Management | `/profile` | Stack Screen | `UJ-003`, `UJ-009` |
| **SCR-022** | Settings & Preferences | `/settings` | Stack Screen | `UJ-009` |
| **SCR-023** | AI Coach Chat Companion (Limited Scope)| `/(tabs)/coach` | Bottom Tab 4 | `UJ-008` |
| **SCR-024** | Notification Settings (v1.1) | `/settings/notifications`| Stack Screen | `UJ-009` |
| **SCR-025** | Camera & Vision Consent Modal (Post-MVP)| `/camera/consent` | Modal Sheet | Post-MVP Vision|

---

## 3. Comprehensive Screen Specifications

### SCR-001: Step 1 — Welcome & Locale Initializer
- **Purpose**: Welcomes the user, captures language (English/Arabic) and unit (Metric/Imperial) preferences, and initiates onboarding. Direct link for returning users to log in directly.
- **Main Content**: App logo, athletic hero illustration, tagline, language toggle pills (`[English]`, `[العربية]`), unit toggle pills (`[Metric]`, `[Imperial]`).
- **Main Actions / CTAs**: Primary button: *"Get Started"* ($\ge 52\,\text{dp}$); secondary text link: *"I already have an account"*.
- **Data Requirements**: Stored local app settings (device language and locale detection).
- **Navigation**:
  - Entry: Initial cold launch of the app.
  - Exit: Tapping "Get Started" $\rightarrow$ `SCR-005` (Step 2: Goal Selection); tapping "I already have an account" $\rightarrow$ `SCR-002` (Login).
- **State Matrix**:
  - *Loading*: Blank dark canvas with logo fade-in.
  - *Success / Ready*: Interactive toggles populated with detected defaults.
  - *Error*: Fallback to English and Metric if locale detection fails.
- **Arabic RTL Considerations**: Tapping `العربية` instantly mirrors screen layout; toggles flip positions; button label updates to *"ابدأ الآن"*.
- **Accessibility**: Toggles carry `accessibilityRole="radio"`; minimum touch targets $\ge 48\,\text{dp}$.

---

### SCR-002: Login (Existing User)
- **Purpose**: Authenticates existing registered users via email/password or third-party OAuth, bypassing onboarding completely.
- **Main Content**: Header *"Welcome Back"*, email field, password field with visibility toggle, *"Forgot Password?"* link, social OAuth buttons (Apple, Google).
- **Main Actions / CTAs**: Primary button: *"Log In"*; Social buttons: *"Continue with Apple"*, *"Continue with Google"*.
- **Data Requirements**: User credentials payload (`email`, `password`).
- **Navigation**:
  - Entry: From `SCR-001` ("I already have an account") or sign-out event.
  - Exit: Successful login $\rightarrow$ `SCR-008` (Today Dashboard); "Forgot Password" $\rightarrow$ `SCR-003`.
- **State Matrix**:
  - *Loading*: Button transforms to spinner; inputs disabled.
  - *Error*: Red banner: *"Invalid email or password"*; gentle error haptic.
  - *Success*: Token stored in `expo-secure-store`; animated transition to Dashboard.
- **Arabic RTL Considerations**: Form labels and placeholders right-aligned; password visibility icon positioned on left side in RTL.
- **Accessibility**: Screen reader identifies invalid credentials; password field marked `secureTextEntry`.

---

### SCR-003: Forgot Password
- **Purpose**: Allows users to request a password reset email.
- **Main Content**: Instructions, email address input field, back navigation button.
- **Main Actions / CTAs**: Primary button: *"Send Reset Link"*.
- **Data Requirements**: User email address.
- **Navigation**: Entry from `SCR-002`; exit back to `SCR-002` on success.
- **State Matrix**:
  - *Loading*: Loading indicator on button.
  - *Success*: Banner *"Check your email for reset instructions"* with "Back to Login" CTA.
  - *Error*: Inline error if email format is invalid.
- **Arabic RTL Considerations**: Back navigation chevron points right (`chevron-right`); text right-aligned.
- **Accessibility**: Explicit confirmation message announced to screen reader on submission.

---

### SCR-004: Registration Gate — Account Creation
- **Purpose**: Mandatory authentication gate connecting the user's configured onboarding plan to a permanent user account. Entry to the main dashboard is strictly gated behind this screen.
- **Main Content**: Header *"Save Your Plan & Create Account"*, summary pill of configured goal, email field, password field with security criteria checklist, OAuth buttons (Apple, Google), privacy policy link.
- **Main Actions / CTAs**: Primary button: *"Create Account"*; Social 1-tap buttons; text link: *"Already have an account? Log In"*.
- **Data Requirements**: User credentials payload + transient in-memory onboarding profile (`goal`, `sex`, `birthDate`, `heightCm`, `weightKg`, `activityMultiplier`, `trainingExperience`, `language`, `unitSystem`, `hasAcceptedConsent`).
- **Registration & Storage Architecture**:
  - The client dispatches a public unauthenticated request (`POST /api/v1/auth/register`) containing credentials and onboarding metrics (no pre-existing bearer token required).
  - The backend atomically creates the user document and initializes profile metrics in MongoDB, returning an access JWT and refresh token.
  - Upon token receipt, tokens are written to hardware-backed storage (`expo-secure-store`) and the client purges all transient in-memory onboarding state.
  - If the app is closed, killed, or onboarding cancelled prior to this screen, in-memory state is discarded immediately by the OS.
  - Under no circumstances is pre-registration data written to local disk, SQLite, unencrypted `AsyncStorage`, or persistent guest accounts.
- **Navigation**: Entry from `SCR-007B` (Step 5: Plan Reveal); exit to `SCR-008` (Today Dashboard).
- **Policy**: No unauthenticated Guest Mode is permitted.
- **State Matrix**:
  - *Loading*: Full-page subtle blur with spinner.
  - *Error*: Conflict error: *"An account with this email already exists"*.
  - *Success*: Account created, JWT tokens issued, pre-registration state committed to user document, redirect to Dashboard.
- **Arabic RTL Considerations**: Password strength checklist indicators aligned right; labels right-aligned.
- **Accessibility**: Password strength rules dynamically update accessibility labels as criteria are met.

---

### SCR-005: Step 2 — Goal Selection
- **Purpose**: Lets user select their primary fitness goal from 6 clear archetypes.
- **Main Content**: Progress indicator (Step 2 of 5), title *"What is your primary fitness goal?"*, 6 interactive cards: Fat Loss, Muscle Gain, Body Recomposition, Weight Maintenance, General Fitness, Undecided.
- **Main Actions / CTAs**: Primary button: *"Continue"* (enabled when 1 card is selected).
- **Data Requirements**: Selected goal string (`fat_loss`, `muscle_gain`, `recomposition`, `maintenance`, `general_fitness`, `undecided`).
- **Navigation**: Entry from `SCR-001` or Profile edit flow (`SCR-021`); exit to `SCR-006` (Step 3: Body Metrics).
- **State Matrix**:
  - *Empty / Unselected*: "Continue" button disabled.
  - *Selected*: Selected card highlighted with border accent; CTA enabled.
- **Arabic RTL Considerations**: Progress bar fills right-to-left; card icons positioned on right side of cards.
- **Accessibility**: Cards marked `accessibilityRole="radio"`; selection state announced.

---

### SCR-006: Step 3 — Body Metrics & Activity Profile
- **Purpose**: Collects age, biological sex (with "Prefer not to say" option), height, weight, and activity level.
- **Main Content**: Progress indicator (Step 3 of 5), Sex segmented pills (`[Male]`, `[Female]`, `[Prefer not to say]`), Age stepper, Height input (dynamic `cm`/`in` label), Weight input (`kg`/`lbs` label), Activity level single-choice card group.
- **Main Actions / CTAs**: Primary button: *"Continue"*.
- **Data Requirements**: Numeric body measurements and activity multiplier.
- **Navigation**: Entry from `SCR-005`; exit to `SCR-007A` (Step 4: Consent & Disclaimers).
- **State Matrix**:
  - *Validation Error*: Red text below invalid field (e.g., *"Height must be between 100 and 250 cm"*); CTA locked.
  - *Valid*: All fields satisfy Zod schema; CTA enabled.
- **Arabic RTL Considerations**: Numeric input accessory bar ("Next" / "Done") aligns logically for RTL; unit badges positioned appropriately.
- **Accessibility**: Keyboard avoiding view ensures inputs remain visible above the numeric keypad.

---

### SCR-007A: Step 4 — Health Consent & Disclaimers
- **Purpose**: Obtains explicit health consent and presents standard medical disclaimers before calculating personal metrics.
- **Main Content**:
  - Progress indicator (Step 4 of 5).
  - Medical disclaimer card with prominent warning badge.
  - Explanation: FitMate AI is an informational wellness companion, not a doctor or clinical diagnostic system.
  - Data minimization disclosure: Data is stored securely and never sold.
  - Consent checkbox: *"I understand calculations are estimates and consent to fitness data processing"*.
- **Main Actions / CTAs**: Primary button: *"Continue to Plan Reveal"* (disabled until checkbox is toggled).
- **Data Requirements**: User consent boolean flag.
- **Navigation**: Entry from `SCR-006`; exit to `SCR-007B` (Step 5: Plan Reveal).
- **State Matrix**:
  - *Unchecked*: CTA disabled.
  - *Checked*: CTA enabled with primary accent.
- **Arabic RTL Considerations**: Checkbox and disclaimer text aligned right with Cairo typography.
- **Accessibility**: Screen reader reads disclaimer before checkbox; status of consent explicitly voiced.

---

### SCR-007B: Step 5 — Instant Personalized Plan Reveal
- **Purpose**: Calculates and reveals the user's estimated daily baseline (Calories, Macros, Workout frequency) before registration, delivering immediate value.
- **Main Content**:
  - Progress indicator (Step 5 of 5).
  - 1.2s calculation pulse skeleton $\rightarrow$ Revealed Plan:
    - Estimated Daily Calories Card with visible badge: `Estimated / قيمة تقريبية`.
    - Macro distribution rings: Protein (Coral Red), Carbs (Amber Yellow), Fat (Emerald Green).
    - Recommended weekly workout cadence.
    - AI Coach greeting introducing itself.
  - Notice: *"Create your account on the next step to save this plan permanently."*
- **Main Actions / CTAs**: Primary button: *"Save My Plan & Create Account"* ($\ge 52\,\text{dp}$).
- **Data Requirements**: Computed BMR, TDEE, macro split, and workout frequency based on Steps 2 and 3.
- **Navigation**: Entry from `SCR-007A`; exit to `SCR-004` (Registration Gate).
- **State Matrix**:
  - *Calculating*: 1.2s pulsing skeleton animation.
  - *Revealed*: Full calculated plan visible; CTA enabled.
- **Arabic RTL Considerations**: Macro breakdown reads right-to-left; Cairo typography applied.
- **Accessibility**: Calculated baseline metrics announced clearly to screen reader.

---

### SCR-008: Today / Main Dashboard
- **Purpose**: Daily home base providing an overview of today's nutrition targets, today's planned workout, and quick action shortcuts. Gated strictly behind authentication.
- **Main Content**:
  - Date header with calendar strip.
  - **Nutrition Summary Card**: Calories consumed vs remaining with circular ring; mini macro bars; `isEstimated: true` badge.
  - **Today's Workout Card**: Planned routine title, estimated duration, completed sets indicator, *"Start Workout"* CTA button.
  - **Quick Action Bar**: `[+ Log Meal]`, `[+ Log Weight]`, `[Ask Coach]`.
- **Main Actions / CTAs**: *"Start Workout"* ($\ge 52\,\text{dp}$), *"Log Meal"*, *"Log Weight"*.
- **Data Requirements**: Current date's nutrition aggregate, active workout schedule, recent weight log.
- **Navigation**: Central hub; links to `SCR-009` (Nutrition), `SCR-017` (Active Workout), `SCR-020` (Progress), `SCR-023` (Coach).
- **State Matrix**:
  - *Loading*: Content-shaped skeleton loaders.
  - *Empty (Rest Day)*: Workout card shows: *"Rest & Recovery Day. Focus on hydration and sleep!"*.
  - *Populated*: Active metrics displayed.
  - *Error*: Non-blocking toast: *"Could not sync latest data. Pull to refresh"*.
- **Arabic RTL Considerations**: Date formatted according to Arabic locale; progress ring clockwise motion preserved; calendar scrolls naturally in RTL.
- **Accessibility**: Large touch targets; high contrast for outdoor/gym glanceability.

---

### SCR-009: Daily Nutrition Diary
- **Purpose**: Displays the breakdown of all meals logged for the selected date, with options to add foods.
- **Main Content**:
  - Date selector (Past / Today / Future).
  - Daily totals card: Calories, Protein, Carbs, Fat (Consumed / Remaining).
  - 4 Collapsible Meal Cards: **Breakfast**, **Lunch**, **Dinner**, **Snacks**.
  - Logged food item rows showing food name, portion, and subtotal calories/macros.
  - `isEstimated: true` educational badge.
- **Main Actions / CTAs**: `[+ Add Food]` and `[+ Quick Add]` buttons within each meal card.
- **Data Requirements**: Daily nutrition document containing array of meal items and totals.
- **Navigation**: Entry from Tab bar; exit to `SCR-010` (Food Search) or `SCR-012` (Quick Add).
- **State Matrix**:
  - *Empty Meal*: Display *"No food logged yet. Tap + to add breakfast"* with large tap target.
  - *Populated*: Lists items with swipe-to-delete action.
- **Arabic RTL Considerations**: Swipe-to-delete gesture initiates from left-to-right in RTL; meal totals right-aligned.
- **Accessibility**: Screen reader announces: *"Breakfast, 450 calories logged. 2 items."*.

---

### SCR-010: Local Food Library Search
- **Purpose**: Instant, local-first search across the curated dataset of ~150–200 common foods, including regional Egyptian/Middle Eastern staples alongside international staples. Zero external API dependency.
- **Main Content**: Search input bar with clear button, filter chips (`[All]`, `[Proteins]`, `[Carbs]`, `[Regional Staples]`, `[Fruits/Veg]`), list of matching foods with calories/protein per 100g.
- **Main Actions / CTAs**: Tap food item to configure portion; tap *"Can't find it? Quick Add"* at the bottom.
- **Data Requirements**: Local embedded food catalog (JSON/SQLite).
- **Navigation**: Entry from `SCR-009`; exit to `SCR-011` (Food Details) or `SCR-012` (Quick Add).
- **State Matrix**:
  - *Initial / Empty Search*: Shows recent searches and common staples (Foul, Chicken Breast, Rice, Eggs).
  - *Searching*: Instant substring search (<50ms).
  - *Zero Results*: Card: *"No foods match your search. Use Quick-Add for instant manual logging"* with direct CTA.
- **Arabic RTL Considerations**: Search bar magnifying glass icon on right; text inputs right-aligned; matches Arabic food names (e.g., "فول", "كشري", "دجاج").
- **Accessibility**: Search results count announced to screen reader upon query update.

---

### SCR-011: Food Details & Portion Selector
- **Purpose**: Configures portion size and serving unit for a selected food item before adding to diary.
- **Main Content**: Food title, regional verification badge, macro ring visualization, serving size selector (Grams, Ounces, Serving Unit like "1 Plate" or "1 Cup"), numeric portion input, calculated calorie/macro totals.
- **Main Actions / CTAs**: Primary button: *"Add to [Meal Name]"* (e.g., *"Add to Lunch"*).
- **Data Requirements**: Food item definition and nutrient multipliers.
- **Navigation**: Entry from `SCR-010`; exit back to `SCR-009` (Diary).
- **State Matrix**:
  - *Interactive*: Adjusting portion dynamically updates calories and macros in real-time.
- **Arabic RTL Considerations**: Serving size dropdown and portion input mirror layout.
- **Accessibility**: Dynamic numeric feedback announced when portion changes.

---

### SCR-012: Quick-Add Meal Modal
- **Purpose**: Rapid 5-second manual entry of calories and macros without selecting a specific food item.
- **Main Content**: Meal name field (optional), Calories field (required, numeric), Protein field (optional), Carbs field (optional), Fat field (optional).
- **Main Actions / CTAs**: Primary button: *"Save Meal"* ($\ge 48\,\text{dp}$).
- **Data Requirements**: Meal slot identifier (`breakfast` | `lunch` | `dinner` | `snack`).
- **Navigation**: Entry from `SCR-009` or `SCR-010`; modal dismisses back to `SCR-009`.
- **State Matrix**:
  - *Initial*: Focused on Calories field; numeric keypad open.
  - *Valid*: Calories $> 0$; CTA enabled.
- **Arabic RTL Considerations**: Numeric keypad accessory bar configured for RTL.
- **Accessibility**: Form labels explicitly tied to input fields with `accessibilityLabel`.

---

### SCR-013: Custom Food Creator (Deferred to v1.1 - DEC-010)
- **Purpose**: Allows users to create and save reusable custom recipes or personal food items to a permanent personal database. *(Note: Formally deferred to v1.1 under approved decision `DEC-010`. The approved MVP manual entry method is strictly Quick-Add `SCR-012`; zero `CustomFood` database collection or CRUD endpoints exist in the MVP architecture).*
- **Main Content**: Food name, Brand name (optional), Serving size, Serving unit, Calories per serving, Protein, Carbs, Fat.
- **Main Actions / CTAs**: Primary button: *"Save & Add to Diary"*.
- **Data Requirements**: Custom food schema payload.
- **Navigation**: Entry from `SCR-010`; exit to `SCR-009`.
- **State Matrix**:
  - *Validation*: Calories and serving size required; validation errors shown inline.
- **Arabic RTL Considerations**: Form layout mirrored.
- **Accessibility**: Error messages read by screen reader upon failed submission.

---

### SCR-014: Workout Plans & Routines
- **Purpose**: Displays pre-built workout routines aligned with user goal and level, and historical sessions.
- **Main Content**:
  - Active routine card (e.g., *"3-Day Full Body"*).
  - List of workout days with exercise previews.
  - Exercise Catalogue link.
  - Workout History link.
- **Main Actions / CTAs**: Primary button: *"Start Workout"* on the active routine card.
- **Data Requirements**: User routine definition and exercise references.
- **Navigation**: Entry from Tab bar; exit to `SCR-017` (Active Workout), `SCR-015` (Catalog), `SCR-020` (Progress & History).
- **State Matrix**:
  - *Empty State*: User has no active routine $\rightarrow$ prompts: *"Select a routine to begin"*.
- **Arabic RTL Considerations**: Exercise preview thumbnails and text flow right-to-left.
- **Accessibility**: Routine cards carry clear role labels.

---

### SCR-015: Curated Exercise Catalogue
- **Purpose**: Browse and search foundational exercises with filter controls. 100% offline-ready.
- **Main Content**: Search bar, muscle group filter chips (`[Chest]`, `[Back]`, `[Legs]`, `[Shoulders]`, `[Arms]`, `[Core]`), equipment filter chips (`[Barbell]`, `[Dumbbell]`, `[Machine]`, `[Bodyweight]`), exercise list with thumbnail illustrations.
- **Main Actions / CTAs**: Tap exercise item to view details.
- **Data Requirements**: Curated exercise library JSON (~100 exercises).
- **Navigation**: Entry from `SCR-014` or `SCR-017` (Add Exercise); exit to `SCR-016` (Exercise Details).
- **State Matrix**:
  - *Filtered*: Instant filtering from local cache.
- **Arabic RTL Considerations**: Thumbnails on right, exercise titles on right, chevrons pointing left.
- **Accessibility**: Exercise thumbnails include descriptive alt text.

---

### SCR-016: Exercise Details & Instructions
- **Purpose**: Step-by-step movement instructions, primary/secondary muscles involved, equipment setup, and common form mistakes.
- **Main Content**: High-contrast anatomical diagram/animation, primary muscle badges, step-by-step setup and execution bullet points in English and Arabic, safety tips.
- **Main Actions / CTAs**: Close modal button (`[X]`).
- **Data Requirements**: Exercise catalog item document.
- **Navigation**: Entry from `SCR-015` or `SCR-017`; modal dismisses to previous screen.
- **State Matrix**: Content populated immediately from local cache.
- **Arabic RTL Considerations**: Bullet points and numbered instructions formatted in Arabic.
- **Accessibility**: Step-by-step instructions read in logical sequence by screen reader.

---

### SCR-017: Active Workout Execution Logger
- **Purpose**: High-intensity, gym-optimized set logging interface during an ongoing workout. 100% local-first offline resilient.
- **Main Content**:
  - Header: Workout Title, elapsed timer, *"Finish Workout"* button.
  - Exercise Cards: Exercise title, historical notes (e.g., *"Last time: 80kg x 8"*), table of sets.
  - Set Rows: Set Number, Previous Weight/Reps, Weight Input, Reps Input, Circular Checkmark button ($\ge 48\times 48\,\text{dp}$).
  - `[+ Add Set]` button per exercise; `[+ Add Exercise]` button at bottom.
- **Main Actions / CTAs**: Tap checkmark to complete set; *"Finish Workout"* CTA in top corner.
- **Data Requirements**: Active workout session state in local storage.
- **Navigation**: Entry from `SCR-014` or `SCR-008`; exit to `SCR-019` (Workout Summary).
- **State Matrix**:
  - *In-Progress*: Device keep-awake active; inputs editable.
  - *Set Completed*: Checkmark turns solid green; haptic feedback; rest timer docks.
  - *Offline*: Non-intrusive status pill: *"Offline Mode (Saving locally)"*.
- **Arabic RTL Considerations**: Set table columns read: `[مكتمل]` | `[تكرار]` | `[وزن (كجم)]` | `[السابق]` | `[مجموعة]`.
- **Accessibility**: Touch targets strictly $\ge 48\,\text{dp}$; high-contrast text readable under harsh gym lighting.

---

### SCR-018: In-App Rest Timer
- **Purpose**: Floating docked countdown timer managing recovery periods between sets.
- **Main Content**: Circular or bar countdown, remaining time display (`01:30`), `[-15s]`, `[+15s]`, `[Skip]` controls.
- **Main Actions / CTAs**: `[Skip Timer]`, `[+30s]`.
- **Data Requirements**: Target rest duration seconds.
- **Navigation**: Docks at bottom of `SCR-017` upon set completion; auto-collapses at `00:00`.
- **State Matrix**:
  - *Running*: Ticking countdown.
  - *Completed*: Double vibration haptic + chime sound.
- **Arabic RTL Considerations**: Skip button and adjustment pills mirror position logically.
- **Accessibility**: VoiceOver/TalkBack announces remaining time at 30s and 10s intervals.

---

### SCR-019: Workout Summary & Volume Report
- **Purpose**: Celebrates session completion, displays volume analytics, and confirms permanent record save.
- **Main Content**: Congratulatory graphic, Workout name, Duration (e.g., 52 mins), Total Tonnage Lifted (e.g., 6,420 kg), Total Sets Completed, Personal Records achieved pill, Notes input field.
- **Main Actions / CTAs**: Primary button: *"Done & Return to Dashboard"*.
- **Data Requirements**: Completed workout session document.
- **Navigation**: Entry from `SCR-017`; exit to `SCR-008` (Today Dashboard).
- **State Matrix**:
  - *Success*: Confirms upload or local persistence; animated metrics counter.
- **Arabic RTL Considerations**: Metrics grid mirrored; Arabic congratulations copy (*"عمل رائع!"*).
- **Accessibility**: Summary metrics structured with accessibility headers.

---

### SCR-020: Progress & Analytics Dashboard
- **Purpose**: Visualizes longitudinal body weight trends, workout frequency heatmaps, and past session details.
- **Main Content**:
  - Time range selector: `[1W]`, `[1M]`, `[3M]`, `[1Y]`, `[ALL]`.
  - **Weight History Chart**:
    - **Real Data Points Only**: Only actual recorded weigh-ins appear as points.
    - **No Fabricated Interpolation**: Missing days are rendered as clean empty gaps.
    - **Smoothed 7-Day Moving Average Curve**: Displayed only when $\ge 3$ distinct real measurements exist within the window.
  - `[+ Log Weight]` quick button.
  - **Workout Consistency Heatmap**: Calendar view highlighting training days (tapping a highlighted day opens the read-only Historical Session Detail modal reviewing performed exercises, weights, sets, reps, and volume).
  - Total Monthly Volume bar chart.
- **Main Actions / CTAs**: `[Log Weight]`, time range pills, tap calendar date to inspect workout session details.
- **Data Requirements**: Historical weight logs and completed workout sessions.
- **Navigation**: Entry from Tab bar; exit to Weight log modal or Historical Session Detail modal.
- **State Matrix**:
  - *Empty (<3 logs)*: *"Log your weight 3 times to unlock your smoothed trendline"*.
  - *Populated*: Smooth interactive chart with touch scrub points.
- **Arabic RTL Considerations**: Time axis reads left-to-right (standard chronological convention for charts) while surrounding interface mirrors to RTL.
- **Accessibility**: Scrubbing chart announces exact date and weight value via accessibility live region.

---

### SCR-021: User Profile & Goal Management
- **Purpose**: Displays user account details, current goal, baseline measurements, and entry to settings.
- **Main Content**: User avatar/name, Active Goal card with *"Edit Goal"* button, Current weight/height/age summary, Settings gear icon.
- **Main Actions / CTAs**: *"Edit Goal"*, *"Update Measurements"*, *"Settings"*.
- **Data Requirements**: User profile document.
- **Navigation**: Entry from Tab bar; exit to `SCR-005` (Goal Reconfiguration) or `SCR-022` (Settings).
- **State Matrix**: Populated profile view.
- **Arabic RTL Considerations**: Avatar and profile details right-aligned.
- **Accessibility**: Clear accessibility labels on edit buttons.

---

### SCR-022: Settings & Preferences
- **Purpose**: Manages app-wide configurations, unit systems, languages, privacy, and account deletion.
- **Main Content**:
  - **Preferences**: Language (`English` / `العربية`), Unit System (`Metric` / `Imperial`).
  - **Notifications**: Reminders toggle link (`SCR-024` - v1.1).
  - **Privacy & Legal**: Health Consent Center, Terms of Service, Medical Disclaimer link.
  - **Danger Zone**: *"Delete Account"* (red button).
- **Main Actions / CTAs**: Language toggle, Unit toggle, *"Delete Account"*.
- **Data Requirements**: Local app preferences + user auth document.
- **Navigation**: Entry from `SCR-021`; exit back to Profile or Welcome screen (on deletion).
- **State Matrix**:
  - *Interactive*: Changing unit or language applies immediately.
  - *Deletion Dialog*: Double confirmation with password entry.
- **Arabic RTL Considerations**: Form controls, toggles, and chevrons mirrored.
- **Accessibility**: Destructive actions marked with `accessibilityRole="button"` and clear danger warning.

---

### SCR-023: AI Coach Chat Companion (Limited Scope)
- **Purpose**: Conversational text chat interface operating behind a provider-agnostic adapter, delivering general fitness/nutrition education and clarifying logged data within strict non-medical guardrails.
- **Main Content**:
  - Header: Coach avatar, Coach name ("FitMate AI Coach"), safety disclaimer banner (*"Informational fitness companion • Non-medical • Cannot alter your plans autonomously"*).
  - Quick-prompt suggestions bar (e.g., *"Explain Romanian Deadlift form"*, *"Suggest safe substitute for Leg Press"*).
  - Chat stream: Bubble history with user messages and coach messages.
  - Message input bar: Text input, Send button ($\ge 48\,\text{dp}$).
- **Main Actions / CTAs**: Send message; tap quick-prompt pill.
- **Data Requirements**: Chat message history + injected context payload (user goal, today's calories, recent workouts).
- **Navigation**: Entry from Tab bar.
- **State Matrix**:
  - *Empty History*: Welcome bubble introducing coach boundaries and non-medical status.
  - *Streaming*: Typing indicator with animated dots while receiving chunks.
  - *Error*: Red bubble: *"Could not reach coach. Tap to retry"*.
  - *Rate Limited*: Input bar disabled with timer: *"Hourly limit reached (20 messages). Available in 22 mins"*.
- **Arabic RTL Considerations**: User message bubbles align on left in RTL; coach bubbles align on right; input field text aligns right.
- **Accessibility**: New incoming messages announced by screen reader live region without interrupting ongoing typing.

---

### SCR-024: Notification Settings (Should Have - v1.1)
- **Purpose**: Configures optional, user-defined local push reminders for workouts and meal tracking.
- **Main Content**: Global notifications toggle, Workout reminders toggle + time picker, Meal logging check-in toggle + time picker, Quiet Hours start/end pickers.
- **Main Actions / CTAs**: Toggles and time pickers.
- **Data Requirements**: Notification settings object stored in local device storage.
- **Navigation**: Entry from `SCR-022` (Settings); exit back to Settings.
- **State Matrix**:
  - *Disabled*: Sub-settings grayed out when master toggle is off.
- **Arabic RTL Considerations**: Toggles and time selectors adhere to RTL layout.
- **Accessibility**: State of toggles clearly announced.

---

### SCR-025: Camera & Vision Consent Modal (Won't Have - Post-MVP v2.0)
- **Purpose**: Dedicated consent gate before activating device camera hardware for gym equipment recognition.
- **Main Content**: Camera illustration, explanation of vision usage (local frame processing, no private video storage), explicit permissions request, privacy policy link.
- **Main Actions / CTAs**: Primary button: *"Allow Camera Access"*; secondary: *"Not Now"*.
- **Data Requirements**: Device permission status.
- **Navigation**: Modal sheet triggered when tapping a future vision button in v2.0; dismisses back to caller.
- **Arabic RTL Considerations**: Mirrored layout and localized privacy copy.
- **Accessibility**: Full screen reader accessibility describing camera purpose.
