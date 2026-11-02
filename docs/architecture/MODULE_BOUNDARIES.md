# FitMate AI — Backend Module Boundaries & Interface Contracts

**Document Version:** 1.1.0  
**Phase:** 3.1 — System Architecture Design  
**Status:** PROPOSED (Awaiting Human Review & Approval)  
**Last Updated:** 2026-11-01  
**Change History:**  
- v1.0.0 (2026-11-01): Initial module boundaries and interface contracts specification.  
- v1.1.0 (2026-11-01): Reconciled token lifecycle, registration transaction ownership across 4 collections, post-commit network recovery, dual communication paths for body weight (sync commands + async events) with snapshot reliability and ARCH-006, failure-tolerant account deletion saga with consent pseudonymization, pure calculation contracts between Nutrition and Users, AI Coach memory buffering and chat history representation, and Screen ID consistency (SCR-020 Progress, SCR-021 Profile).  
**Author:** Antigravity Senior Software Architect  

---

## 1. Modular Monolith Architecture & Encapsulation Principles

To ensure maintainability, testability, and future extractability, the FitMate AI backend strictly adheres to **Modular Monolith** architectural principles:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                     MODULAR MONOLITH MODULE BOUNDARIES                      │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│   ┌─────────────────────────────────────────────────────────────────────┐   │
│   │                         API Gateway Router                          │   │
│   └──────┬────────────┬────────────┬────────────┬────────────┬──────────┘   │
│          │            │            │            │            │              │
│          ▼            ▼            ▼            ▼            ▼              │
│     ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐         │
│     │  Auth   │  │  Users  │  │Nutrition│  │Workouts │  │Progress │         │
│     │ Module  │  │ Module  │  │ Module  │  │ Module  │  │ Module  │         │
│     └────┬────┘  └────┬────┘  └────┬────┘  └────┬────┘  └────┬────┘         │
│          │            │            │            │            │              │
│          │            │       ┌────▼────────────┴────────────┘              │
│          │            │       │ Read-Only Snapshots                         │
│          │            ▼       ▼                                             │
│          │       ┌──────────────────┐                                       │
│          │       │   Coach Module   │ ──► [AICoachAdapter] ──► [LLM Vendor] │
│          │       └──────────────────┘     (Zero write permissions)          │
│          │                                                                  │
│          ▼ Direct Database Operations (Strict Single Ownership)             │
│   ┌─────────────────────────────────────────────────────────────────────┐   │
│   │                        MongoDB Database                             │   │
│   │   [Users]     [Profiles]    [Meals]      [Sessions]   [WeightLogs]  │   │
│   │   [Tokens]    [Consent]     [FoodLib]    [Exercises]  [Idempotency] │   │
│   └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Core Invariants of the Modular Monolith:
1. **Single Data Ownership**: Each database collection is owned exclusively by exactly one domain module. No module may directly query, insert, update, or delete records from a collection owned by another module via Mongoose models.
2. **Public Service Interfaces**: When Module A requires data or capabilities from Module B, it must call Module B's exposed public service method (e.g., `usersService.getUserProfile(userId)`).
3. **Zero Autonomous Mutations**: The `CoachModule` is granted **read-only** snapshot access to user profile, nutrition, and workout summaries. It has zero write operations to any persistent collection other than its own conversation logs (`FR-COACH-005`).
4. **Synchronous In-Process Communication**: Communication between modules within the Monolith occurs via direct, typed TypeScript service invocations within the same Node.js runtime process, avoiding network serialization overhead.

---

## 2. Domain Module Specifications

---

### 2.1 AuthModule

#### Module Responsibility
The `AuthModule` is responsible for account authentication, password hashing and verification, OAuth identity token validation (Apple and Google), access JWT and refresh token generation, session continuity, password reset workflows, and account deletion credentials teardown.

#### Data Owned (Collections)
- `users`: Core account identity documents (`_id`, `email`, `passwordHash`, `authProvider`, `isEmailVerified`, `tokenVersion`, `createdAt`, `updatedAt`).
- `refresh_tokens`: Revocable active session refresh tokens (`_id`, `userId`, `hashedToken`, `expiresAt`, `revokedAt`, `truncatedUserAgent`, `ipHash`). Metadata minimization enforces SHA-256 IP hashing (`ipHash`) and truncated user agent without plaintext PII (NFR-SEC-006).
- `password_reset_tokens`: Cryptographic single-use reset tokens with 1-hour expiration.

#### Operations Exposed (Public Service Interface)
```typescript
export interface IAuthService {
  // Public unauthenticated registration
  register(dto: RegisterRequestDto): Promise<AuthSessionResponseDto>;
  
  // Credentials login
  login(dto: LoginRequestDto): Promise<AuthSessionResponseDto>;
  
  // Third-party OAuth authentication
  authenticateOAuth(dto: OAuthLoginRequestDto): Promise<AuthSessionResponseDto>;
  
  // Silent token refresh
  refreshAccessToken(refreshToken: string): Promise<TokenRefreshResponseDto>;
  
  // Session revocation (single device logout)
  logout(userId: string, refreshToken: string): Promise<void>;
  
  // Global session revocation (revokes all refresh tokens and increments tokenVersion)
  revokeAllSessions(userId: string): Promise<void>;
  
  // Token verification helper (used by auth middleware)
  verifyAccessToken(token: string): Promise<AuthenticatedUserPayload>;
  
  // Coordinated account data deletion (purges credentials from users, refresh_tokens, and password_reset_tokens)
  deleteAccountData(userId: string): Promise<void>;
}
```

#### HTTP Endpoints Exposed
- `POST /api/v1/auth/register` (Public, unauthenticated; wraps user creation, profile metrics, consent in atomic transaction)
- `POST /api/v1/auth/login` (Public, rate-limited: 5 attempts / 15 min)
- `POST /api/v1/auth/oauth` (Public, Apple/Google token verification)
- `POST /api/v1/auth/refresh` (Public, validates refresh token, issues new access token)
- `POST /api/v1/auth/logout` (Protected, revokes active refresh token)

#### What It Must NOT Access Directly
- Must NOT directly read or write `user_profiles`, `nutrition_logs`, `workout_sessions`, or `body_weight_entries`.
- Must NOT embed fitness metrics or nutrition targets into the `users` collection or JWT payload.

#### Modules It Can Communicate With
- `UsersModule`: During atomic registration, invokes `usersService.createInitialProfile(session, userId, onboardingDto)` and `usersService.recordConsent(session, userId, consentDto)` inside the MongoDB transaction.
- **Communication Type**: Synchronous in-process method call passing the active `ClientSession` transaction handle.

#### Relevant Business Rules
- Password complexity: minimum 8 characters, 1 uppercase, 1 digit, 1 special character (`FR-AUTH-001`).
- Hashing: Argon2id (memory: 64MB, time: 3, parallelism: 4) or bcrypt $\ge 12$ rounds (`NFR-SEC-003`).
- JWT Access Token lifespan: strictly 15 minutes.
- Refresh Token lifespan: 30 days, revoked upon password reset or explicit logout.

#### Related Product Requirements
`FR-AUTH-001`, `FR-AUTH-002`, `FR-AUTH-003`, `NFR-SEC-001`, `NFR-SEC-003`, `DEC-004`.

---

### 2.2 UsersModule

#### Module Responsibility
The `UsersModule` manages the user's personal profile, physical metrics (biological sex, birth date, height, weight), target fitness goals, experience level, language and unit preferences, and legal consent registry. It provides authorized profile updates and account deletion routines.

#### Data Owned (Collections)
- `user_profiles`: Physical traits, preferences, and operational targets (`_id`, `userId`, `goal`, `biologicalSex`, `birthDate`, `heightCm`, `weightKg` [cached current weight snapshot], `weightUpdatedAt` [timestamp of snapshot update], `activityMultiplier`, `trainingExperience`, `preferredLanguage`, `unitSystem`, `dailyCalorieTarget`, `proteinTargetGrams`, `carbsTargetGrams`, `fatTargetGrams`, `schemaVersion`).
  - *Data Ownership Clarification*: `user_profiles.weightKg` is an **operational cached snapshot** of the latest recorded weight, maintained specifically for immediate profile display (`SCR-021`) and low-latency Mifflin-St Jeor target recalculations. The authoritative historical ledger of all weigh-ins is strictly owned by `ProgressModule` (`SCR-020`).
- `consent_records`: Legal consent audit records (`_id`, `userId`, `consentType`, `hasAccepted`, `disclaimerVersion`, `acceptedAt`, `ipAddress`). Subject to statutory audit compliance and pseudonymization upon account deletion.

#### Operations Exposed (Public Service Interface)
```typescript
export interface IUsersService {
  // Profile retrieval (including current weight snapshot)
  getProfile(userId: string): Promise<UserProfileDto>;
  
  // Read-only user goal, metrics & physical profile snapshot (used by Coach, Nutrition, Workouts)
  getProfileSnapshot(userId: string): Promise<UserGoalContextDto>;
  
  // Transactional creation (invoked by AuthModule during registration)
  createInitialProfile(session: ClientSession, userId: string, dto: OnboardingProfileDto): Promise<UserProfileDto>;
  
  // Transactional consent logging
  recordConsent(session: ClientSession, userId: string, dto: ConsentDto): Promise<void>;
  
  // Profile updates (goals, metrics, weight edits delegate to ProgressModule)
  updateProfile(userId: string, dto: UpdateProfileDto): Promise<UserProfileDto>;
  
  // Failure recovery & reconciliation: rebuilds current weight snapshot from ProgressModule authoritative ledger
  rebuildWeightSnapshotFromLedger(userId: string): Promise<void>;
  
  // Settings updates (language, units)
  updatePreferences(userId: string, dto: UpdatePreferencesDto): Promise<UserPreferencesDto>;
  
  // Coordinated account deletion orchestrator (coordinates multi-stage saga across modules)
  deleteAccount(userId: string): Promise<void>;
  
  // Module-specific data purge (purges user_profiles and anonymizes consent_records)
  purgeUserData(userId: string): Promise<void>;
}
```

#### HTTP Endpoints Exposed
- `GET /api/v1/users/profile` (Protected, returns authenticated user profile & preferences)
- `PATCH /api/v1/users/profile` (Protected, updates goals, metrics, or targets)
- `PATCH /api/v1/users/preferences` (Protected, toggles language `ar`/`en` or unit system `metric`/`imperial`)
- `DELETE /api/v1/users/account` (Protected, cascades deletion of all user records)

#### What It Must NOT Access Directly
- Must NOT directly read or write `nutrition_logs`, `workout_sessions`, or `coach_conversations`.
- Must NOT manage authentication credentials or password hashes.

#### Modules It Can Communicate With
- `NutritionModule`: When a user updates their body metrics or target goal, invokes the pure calculation contract `nutritionService.calculateEnergyTargets(params)` to compute updated Mifflin-St Jeor targets, which `UsersModule` persists in `user_profiles`.
- `ProgressModule`: When a user edits their weight in User Profile & Goal Management (`SCR-021`), synchronously invokes `progressService.logWeight(...)` to append to the authoritative ledger. For failure recovery, invokes `progressService.getLatestWeight(userId)` to rebuild the cached weight snapshot.
- All Modules: During account deletion (`DELETE /api/v1/users/account`), orchestrates a failure-tolerant saga via each module's `purgeUserData(userId)` method.
- **Communication Type**: Synchronous in-process calls.

#### Relevant Business Rules
- All heights persisted canonically in centimeters (`heightCm`), all weights in kilograms (`weightKg`) (`ADR-010`).
- Neutral baseline calculation applies when biological sex is omitted ($s = -78$) (`DEC-005`).
- User goal options strictly match: `fat_loss`, `muscle_gain`, `recomposition`, `maintenance`, `general_fitness`, `undecided`.

#### Related Product Requirements
`FR-ONBD-001`, `FR-ONBD-002`, `FR-ONBD-003`, `FR-ONBD-004`, `FR-SAFE-001`, `NFR-SEC-002`, `DEC-004`, `DEC-005`.

---

### 2.3 NutritionModule

#### Module Responsibility
The `NutritionModule` executes the Mifflin-St Jeor caloric and macronutrient estimation engine, maintains the daily meal diary across four standard slots (Breakfast, Lunch, Dinner, Snacks), provides instant search over the local curated Food Library, handles Quick-Add meal logging, and enforces estimation transparency badges (`isEstimated: true`).

*Pure Calculation Contract vs. Persistence Ownership*: `NutritionModule` provides a pure calculation contract `calculateEnergyTargets(metrics: MetabolicProfileInput): EnergyTargetsOutput`. This function executes deterministic Mifflin-St Jeor arithmetic without reading from or writing to any database collection, and without querying `UsersModule`. `UsersModule` calls this pure calculation function and persists the resulting targets into `user_profiles`. When `NutritionModule` needs user goals and targets (e.g. to display daily calorie/macro budget on `SCR-009` and `SCR-010`), it queries `usersService.getProfileSnapshot(userId)`.

#### Data Owned (Collections)
- `nutrition_logs`: Daily meal logs (`_id`, `userId`, `date` [YYYY-MM-DD], `slot` [`breakfast`|`lunch`|`dinner`|`snack`], `items` [array of food logs], `slotTotalCalories`, `slotTotalProtein`, `slotTotalCarbs`, `slotTotalFat`, `schemaVersion`).
- `food_library`: Curated baseline food catalog (`_id`, `nameEn`, `nameAr`, `category`, `servingSizeGrams`, `servingUnitNameEn`, `servingUnitNameAr`, `caloriesPer100g`, `proteinPer100g`, `carbsPer100g`, `fatPer100g`, `isVerified`).
- *Note*: As mandated by approved decision `DEC-010`, NO persistent `CustomFood` collection exists in the MVP architecture. Manual meal entries are stored directly in `nutrition_logs` via Quick Add.

#### Operations Exposed (Public Service Interface)
```typescript
export interface INutritionService {
  // Pure calculation utility (Mifflin-St Jeor) - calculates targets; caller (UsersModule) persists them
  calculateEnergyTargets(metrics: MetabolicProfileInput): EnergyTargetsOutput;
  
  // Daily diary operations
  getDailyDiary(userId: string, date: string): Promise<DailyNutritionDiaryDto>;
  
  // Quick-Add manual entry
  logQuickAddMeal(userId: string, dto: QuickAddMealDto): Promise<MealSlotEntryDto>;
  
  // Catalog food logging
  logFoodItem(userId: string, dto: LogFoodItemDto): Promise<MealSlotEntryDto>;
  
  // Meal entry removal
  deleteMealEntry(userId: string, logId: string, itemId: string): Promise<void>;
  
  // Read-only snapshot for AI Coach context assembly
  getTodayNutritionSnapshot(userId: string, date: string): Promise<NutritionContextDto>;
  
  // Read-only summary for Progress Dashboard or analytics
  getNutritionSummary(userId: string, date: string): Promise<NutritionSummarySnapshotDto>;
  
  // Coordinated account data deletion (purges user records from nutrition_logs)
  purgeUserData(userId: string): Promise<void>;
}
```

#### HTTP Endpoints Exposed
- `GET /api/v1/nutrition/diary?date=YYYY-MM-DD` (Protected, retrieves 4-slot diary & totals)
- `POST /api/v1/nutrition/meals/quick-add` (Protected, logs manual calorie/macro entry)
- `POST /api/v1/nutrition/meals/item` (Protected, logs scaled item from Food Library)
- `DELETE /api/v1/nutrition/meals/:logId/items/:itemId` (Protected, removes entry)
- `GET /api/v1/nutrition/foods/search?q=query` (Protected/Cached, searches Local Food Library)

#### What It Must NOT Access Directly
- Must NOT directly read or write `user_profiles`, `workout_sessions`, or `coach_conversations`.
- Must NOT modify user fitness goals or body weight metrics directly.

#### Modules It Can Communicate With
- `UsersModule`: Invokes `usersService.getProfileSnapshot(userId)` to obtain the user's active calorie and macronutrient targets and unit preferences for daily diary rendering (`SCR-009`, `SCR-010`).
- **Communication Type**: Synchronous in-process read-only method call. (Note: `calculateEnergyTargets` is a pure function that does not call `UsersModule`).

#### Relevant Business Rules
- Formula: Mifflin-St Jeor $\text{BMR} = 10W + 6.25H - 5A + s$ ($s = +5$ male, $-161$ female, $-78$ neutral). $\text{TDEE} = \text{BMR} \times \text{multiplier}$ (`FR-NUTR-001`).
- Every response must include `isEstimated: true` (`FR-NUTR-006`, Core Invariant 2).
- Conservative safety floor guidelines (~1,200 kcal female / ~1,500 kcal male) trigger advisory warnings if user targets fall below them (`DEC-005`).
- Four standard meal slots: `breakfast`, `lunch`, `dinner`, `snack` (`FR-NUTR-002`).

#### Related Product Requirements
`FR-NUTR-001` through `FR-NUTR-006`, `DEC-001`, `DEC-005`, `DEC-010`, `NFR-PERF-003`.

---

### 2.4 WorkoutsModule

#### Module Responsibility
The `WorkoutsModule` manages the offline-curated exercise catalog (~100 exercises), active workout session logging, set-by-set checkmark completion, volume and tonnage accumulation, personal record identification, and idempotent offline synchronization.

#### Data Owned (Collections)
- `workout_sessions`: Historical and completed workout sessions (`_id`, `userId`, `clientSessionUuid`, `name`, `startedAt`, `completedAt`, `durationSeconds`, `totalVolumeKg`, `totalSetsCompleted`, `exercises` [array of logged exercise sets], `schemaVersion`).
- `exercise_catalog`: Curated bundled exercises (`_id`, `nameEn`, `nameAr`, `targetMuscleGroup`, `secondaryMuscleGroups`, `equipment`, `movementPattern`, `instructionsEn`, `instructionsAr`, `isArchived`).
- `processed_idempotency_keys`: Idempotency tracking collection (`_id`, `idempotencyKey`, `userId`, `resourceId`, `statusCode`, `responseBody`, `createdAt` [with TTL index governed by ARCH-002 and constrained by TTL >= MaxSupportedOfflineQueueAge]).

#### Operations Exposed (Public Service Interface)
```typescript
export interface IWorkoutsService {
  // Exercise catalog search & filter
  getExercises(filters: ExerciseFilterDto): Promise<ExerciseDto[]>;
  
  // Session initialization / save
  saveWorkoutSession(userId: string, dto: SaveWorkoutSessionDto): Promise<WorkoutSessionDto>;
  
  // Idempotent background synchronization
  syncWorkoutMutations(userId: string, idempotencyKey: string, dto: SyncWorkoutPayloadDto): Promise<SyncResultDto>;
  
  // Historical session retrieval (used for review modal on SCR-020)
  getWorkoutSession(userId: string, sessionId: string): Promise<WorkoutSessionDto>;
  
  // Query completed session dates for calendar marker rendering (used by ProgressModule)
  getCompletedSessionDates(userId: string, month: number, year: number): Promise<string[]>;
  
  // Read-only recent workouts snapshot (used by CoachModule context assembly)
  getRecentWorkoutsSnapshot(userId: string, limit: number): Promise<WorkoutContextDto[]>;
  
  // Coordinated account data deletion (purges user sessions and idempotency records)
  purgeUserData(userId: string): Promise<void>;
}
```

#### HTTP Endpoints Exposed
- `GET /api/v1/workouts/exercises` (Protected/Cached, browses exercise catalog by muscle/equipment)
- `POST /api/v1/workouts/sessions` (Protected, saves completed workout session)
- `POST /api/v1/workouts/sync` (Protected, idempotent batch synchronization with `X-Idempotency-Key`)
- `GET /api/v1/workouts/sessions/:id` (Protected, retrieves completed session details)

#### What It Must NOT Access Directly
- Must NOT directly read or write `user_profiles`, `nutrition_logs`, or `body_weight_entries`.
- Must NOT access AI Coach conversation records.

#### Modules It Can Communicate With
- `ProgressModule`: Emits internal notification or allows `ProgressModule` to read workout dates for the workout history calendar.
- `UsersModule`: Reads user training experience level.
- **Communication Type**: Synchronous in-process calls.

#### Relevant Business Rules
- Workouts operate local-first: mobile client commits to local storage first, then synchronizes (`NFR-REL-001`, `FR-WORK-005`).
- Total volume calculation: $\sum (\text{weightKg} \times \text{reps})$ across completed sets (`isCompleted === true`). Unchecked sets are excluded from tonnage (`FR-WORK-006`).
- Idempotency: Re-submitting the same completed session payload with identical `idempotencyKey` returns cached success without duplicating records or metrics (`FR-WORK-005`).

#### Related Product Requirements
`FR-WORK-001` through `FR-WORK-006`, `DEC-002`, `NFR-REL-001`, `NFR-REL-002`.

---

### 2.5 ProgressModule

#### Module Responsibility
The `ProgressModule` handles body weight tracking, honest non-fabricated trendline visualization (rendering gaps for unlogged days, smoothed 7-day moving average), workout history calendar compilation, and historical workout session drill-downs.

#### Data Owned (Collections)
- `body_weight_entries`: Authoritative historical time-series ledger of recorded body weight (`_id`, `userId`, `date` [YYYY-MM-DD], `weightKg`, `note`, `createdAt`).
  - *Data Ownership Authority*: `ProgressModule` is the **sole authoritative owner** of `body_weight_entries`. It alone is permitted to create, update, and delete individual weight records.

#### Operations Exposed (Public Service Interface)
```typescript
export interface IProgressService {
  // Weight logging (authoritative historical entry creation; used by Progress screen SCR-020 and Users profile edits SCR-021)
  logWeight(userId: string, dto: LogWeightDto): Promise<BodyWeightEntryDto>;
  
  // Weight history & honest 7-day moving average calculation
  getWeightTrends(userId: string, startDate: string, endDate: string): Promise<WeightTrendsDto>;
  
  // Workout history calendar (aggregates dates from WorkoutsModule)
  getWorkoutCalendar(userId: string, month: number, year: number): Promise<WorkoutCalendarDto>;
  
  // Authoritative latest weigh-in retrieval (used by UsersModule for snapshot rebuild and failure recovery)
  getLatestWeight(userId: string): Promise<BodyWeightEntryDto | null>;
  
  // Coordinated account data deletion (purges user records from body_weight_entries)
  purgeUserData(userId: string): Promise<void>;
}
```

#### HTTP Endpoints Exposed
- `GET /api/v1/progress/weight` (Protected, retrieves weight history and moving average)
- `POST /api/v1/progress/weight` (Protected, logs today's weigh-in)
- `DELETE /api/v1/progress/weight/:id` (Protected, removes accidental weigh-in)
- `GET /api/v1/progress/calendar?month=MM&year=YYYY` (Protected, retrieves completed workout markers)

#### What It Must NOT Access Directly
- Must NOT query the `workout_sessions` collection directly via Mongoose. Must call `workoutsService.getCompletedSessionDates(userId, month, year)`.
- Must NOT directly write to `user_profiles`.

#### Modules It Can Communicate With
- `WorkoutsModule`: Invokes `workoutsService.getCompletedSessionDates(userId, month, year)` and `workoutsService.getWorkoutSession(userId, sessionId)` to populate active workout days and drill-down details on the calendar (`FR-PROG-002`).
- `Event Bus (In-Process Decoupled Notification)`: Emits an asynchronous in-process domain event `weight.recorded` (`{ userId, weightKg, recordedAt }`) upon successful logging. Zero synchronous service calls to `UsersModule` are made, completely eliminating circular synchronous coupling.
- **Communication Type**: Synchronous read-only service call to `WorkoutsModule`; asynchronous event emission to decoupled subscribers.

#### Relevant Business Rules
- Honest trend visualization: Missing days MUST render as clean gaps; never invent fake interpolated data points (`FR-PROG-001`).
- 7-Day Moving Average requires $\ge 3$ distinct real measurements within the 7-day window to calculate; otherwise remains unplotted (`FR-PROG-001`).
- All weights normalized to kilograms (`weightKg`) in storage (`ADR-010`).

#### Related Product Requirements
`FR-PROG-001`, `FR-PROG-002`, `SCR-020`, `DEC-008`.

---

### 2.6 CoachModule

#### Module Responsibility
The `CoachModule` orchestrates context-aware fitness and nutrition chat, enforces the three-layer safety guardrail pipeline (preliminary regex pattern filter, system prompt role boundary, post-generation safety check), rate limits chat traffic (20 msgs/hour), and integrates with external LLMs strictly via the provider-agnostic `AICoachAdapter`. It buffers the entire response in server memory before validation, releases references of rejected text for garbage collection without persisting hazardous output, and records safe refusal or provider-fallback messages in chat history.

#### Data Owned (Collections)
- `coach_conversations`: User chat sessions (`_id`, `userId`, `title`, `startedAt`, `lastMessageAt`, `schemaVersion`).
- `coach_messages`: Chat message history (`_id`, `conversationId`, `userId`, `sender` [`user`|`assistant`], `content`, `isRefusal`, `promptTokens`, `completionTokens`, `createdAt`).

#### Component Structure & Data Access Boundary
- Incoming requests to `POST /api/v1/coach/chat` are received by `CoachController`.
- The request passes sequentially through:
  1. *Layer 1*: Preliminary regex pattern filter (scans acute clinical keywords).
  2. *Context Assembly*: Queries read-only snapshots from `UsersModule`, `NutritionModule`, and `WorkoutsModule`.
  3. *Layer 2*: System role boundary prompt injection.
  4. *Adapter Dispatch*: `AICoachAdapter` generates the full response into a server-side memory buffer via external LLM.
  5. *Layer 3*: Post-generation safety validation scans the complete buffered assistant text for diagnostic or prescription statements before ANY content is sent to the client. If unsafe, the refusal envelope is substituted.
- The validated conversation and message records are persisted **strictly through `CoachRepository`**. Direct database access bypassing `CoachRepository` is prohibited.

#### Operations Exposed (Public Service Interface)
```typescript
export interface ICoachService {
  // Send message and get safe response (buffers full LLM response, runs Layer 3, returns validated payload)
  processUserMessage(userId: string, dto: SendCoachMessageDto): Promise<CoachMessageReplyDto>;
  
  // Conversation history retrieval
  getConversationHistory(userId: string, limit?: number): Promise<CoachMessageDto[]>;
  
  // Clear conversation history
  clearHistory(userId: string): Promise<void>;
  
  // Coordinated account data deletion (purges user conversations and messages)
  purgeUserData(userId: string): Promise<void>;
}
```

#### HTTP Endpoints Exposed
- `POST /api/v1/coach/chat` (Protected, rate-limited: 20 msgs/hr, dispatches through safety pipeline)
- `GET /api/v1/coach/history` (Protected, fetches paginated chat transcript)
- `DELETE /api/v1/coach/history` (Protected, clears conversation history)

#### What It Must NOT Access Directly
- Must NOT access Mongoose models of `users`, `user_profiles`, `nutrition_logs`, or `workout_sessions`.
- **STRICT PROHIBITION**: Has ZERO write operations to any external collection. Cannot mutate user goals, calorie targets, macro splits, or workout plans autonomously (`FR-COACH-005`).

#### Modules It Can Communicate With
- `UsersModule`: Calls `usersService.getProfileSnapshot(userId)` to inject active fitness goal, experience level, and preferred language into the prompt context.
- `NutritionModule`: Calls `nutritionService.getTodayNutritionSnapshot(userId, today)` to inject daily calorie and macro budget context.
- `WorkoutsModule`: Calls `workoutsService.getRecentWorkoutsSnapshot(userId, 3)` to inject the 3 most recent workouts for contextual understanding.
- **Communication Type**: Synchronous in-process read-only calls.

#### Relevant Business Rules
- Refuses all medical diagnoses, injury assessments, and clinical treatment queries (`FR-COACH-002`, Core Invariant 1).
- Proactively refuses extreme crash dieting ($< 1,000\,\text{kcal/day}$ or dry fasting) (`FR-COACH-003`).
- Rate limited to maximum 20 messages per hour per user (`FR-COACH-004`).
- All suggestions require manual user action; zero autonomous profile or workout plan updates (`FR-COACH-005`).

#### Related Product Requirements
`FR-COACH-001` through `FR-COACH-005`, `NFR-SEC-007`, `NFR-PERF-004`, `DEC-003`, `Q-001`.

---

---

## 3. Explicit Inter-Module Communication Contracts

To prevent architectural drift and eliminate tight coupling, the contracts between collaborating modules are formalized below:

### 3.1 AuthModule ◄► UsersModule Contract (Atomic Registration & Failure Recovery)
- **Invocation Context**: During user registration (`POST /api/v1/auth/register`).
- **Contract Type**: Synchronous in-process method call passing the active MongoDB `ClientSession` transaction handle.
- **Orchestration Ownership**:
  - `AuthModule` orchestrates the multi-document transaction across four collections (`users`, `user_profiles`, `consent_records`, `refresh_tokens`).
  - `AuthModule` generates the raw refresh token in runtime memory, hashes it with SHA-256, and stores only its hash in `refresh_tokens` within the transaction session.
  - `UsersModule` creates its records via:
    - `usersService.createInitialProfile(session: ClientSession, userId: string, dto: OnboardingProfileDto): Promise<UserProfileDto>`
    - `usersService.recordConsent(session: ClientSession, userId: string, dto: ConsentDto): Promise<void>`
  - `UsersModule` must NEVER commit or abort the transaction. `AuthModule` alone commits or aborts the session.
- **Isolation Invariant**:
  - `AuthModule` owns `users` and `refresh_tokens`. It possesses zero direct access to `user_profiles` or `consent_records`.
  - `UsersModule` owns `user_profiles` and `consent_records`. It possesses zero access to `users` or credentials.
  - If any write fails, `session.abortTransaction()` cleanly rolls back all writes across all four collections.
- **Post-Commit Network Failure & Idempotent Retry Strategy**:
  - If the transaction commits successfully on MongoDB but the network drops before the response reaches the client, the client lacks session tokens.
  - *Cryptographic Limitation*: Because the backend stored only a SHA-256 one-way hash, the raw refresh token **cannot be decrypted, reconstructed, or recovered**.
  - *Security Invariant*: An unauthenticated retry cannot issue fresh session tokens on an idempotency key alone without authenticating password credentials.
  - *Recovery Flow*: If the client re-submits registration, the backend catches the unique email constraint and returns `409 Conflict` (`EMAIL_ALREADY_EXISTS`). The mobile client UI presents a clear recovery prompt:
    *"An account with this email address already exists. If you just registered, your account was created successfully! Please log in with your password to continue."*
  - The client redirects to `SCR-002` (Login). The user authenticates with their credentials, and `POST /api/v1/auth/login` mints a brand-new access token and refresh token, avoiding orphaned or un-exchanged sessions.

### 3.2 UsersModule ◄► NutritionModule Contract (Pure Calculation & Profile Snapshot)
- **Invocation Context**: Recalculating metabolic targets upon profile metric update, and reading targets for daily nutrition diary display.
- **Contract Workflows**:
  1. *Energy Target Calculation*: `UsersModule` invokes `nutritionService.calculateEnergyTargets(params: MetabolicProfileInput): EnergyTargetsOutput`. This is a pure calculation contract. `NutritionModule` executes the Mifflin-St Jeor math without database queries and returns the computed calorie and macronutrient targets. `UsersModule` persists the targets into `user_profiles`.
  2. *Daily Diary Target Retrieval*: When `NutritionModule` compiles the daily diary screen (`SCR-009`, `SCR-010`), it queries `usersService.getProfileSnapshot(userId)` to obtain the stored target snapshot and unit system preferences.
- **Isolation Invariant**:
  - `NutritionModule` does NOT write directly to `user_profiles`.
  - `UsersModule` remains the sole owner of persisted profile targets.
  - DTOs live in shared contract interfaces, preventing circular imports.

### 3.3 NutritionModule ◄► ProgressModule Contract
- **MVP Operational Boundary**:
  - In the MVP scope, `ProgressModule` tracks daily body weight entries and compiles the workout history calendar.
  - `ProgressModule` and `NutritionModule` are **completely decoupled in the MVP database tier**.
  - `ProgressModule` possesses **zero direct Mongoose access** to `nutrition_logs` or `food_library`.
- **Future Read-Only Contract**:
  - If progress analytics in future phases display nutritional adherence curves (e.g., 7-day caloric average vs. weight trend), `ProgressModule` must invoke:
    `nutritionService.getNutritionSummary(userId: string, dateRange: DateRangeDto): Promise<NutritionSummarySnapshotDto>`
  - Direct collection queries across module boundaries remain strictly prohibited.

### 3.3 WorkoutsModule ◄► ProgressModule Contract
- **Invocation Context**: Compiling the monthly workout history calendar on `SCR-020` and drilling down into past workout session logs.
- **Contract Type**: Synchronous in-process read-only service call.
- **Methods**:
  - `workoutsService.getCompletedSessionDates(userId: string, month: number, year: number): Promise<string[]>` (Returns array of completed workout date strings, e.g. `['2026-11-01', '2026-11-03']` for calendar marker rendering).
  - `workoutsService.getWorkoutSession(userId: string, sessionId: string): Promise<WorkoutSessionDto>` (Returns read-only historical session detail for the `SCR-020` review modal).
- **Isolation Invariant**:
  - `ProgressModule` does NOT query the `workout_sessions` collection directly via Mongoose.
  - `WorkoutsModule` does NOT access `body_weight_entries`.

### 3.4 UsersModule ◄► ProgressModule Contract (Dual Communication Paths & Snapshot Reliability)
- **Communication Architecture**: The architecture establishes two clearly distinguished communication paths between `UsersModule` and `ProgressModule`:
  1. **Synchronous Command Path (`UsersModule` $\longrightarrow$ `ProgressModule`)**: `UsersModule` calls `ProgressService` public methods for profile-initiated weight edits and snapshot rebuilds.
  2. **Asynchronous Event Path (`ProgressModule` $\longrightarrow$ `UsersModule`)**: `ProgressModule` emits domain events (`weight.recorded`) to the internal event bus to notify subscribers of new weigh-ins.
- **Contract Workflows**:
  1. *Profile Weight Edit (SCR-021)*:
     - User edits current weight in User Profile & Goal Management (`SCR-021`).
     - `UsersModule` synchronously invokes `progressService.logWeight(userId, { weightKg, date, note: 'Updated from Profile' })`.
     - *Non-Atomic Write Defense*: Appending to `body_weight_entries` and updating `user_profiles.weightKg` are **not assumed to be distributed-atomic**. The authoritative entry in `body_weight_entries` must commit first. Upon confirmed persistence, `UsersModule` updates `user_profiles.weightKg` and sets `weightUpdatedAt = new Date()`. If the Progress write fails, the profile update is aborted and an error is surfaced.
  2. *Progress Dashboard Weigh-In (SCR-020)*:
     - User logs a weigh-in on Progress & Analytics Dashboard (`SCR-020`) via `POST /api/v1/progress/weight`.
     - `ProgressService` commits the entry to `body_weight_entries` as the authoritative record.
     - `ProgressModule` publishes the asynchronous in-process domain event:
       `weight.recorded: { userId: string, weightKg: number, recordedAt: Date }`.
     - `UsersModule` listens to `weight.recorded` to update its operational snapshot `user_profiles.weightKg`.
- **Defensible Snapshot Reliability Strategy**:
  - *No False Claim of Guaranteed In-Process Reliability*: The architecture explicitly acknowledges that standard in-process event emitters (`EventEmitter`) do not guarantee delivery if the Node.js process crashes, encounters an unhandled exception, or experiences event loop starvation before listener execution.
  - *Stale Event Overwrite Defense*: To prevent an out-of-order or delayed event from overwriting a newer profile edit, the event listener in `UsersModule` enforces a strict timestamp guard:
    ```typescript
    if (new Date(event.recordedAt) >= new Date(userProfile.weightUpdatedAt)) {
      userProfile.weightKg = event.weightKg;
      userProfile.weightUpdatedAt = event.recordedAt;
      await userProfile.save();
    }
    ```
  - *Snapshot Rebuild from Authoritative Ledger*: If an event is missed or snapshot inconsistency is detected, `UsersModule` provides:
    `usersService.rebuildWeightSnapshotFromLedger(userId: string): Promise<void>`
    This routine invokes `progressService.getLatestWeight(userId)` to retrieve the most recent record from `body_weight_entries` and idempotently updates `user_profiles.weightKg`.
  - *Durable Event Outbox (Open Architectural Decision ARCH-006)*: Implementing a transactional outbox table or message queue (e.g. RabbitMQ/Redis Streams) for guaranteed at-least-once event delivery is preserved as an **open architectural evaluation for Phase 3.2** (`ARCH-006`).
- **Data Ownership Invariants**:
  - **Authoritative Ledger**: `ProgressModule` is the **sole authoritative owner** of `body_weight_entries`.
  - **Operational Snapshot**: `user_profiles.weightKg` in `UsersModule` is an operational cached snapshot for display (`SCR-021`) and Mifflin-St Jeor calculations.
  - Neither module directly accesses or queries the other module's database collections.

### 3.5 CoachModule ◄► Context Providers Contract
- **Invocation Context**: User dispatches a chat message to `POST /api/v1/coach/chat` that passes Layer 1 pre-filters.
- **Contract Type**: Synchronous in-process read-only snapshot retrieval.
- **Methods**:
  - `usersService.getProfileSnapshot(userId: string): Promise<UserGoalContextDto>` (Retrieves fitness goal, training experience level, biological sex, and active unit system).
  - `nutritionService.getTodayNutritionSnapshot(userId: string, date: string): Promise<NutritionContextDto>` (Retrieves today's target calories/macros and logged consumed subtotals).
  - `workoutsService.getRecentWorkoutsSnapshot(userId: string, limit: number): Promise<WorkoutContextDto[]>` (Retrieves the 3 most recently completed workouts, including exercise names, sets, and total volume).
- **Strict Isolation & Mutation Ban**:
  - `CoachModule` possesses **zero direct database access** to any collections outside of its own `coach_conversations` and `coach_messages` (accessed strictly via `CoachRepository`).
  - `CoachModule` has **zero write operations** or mutating methods to modify user profiles, adjust calorie targets, or alter workout plans (`FR-COACH-005`). All advice is returned strictly as conversational text.

### 3.6 Coordinated Account Deletion Saga Contract (Privacy & Lifecycle Management)
- **Invocation Context**: User requests permanent account deletion via `DELETE /api/v1/users/account` (`FR-SAFE-001`, `NFR-SEC-002`).
- **Contract Type**: Orchestrated multi-stage saga coordinated by `UsersModule`.
- **Failure-Tolerant Saga State Machine**:
  - Deletion states on `User`: `active` $\longrightarrow$ `pending_deletion` $\longrightarrow$ `deleting` $\longrightarrow$ `deleted` (or `failed_retry`).
- **Detailed Saga Execution Flow**:
  1. *Immediate Account Lockout & Revocation*:
     - `UsersModule` updates user state to `pending_deletion` and synchronously calls `authService.revokeAllSessions(userId)`.
     - `AuthModule` marks all refresh tokens in `refresh_tokens` as revoked and increments `tokenVersion`.
     - Any subsequent API request using existing access tokens is immediately rejected at the auth guard with `401 Unauthorized` (`ACCOUNT_LOCKED_FOR_DELETION`), preventing concurrent writes.
  2. *Coordinated Multi-Module Data Purge*:
     - `UsersModule` sets state to `deleting` and calls each module's encapsulated public purge interface:
       - `workoutsService.purgeUserData(userId)`: Deletes all records in `workout_sessions` and `processed_idempotency_keys`.
       - `nutritionService.purgeUserData(userId)`: Deletes all daily diary entries in `nutrition_logs`.
       - `progressService.purgeUserData(userId)`: Deletes all historical weigh-in records in `body_weight_entries`.
       - `coachService.purgeUserData(userId)`: Deletes all chat logs in `coach_conversations` and `coach_messages`.
  3. *Consent Record Pseudonymization & Statutory Audit Retention*:
     - `UsersModule` updates `consent_records` for the user: replaces `userId` with a keyed cryptographic hash:
       $$\text{pseudonymizedUserId} = \text{HMAC-SHA256}(\text{userId}, \text{serverSecretKey})$$
     - Retains disclaimer version and timestamp for statutory regulatory defense.
     - *Pseudonymization vs. Anonymization*: The architecture explicitly recognizes that **cryptographic hashing is pseudonymization, NOT guaranteed legal anonymization** (under GDPR Recital 26). Final consent retention treatment remains subject to formal legal counsel review.
  4. *Identity & Profile Deletion*:
     - `usersService.purgeUserData(userId)`: Deletes `user_profiles`.
     - `authService.deleteAccountData(userId)`: Deletes `users` and `password_reset_tokens`.
     - Deletion state transitions to `deleted`.
- **Partial Failure & Mid-Saga Crash Recovery**:
  - Each module's `purgeUserData(userId)` method is strictly idempotent (executing `deleteMany({ userId })`).
  - If any purge operation fails or the process crashes midway, the state transitions to `failed_retry`.
  - A scheduled background reconciliation job queries records in `pending_deletion` or `failed_retry` with `updatedAt < now - 15 minutes` and resumes the saga idempotently until all stages are complete.
- **Strict Boundary Preservation**:
  - No module directly accesses, queries, or drops collections owned by another module.
  - All deletion actions execute strictly through public domain service methods.

---

## 4. Cross-Module Communication & Dependency Matrix

The table below summarizes permitted inter-module calls and data flow directions:

| Calling Module | Target Module | Permitted Interaction | Communication Mechanism | Direct DB Access? |
| :--- | :--- | :--- | :--- | :---: |
| `AuthModule` | `UsersModule` | Create initial profile (`createInitialProfile`) & record consent (`recordConsent`) during registration | Synchronous Service Call (`ClientSession`) | **PROHIBITED** |
| `UsersModule` | `NutritionModule` | Calculate energy/macro targets on body metric updates (`calculateEnergyTargets`) | Synchronous Service Call (Pure Function) | **PROHIBITED** |
| `UsersModule` | `ProgressModule` | Delegate profile weight edits (`logWeight`); query latest weight for snapshot rebuild (`getLatestWeight`) | Synchronous Service Call (Command / Query) | **PROHIBITED** |
| `UsersModule` | All Modules | Account deletion orchestrator (`deleteAccount` coordinating multi-stage saga via `purgeUserData` / `deleteAccountData`) | Synchronous Service Call (Saga Workflow) | **PROHIBITED** |
| `NutritionModule` | `UsersModule` | Query user target goals, calorie budget, and unit preferences for diary display (`getProfileSnapshot`) | Synchronous Service Call (Read-Only) | **PROHIBITED** |
| `WorkoutsModule` | `UsersModule` | Query user training experience level for volume benchmarks (`getProfileSnapshot`) | Synchronous Service Call (Read-Only) | **PROHIBITED** |
| `ProgressModule` | `WorkoutsModule` | Query session dates for history calendar (`getCompletedSessionDates`); fetch session details for modal review (`getWorkoutSession`) | Synchronous Service Call (Read-Only) | **PROHIBITED** |
| `ProgressModule` | `UsersModule` | Notify subscribers of new authoritative weigh-in (`weight.recorded` domain event) | Asynchronous Domain Event (Event Bus) | **PROHIBITED** |
| `ProgressModule` | `NutritionModule` | Decoupled in MVP; read-only adherence snapshots in future (`getNutritionSummary`) | Synchronous Service Call (Read-Only) | **PROHIBITED** |
| `CoachModule` | `UsersModule` | Query user goal & training experience snapshot (`getProfileSnapshot`) | Synchronous Service Call (Read-Only) | **PROHIBITED** |
| `CoachModule` | `NutritionModule` | Query today's calorie & macro budget snapshot (`getTodayNutritionSnapshot`) | Synchronous Service Call (Read-Only) | **PROHIBITED** |
| `CoachModule` | `WorkoutsModule` | Query last 3 completed workouts snapshot (`getRecentWorkoutsSnapshot`) | Synchronous Service Call (Read-Only) | **PROHIBITED** |

---

## 5. Coupling Prevention & Architectural Governance

To enforce module boundaries programmatically during development:
1. **TypeScript Path Aliases**: Configure `@modules/<module-name>` aliases that expose strictly `index.ts` files containing public interfaces and DTOs. Internal controller, repository, and model files are never exported.
2. **ESLint Dependency Rules**: Use `eslint-plugin-import` with `no-restricted-paths` to trigger build-time failures if any file in `src/modules/A/` attempts to import from `src/modules/B/models/` or `src/modules/B/repositories/`.
3. **Database Repository Boundary**: Repositories are instantiated strictly within their owning module. Zero Mongoose model references are shared across module folders.

