  # FitMate AI — UsersModule Database Schema Specifications

  **Document Version:** 1.2.0  
  **Phase:** 3.2 — Database Schema Design  
  **Status:** PROPOSED (Awaiting Human Review & Approval)  
  **Last Updated:** 2026-11-02  
  **Owning Architecture:** Backend Engineering & MongoDB Data Modeling  
  **Module Ownership:** `UsersModule`  
  **Author:** Antigravity Senior Backend Architect & MongoDB Data Modeling Engineer  

  ---

  ## 1. Executive Summary & Module Boundaries

  The `UsersModule` is the authoritative domain module responsible for managing user profiles, baseline anthropometric measurements, fitness goals, training background, localization preferences (language and unit system), legal consent registries, and orchestrating the multi-module account deletion saga.

  ### 1.1 Strict Modular Monolith Ownership & Access Boundaries
  In strict alignment with [ADR-001](file:///d:/2026/Personal%20Fitness%20&%20AI%20Coach%20Platform/FitMate-AI/docs/architecture/ARCHITECTURE_DECISION_RECORDS.md#L34-L63) and [MODULE_BOUNDARIES.md §2.2](file:///d:/2026/Personal%20Fitness%20&%20AI%20Coach%20Platform/FitMate-AI/docs/architecture/MODULE_BOUNDARIES.md#L127-L192):

  1. **Collections Exclusively Owned by UsersModule**:
    - `user_profiles` (1-to-1 core user profile entity, anthropometrics, localization, and target metadata).
    - `consent_records` (Legal consent registry for statutory compliance tracking).
    - `deletion_audit_logs` (Pseudonymized post-deletion statutory audit records).
    - `deletion_saga_jobs` (*Proposed Operational Collection if MongoDB is selected for saga state; owned by `UsersModule`*).
  2. **Prohibition of Direct Access to AuthModule (`users`, `user_identities`)**:
    - `UsersModule` must **NEVER directly read or write** the `users`, `user_identities`, or `refresh_tokens` collections owned by `AuthModule` via Mongoose models or raw MongoDB drivers.
    - All account status transitions (e.g. marking account as `pending_deletion` or `deleting`), session revocations, and credential purges must execute strictly through typed public service contracts on `AuthModule` (`IAuthService.setAccountStatus`, `IAuthService.revokeAllSessions`, `IAuthService.deleteAccountData`).
  3. **Prohibition of Direct Access to ProgressModule (`body_weight_entries`)**:
    - `UsersModule` possesses zero direct database access to `body_weight_entries`.
    - The authoritative historical weigh-in ledger is owned exclusively by `ProgressModule` per [ADR-013](file:///d:/2026/Personal%20Fitness%20&%20AI%20Coach%20Platform/FitMate-AI/docs/architecture/ARCHITECTURE_DECISION_RECORDS.md#L559-L605).
    - `user_profiles.weightKg` is strictly an operational cached snapshot. All weight logging, including the baseline weight upon registration/onboarding, must route through `IProgressService.recordInitialWeight` or `IProgressService.logWeight`.
  4. **Prohibition of Cross-Module Collection Queries**:
    - `UsersModule` possesses zero direct access to `nutrition_logs` or `food_library` (owned strictly by `NutritionModule`).
    - `UsersModule` possesses zero direct access to `workout_sessions` or `processed_idempotency_keys` (owned strictly by `WorkoutsModule`).
    - `UsersModule` possesses zero direct access to `coach_conversations` or `coach_messages` (owned strictly by `CoachModule`).
  5. **Pure Calculation Contracts ([MODULE_BOUNDARIES.md §3.2](file:///d:/2026/Personal%20Fitness%20&%20AI%20Coach%20Platform/FitMate-AI/docs/architecture/MODULE_BOUNDARIES.md#L467-L476))**:
    - When recalculating metabolic targets, `UsersModule` invokes `nutritionService.calculateEnergyTargets(params)` — a pure in-process calculation utility with zero database side-effects. `UsersModule` persists the resulting targets into `user_profiles`.

  ---

  ## 2. Collection 1: `user_profiles`

  ### 2.1 Purpose & Domain Ownership
  The `user_profiles` collection stores persistent user traits, primary fitness goals, activity levels, training background, localization preferences, calculated metabolic targets, and the operational cached weight snapshot. It is owned exclusively by `UsersModule`.

  ### 2.2 TypeScript Interface Proposals (Documentation Only)
  ```typescript
  import { Document, Types } from 'mongoose';

  export type FitnessGoalArchetype =
    | 'fat_loss'
    | 'muscle_gain'
    | 'recomposition'
    | 'maintenance'
    | 'general_fitness'
    | 'undecided';

  export type BiologicalSex = 'male' | 'female' | 'prefer_not_to_say';

  export type TrainingExperienceLevel = 'beginner' | 'intermediate' | 'advanced';

  export type UnitSystem = 'metric' | 'imperial';

  export type PreferredLanguage = 'en' | 'ar';

  export type DietaryPreference =
    | 'none'
    | 'vegetarian'
    | 'vegan'
    | 'pescatarian'
    | 'halal'
    | 'keto'
    | 'custom';

  export interface IUserProfile {
    userId: Types.ObjectId;              // Foreign key ref: users (Unique 1-to-1)
    displayName?: string;                // User-chosen display name (optional string, omitted when unset)
    isOnboardingCompleted: boolean;      // True if onboarding wizard completed; false for Google OAuth skeletons (DB-026)
    unitSystem: UnitSystem;              // 'metric' | 'imperial' (FR-ONBD-001, ADR-010)
    preferredLanguage: PreferredLanguage;// 'en' | 'ar' (FR-ONBD-001, ADR-011)
    
    // Anthropometric & Fitness Goals (Required when isOnboardingCompleted === true)
    goal?: FitnessGoalArchetype;         // Primary fitness archetype (FR-ONBD-002)
    biologicalSex?: BiologicalSex;       // Factor for BMR (DEC-005 neutral s = -78)
    birthDate?: Date;                    // Date of birth for age derivation (A)
    heightCm?: number;                   // Canonical SI metric (float64, 1 decimal place, DB-016)
    weightKg?: number;                   // Operational cached snapshot (float64, 2 decimal places, DB-016)
    weightRecordedAt?: Date;             // Authoritative measurement timestamp from ProgressModule (ADR-013)
    weightEntryId?: Types.ObjectId;      // OPEN Dependency: ProgressModule entry _id for deterministic tie-breaking
    activityMultiplier?: number;         // PAL multiplier (1.2, 1.375, 1.55, 1.725, 1.9)
    trainingExperience?: TrainingExperienceLevel;
    dietaryPreference?: DietaryPreference;// Informational dietary context
    
    // Metabolic Target Metadata & Timestamps (DB-012, DB-019)
    dailyCalorieTarget?: number;         // Mifflin-St Jeor target (rounded integer, DB-016)
    proteinTargetGrams?: number;         // Float64 rounded to 1 decimal place (DB-016)
    carbsTargetGrams?: number;           // Float64 rounded to 1 decimal place (DB-016)
    fatTargetGrams?: number;             // Float64 rounded to 1 decimal place (DB-016)
    isTargetsCustomized: boolean;        // True if user configured manual targets rather than formula
    isEstimated: boolean;                // Always true for calculated figures (Core Invariant 2, DB-012)
    targetsCalculatedAt?: Date;          // Timestamp when currently applied formula targets were computed
    customTargetsSetAt?: Date;           // Timestamp when user manually set or modified custom targets
    baselineRecalculatedAt?: Date;       // Timestamp when baseline was computed on-the-fly while custom targets retained
    calculationVersion?: string;         // Algorithmic formula version (e.g. 'mifflin_st_jeor_v1')
    
    schemaVersion: number;               // Default 1 (DB-015)
    createdAt: Date;
    updatedAt: Date;
  }

  export interface IUserProfileDocument extends Document<Types.ObjectId>, IUserProfile {
    id: string;
  }
  ```

  ### 2.3 Field Specification Table
  | Field Name | BSON / Mongoose Type | Required | Default | Validation & Bounds | Description |
  | :--- | :--- | :---: | :---: | :--- | :--- |
  | `_id` | `ObjectId` | Auto | Generated | Unique MongoDB identifier | Document primary key. |
  | `userId` | `ObjectId` | Yes | — | Ref: `User`, immutable | Foreign key referencing `users._id`. Strict 1-to-1 relationship. |
  | `displayName` | `String` | No | `undefined` | Trimmed, min 1, max 100 chars | Optional UI display name (`SCR-021`). Omitted when unset ([DB-026](file:///d:/2026/Personal%20Fitness%20&%20AI%20Coach%20Platform/FitMate-AI/docs/architecture/DATABASE_ISSUES.md#L257-L265)). |
  | `isOnboardingCompleted`| `Boolean` | Yes | `false` | Boolean flag | Profile setup completion indicator. `false` for new Google OAuth sign-ins. |
  | `unitSystem` | `String` | Yes | `'metric'` | Enum: `['metric', 'imperial']` | Active UI unit display system ([ADR-010](file:///d:/2026/Personal%20Fitness%20&%20AI%20Coach%20Platform/FitMate-AI/docs/architecture/ARCHITECTURE_DECISION_RECORDS.md#L450-L498)). |
  | `preferredLanguage`| `String` | Yes | `'en'` | Enum: `['en', 'ar']` | Active app language & RTL layout toggle ([ADR-011](file:///d:/2026/Personal%20Fitness%20&%20AI%20Coach%20Platform/FitMate-AI/docs/architecture/ARCHITECTURE_DECISION_RECORDS.md#L499-L519)). |
  | `goal` | `String` | Cond. | `undefined` | Enum: `['fat_loss', 'muscle_gain', 'recomposition', 'maintenance', 'general_fitness', 'undecided']` | Required when `isOnboardingCompleted === true` ([FR-ONBD-002](file:///d:/2026/Personal%20Fitness%20&%20AI%20Coach%20Platform/FitMate-AI/docs/product/FUNCTIONAL_REQUIREMENTS.md#L87-L93)). |
  | `biologicalSex` | `String` | Cond. | `'prefer_not_to_say'` | Enum: `['male', 'female', 'prefer_not_to_say']` | Factor for Mifflin-St Jeor $s$ constant ($+5, -161, -78$ per [DEC-005](file:///d:/2026/Personal%20Fitness%20&%20AI%20Coach%20Platform/FitMate-AI/docs/architecture/MODULE_BOUNDARIES.md#L187)). |
  | `birthDate` | `Date` | Cond. | `undefined` | Age $\ge 13$ and $\le 100$ | Required when `isOnboardingCompleted === true`. |
  | `heightCm` | `Number` (Float64) | Cond. | `undefined` | Range: $[100.0, 250.0]$, rounded to 1 decimal place ([DB-016](file:///d:/2026/Personal%20Fitness%20&%20AI%20Coach%20Platform/FitMate-AI/docs/architecture/DATABASE_ISSUES.md#L113-L122)) | Canonical height in cm ([ADR-010](file:///d:/2026/Personal%20Fitness%20&%20AI%20Coach%20Platform/FitMate-AI/docs/architecture/ARCHITECTURE_DECISION_RECORDS.md#L450-L498)). Required on completion. |
  | `weightKg` | `Number` (Float64) | Cond. | `undefined` | Range: $[30.00, 300.00]$, rounded to 2 decimal places ([DB-016](file:///d:/2026/Personal%20Fitness%20&%20AI%20Coach%20Platform/FitMate-AI/docs/architecture/DATABASE_ISSUES.md#L113-L122)) | Operational cached snapshot ([ADR-013](file:///d:/2026/Personal%20Fitness%20&%20AI%20Coach%20Platform/FitMate-AI/docs/architecture/ARCHITECTURE_DECISION_RECORDS.md#L559-L605)). Required on completion. |
  | `weightRecordedAt` | `Date` | Cond. | `undefined` | Valid Date | Authoritative measurement timestamp from `ProgressModule` ([ADR-013](file:///d:/2026/Personal%20Fitness%20&%20AI%20Coach%20Platform/FitMate-AI/docs/architecture/ARCHITECTURE_DECISION_RECORDS.md#L577)). |
  | `weightEntryId` | `ObjectId` | No | `undefined` | Ref: `body_weight_entries` | **OPEN Dependency**: ProgressModule `_id` for deterministic tie-breaking. |
  | `activityMultiplier`| `Number` (Float64)| Cond. | `1.2` | Enum: `[1.2, 1.375, 1.55, 1.725, 1.9]` | PAL multiplier ([FR-NUTR-001](file:///d:/2026/Personal%20Fitness%20&%20AI%20Coach%20Platform/FitMate-AI/docs/product/FUNCTIONAL_REQUIREMENTS.md#L121)). Required on completion. |
  | `trainingExperience`| `String` | Cond. | `'beginner'` | Enum: `['beginner', 'intermediate', 'advanced']` | Training background level. Required on completion. |
  | `dietaryPreference`| `String` | Cond. | `'none'` | Enum: `['none', 'vegetarian', 'vegan', 'pescatarian', 'halal', 'keto', 'custom']` | Informational dietary context for recipes and AI Coach. |
  | `dailyCalorieTarget`| `Number` (Integer) | Cond. | `undefined` | $\ge 500$ and $\le 10000$, rounded integer ([DB-016](file:///d:/2026/Personal%20Fitness%20&%20AI%20Coach%20Platform/FitMate-AI/docs/architecture/DATABASE_ISSUES.md#L113-L122)) | Daily energy target in kcal. Required on completion. |
  | `proteinTargetGrams`| `Number` (Float64)| Cond. | `undefined` | $\ge 0$, rounded to 1 decimal place | Daily protein target in grams. Required on completion. |
  | `carbsTargetGrams` | `Number` (Float64)| Cond. | `undefined` | $\ge 0$, rounded to 1 decimal place | Daily carbohydrate target in grams. Required on completion. |
  | `fatTargetGrams` | `Number` (Float64)| Cond. | `undefined` | $\ge 0$, rounded to 1 decimal place | Daily fat target in grams. Required on completion. |
  | `isTargetsCustomized`| `Boolean` | Yes | `false` | Boolean | True if user manually configured targets; protects against overwrite. |
  | `isEstimated` | `Boolean` | Yes | `true` | Always `true` ([Core Invariant 2](file:///d:/2026/Personal%20Fitness%20&%20AI%20Coach%20Platform/FitMate-AI/.agents/AGENTS.md#L25-L35)) | Explicit estimation transparency marker ([DB-012](file:///d:/2026/Personal%20Fitness%20&%20AI%20Coach%20Platform/FitMate-AI/docs/architecture/DATABASE_ISSUES.md#L45-L70)). |
  | `targetsCalculatedAt`| `Date` | Cond. | `undefined` | Valid Date | Timestamp when current formula targets were computed ([DB-019](file:///d:/2026/Personal%20Fitness%20&%20AI%20Coach%20Platform/FitMate-AI/docs/architecture/DATABASE_ISSUES.md#L190-L197)). |
  | `customTargetsSetAt` | `Date` | No | `undefined` | Valid Date | Timestamp when user manually modified custom targets. |
  | `baselineRecalculatedAt`| `Date` | No | `undefined` | Valid Date | Timestamp when baseline formula was recalculated while custom values retained. |
  | `calculationVersion`| `String` | Cond. | `'mifflin_st_jeor_v1'` | Non-empty string | Algorithmic version of the metabolic engine. |
  | `schemaVersion` | `Number` | Yes | `1` | Integer $\ge 1$ | Document schema versioning ([DB-015](file:///d:/2026/Personal%20Fitness%20&%20AI%20Coach%20Platform/FitMate-AI/docs/architecture/DATABASE_ISSUES.md#L94-L105)). |
  | `createdAt` | `Date` | Auto | Now | Valid Date | Document creation timestamp (`timestamps: true`). |
  | `updatedAt` | `Date` | Auto | Now | Valid Date | Document modification timestamp (`timestamps: true`). |

  ### 2.4 Index Definitions & Justifications
  | Index Key | Index Type | Index Name | Supported Query Patterns & ESR Justification |
  | :--- | :---: | :--- | :--- |
  | `{ userId: 1 }` | Unique | `uniq_user_profile_userId` | Guarantees exactly one profile per user account. Supports $O(1)$ equality lookup on all authenticated profile operations (`GET /api/v1/users/profile`, `PATCH /api/v1/users/profile`, context assembly). |

  *Prefix Redundancy Audit ([DB-014](file:///d:/2026/Personal%20Fitness%20&%20AI%20Coach%20Platform/FitMate-AI/docs/architecture/DATABASE_ISSUES.md#L72-L92))*: `user_profiles` requires only this single unique index. No redundant secondary indexes exist.

  ### 2.5 Profile Lifecycle & Target Invariants

  #### 1. Onboarding Completion & Incomplete Profiles ([DB-026](file:///d:/2026/Personal%20Fitness%20&%20AI%20Coach%20Platform/FitMate-AI/docs/architecture/DATABASE_ISSUES.md#L257-L265))
  - **Local Registration**: In the standard email/password registration flow, the mobile client holds questionnaire responses in RAM and commits account creation, profile, consent, and initial weight in a single atomic transaction. `isOnboardingCompleted` is set to `true` upon insertion.
  - **Google OAuth Registration**: When a user registers via Google Sign-In (`POST /api/v1/auth/google`), `AuthModule` creates the user account and Google identity. `UsersModule` creates a skeletal `user_profiles` document with `isOnboardingCompleted: false`. Required anthropometric fields (`heightCm`, `weightKg`, `goal`, targets) remain `undefined` until the user completes the onboarding wizard. Application routing gates access to dashboard features until `POST /api/v1/users/onboarding/complete` is called.

  #### 2. Target Calculation Timestamps & Custom Target Protection ([DB-012](file:///d:/2026/Personal%20Fitness%20&%20AI%20Coach%20Platform/FitMate-AI/docs/architecture/DATABASE_ISSUES.md#L45-L70), [DB-019](file:///d:/2026/Personal%20Fitness%20&%20AI%20Coach%20Platform/FitMate-AI/docs/architecture/DATABASE_ISSUES.md#L190-L197))
  To eliminate confusion regarding whether retained custom targets were recalculated, the schema strictly separates calculation timestamps:
  - `targetsCalculatedAt`: Records when formula-derived baseline targets were computed and applied to `dailyCalorieTarget` and macro fields.
  - `customTargetsSetAt`: Records when the user manually customized their targets.
  - `baselineRecalculatedAt`: When an anthropometric update occurs while `isTargetsCustomized === true`, the backend computes updated baseline targets strictly for UI presentation (e.g. informing the user that their baseline has shifted). Custom targets remain untouched, `targetsCalculatedAt` remains untouched, and `baselineRecalculatedAt` is updated to record when the presentation baseline was derived.
  - **Applying Recalculations**: If the user confirms applying the recalculated baseline, `isTargetsCustomized` transitions to `false`, the targets are updated, and `targetsCalculatedAt` is set to `new Date()`.

  #### 3. Weight Snapshot Event Ordering, Equal Timestamps & Concurrency ([ADR-013](file:///d:/2026/Personal%20Fitness%20&%20AI%20Coach%20Platform/FitMate-AI/docs/architecture/ARCHITECTURE_DECISION_RECORDS.md#L559-L605))
  The operational snapshot `user_profiles.weightKg` must reflect the latest state of the authoritative ledger `body_weight_entries`. To prevent race conditions and lost updates:

  1. **Atomic Conditional Updates**:
    When consuming an asynchronous `weight.recorded` event, `UsersModule` executes an atomic conditional update:
    ```javascript
    await UserProfile.updateOne(
      {
        userId: event.userId,
        $or: [
          { weightRecordedAt: { $lt: event.recordedAt } },
          // Equal timestamp tie-breaker:
          { 
            weightRecordedAt: event.recordedAt, 
            weightEntryId: { $lt: event.entryId } 
          },
          { weightRecordedAt: { $exists: false } }
        ]
      },
      {
        $set: {
          weightKg: event.weightKg,
          weightRecordedAt: event.recordedAt,
          weightEntryId: event.entryId,
          updatedAt: new Date()
        }
      }
    );
    ```
  2. **Equal-Timestamp & Duplicate Event Handling**:
    - If a duplicate event arrives (at-least-once delivery), the filter condition evaluates to false (matched count = 0), resulting in an idempotent no-op.
    - If two distinct weigh-ins have identical `recordedAt` timestamps, the system uses `entryId` (or `createdAt`) as a deterministic tie-breaker.
    - *OPEN Dependency*: `MODULE_BOUNDARIES.md §3.4` currently defines `weight.recorded` as `{ userId: string, weightKg: number, recordedAt: Date }` without `entryId`. Adding `entryId: Types.ObjectId` and `createdAt: Date` to the event payload is an **OPEN architectural dependency** on `ProgressModule`.
  3. **Concurrent Snapshot Rebuilds**:
    `usersService.rebuildWeightSnapshotFromLedger(userId)` retrieves the latest record via `progressService.getLatestWeight(userId)`. It applies the same atomic conditional query to ensure that an in-flight newer event is never overwritten by a stale rebuild read.
  4. **Deletion of the Latest Measurement**:
    When a user deletes their latest weigh-in in `ProgressModule`:
    - An event filter checking `event.recordedAt >= weightRecordedAt` cannot handle deletions, as the new latest weigh-in has an *older* timestamp.
    - Therefore, `ProgressModule` must emit a `weight.deleted` event (or trigger `usersService.rebuildWeightSnapshotFromLedger(userId)`).
    - The rebuild query fetches the current latest entry from `body_weight_entries` and unconditionally resets `weightKg`, `weightRecordedAt`, and `weightEntryId` to that entry. If all entries have been deleted, the snapshot falls back to the registration baseline or null.

  ---

  ## 3. Collection 2: `consent_records`

  ### 3.1 Purpose & Domain Ownership
  The `consent_records` collection serves as the formal legal audit registry documenting user acceptance of health disclaimers, terms of service, and privacy policies. It is owned exclusively by `UsersModule`.

  ### 3.2 TypeScript Interface Proposals (Documentation Only)
  ```typescript
  import { Document, Types } from 'mongoose';

  export type ConsentType = 'health_disclaimer' | 'terms_of_service' | 'privacy_policy';

  export type ConsentAction = 'accepted' | 'withdrawn';

  export type ConsentRecordStatus = 'active' | 'pseudonymized';

  export interface IConsentRecord {
    userId: Types.ObjectId | null;      // Active user reference; cleared to null upon account deletion
    pseudonymizedUserId?: string;       // HMAC-SHA256(userId, secret); populated strictly upon deletion (DB-013)
    hmacKeyVersion?: string;            // Version identifier of the HMAC secret key used (e.g. 'v1', 'v2')
    status: ConsentRecordStatus;        // 'active' | 'pseudonymized'
    consentType: ConsentType;           // Specific legal agreement
    action: ConsentAction;              // Action recorded: 'accepted' or 'withdrawn'
    hasAccepted: boolean;               // True if currently accepted, false if withdrawn
    disclaimerVersion: string;          // Semantic version string (e.g. '1.0.0')
    recordedAt: Date;                   // Timestamp of explicit action
    ipHash: string;                     // Cryptographic hash of client IP at action time (NFR-SEC-006)
    userAgentTruncated: string;         // Max 100 chars sanitized user agent snippet
    pseudonymizedAt?: Date;             // Timestamp when pseudonymization occurred
    schemaVersion: number;              // Default 1 (DB-015)
    createdAt: Date;
    updatedAt: Date;
  }

  export interface IConsentRecordDocument extends Document<Types.ObjectId>, IConsentRecord {
    id: string;
  }
  ```

  ### 3.3 Field Specification Table
  | Field Name | BSON / Mongoose Type | Required | Default | Validation & Bounds | Description |
  | :--- | :--- | :---: | :---: | :--- | :--- |
  | `_id` | `ObjectId` | Auto | Generated | Unique MongoDB identifier | Document primary key. |
  | `userId` | `ObjectId` | Cond. | `null` | Ref: `User` | Active user ID reference. Cleared to `null` upon account deletion ([DB-013](file:///d:/2026/Personal%20Fitness%20&%20AI%20Coach%20Platform/FitMate-AI/docs/architecture/DATABASE_ISSUES.md#L72-L92)). |
  | `pseudonymizedUserId`| `String` | Cond. | `undefined` | 64 hex characters (`/^[a-f0-9]{64}$/`) | Keyed `HMAC-SHA256(userId, serverSecretKey)`. Populated upon deletion. |
  | `hmacKeyVersion` | `String` | Cond. | `undefined` | Non-empty string (e.g. `'v1'`) | Key version used for pseudonymization; supports key rotation. |
  | `status` | `String` | Yes | `'active'` | Enum: `['active', 'pseudonymized']` | Lifecycle status of the consent record. |
  | `consentType` | `String` | Yes | — | Enum: `['health_disclaimer', 'terms_of_service', 'privacy_policy']` | Specific legal document ([FR-ONBD-003](file:///d:/2026/Personal%20Fitness%20&%20AI%20Coach%20Platform/FitMate-AI/docs/product/FUNCTIONAL_REQUIREMENTS.md#L94-L100)). |
  | `action` | `String` | Yes | `'accepted'` | Enum: `['accepted', 'withdrawn']` | Recorded user action. |
  | `hasAccepted` | `Boolean` | Yes | `true` | Boolean flag | Current state: `true` for acceptance, `false` for withdrawal. |
  | `disclaimerVersion` | `String` | Yes | — | SemVer regex (e.g. `'1.0.0'`) | Version string of the legal terms. |
  | `recordedAt` | `Date` | Yes | Now | Valid Date | Timestamp of explicit user action. |
  | `ipHash` | `String` | Yes | — | Exactly 64 hex characters | Cryptographic hash of client IP ([NFR-SEC-006](file:///d:/2026/Personal%20Fitness%20&%20AI%20Coach%20Platform/FitMate-AI/docs/architecture/MODULE_BOUNDARIES.md#L69)). |
  | `userAgentTruncated`| `String` | Yes | `'Unknown'`| Trimmed, max 100 characters | Sanitized client device snippet without private identifiers. |
  | `pseudonymizedAt` | `Date` | No | `null` | Valid Date | Timestamp when active identity was severed. |
  | `schemaVersion` | `Number` | Yes | `1` | Integer $\ge 1$ | Document schema versioning ([DB-015](file:///d:/2026/Personal%20Fitness%20&%20AI%20Coach%20Platform/FitMate-AI/docs/architecture/DATABASE_ISSUES.md#L94-L105)). |
  | `createdAt` | `Date` | Auto | Now | Valid Date | Creation timestamp (`timestamps: true`). |
  | `updatedAt` | `Date` | Auto | Now | Valid Date | Last modified timestamp (`timestamps: true`). |

  ### 3.4 Distinct Consent Types & Withdrawal Semantics under OPEN DB-029
  FitMate AI distinguishes three distinct legal agreements with specific withdrawal semantics:

  1. `terms_of_service`: Contractual baseline governing platform usage. Withdrawing consent to the terms of service is synonymous with account termination; it cannot be toggled off while maintaining an active account. A withdrawal request immediately transitions the account to the deletion saga.
  2. `health_disclaimer`: Mandatory assertion acknowledging that the AI coach is informational and non-medical ([Core Invariant 1](file:///d:/2026/Personal%20Fitness%20&%20AI%20Coach%20Platform/FitMate-AI/.agents/AGENTS.md#L20-L24)). Withdrawing health disclaimer consent immediately halts all coaching, workout generation, and calorie tracking features.
  3. `privacy_policy`: Personal data processing consent. Governs storage of sensitive fitness metrics.
  4. **Withdrawal Modeling under OPEN DB-029**:
    - In v1.1.0, `hasAccepted` was constrained to strictly `true`, which prevented modeling withdrawal.
    - In v1.2.0, the schema introduces `action: 'accepted' | 'withdrawn'` and `hasAccepted: boolean`.
    - *Append-Only Model (Proposed)*: When a user withdraws consent or accepts a new version, an append-only entry is created with `action: 'withdrawn'` and `hasAccepted: false`, preserving a complete audit trail.
    - *Mutable Model (Alternative)*: Updates the existing record in place with an embedded `history` array.
    - **Status**: The choice between append-only vs mutable records remains **OPEN (DB-029)** pending legal counsel review.

  ### 3.5 Index Definitions & Partial Filter Implementation
  | Index Key | Index Type | Partial Filter Expression | Index Name | Supported Query Patterns |
  | :--- | :---: | :--- | :--- | :--- |
  | `{ userId: 1, consentType: 1 }` | Partial | `{ userId: { $type: 'objectId' } }` | `idx_consent_active_userId_type` | Verifies active user consent agreements. Excludes pseudonymized records where `userId === null`. |
  | `{ pseudonymizedUserId: 1, hmacKeyVersion: 1 }` | Partial | `{ pseudonymizedUserId: { $type: 'string' } }` | `idx_consent_pseudonymized_lookup` | Enables statutory lookup for compliance defense across key rotation versions. |

  ### 3.6 IP Hashing Security Analysis & HMAC Key Versioning Lifecycle
  1. **Plain SHA-256 IP Hashing Vulnerability**:
    - Plain `SHA-256(ipAddress)` without a secret key is vulnerable to rainbow table precomputation attacks across the finite $2^{32} \approx 4.29$ billion IPv4 space.
    - *Proposal*: To provide genuine de-identification, the platform evaluates `HMAC-SHA256(ipAddress, IP_SALT_SECRET)` or subnet truncation (`/24`) prior to hashing.
  2. **HMAC Key Versioning & Rotation**:
    - When account deletion occurs, `pseudonymizedUserId` is generated using a keyed hash:
      $$\text{pseudonymizedUserId} = \text{HMAC-SHA256}(\text{userId}, \text{KMS.getKey}(hmacKeyVersion))$$
    - The active key version (e.g. `'v1'`) is persisted in `hmacKeyVersion`.
    - Secret keys are stored in an external Key Management Service (KMS) or secure environment store, **never in database documents**.
    - Upon key rotation (e.g. to `'v2'`), historical records retain `'v1'`. Compliance lookups compute candidate hashes across active and historical versions, searching `{ pseudonymizedUserId: hash, hmacKeyVersion: version }`.
  3. **Pseudonymous vs. Anonymous Data (GDPR Recital 26)**:
    - Keyed HMAC hashes are legally **pseudonymous data**, not anonymous data, because the holder of the KMS key can re-identify the user. Therefore, these records remain subject to strict operational access controls.

  ---

  ## 4. Collection 3: `deletion_audit_logs`

  ### 4.1 Purpose & Domain Ownership
  The `deletion_audit_logs` collection stores post-deletion statutory audit records verifying that account erasure was executed across backend modules. It is created upon completion of the deletion saga and owned exclusively by `UsersModule`.

  ### 4.2 Durable Operational Saga Ledger vs. Final Audit Record ([DB-018](file:///d:/2026/Personal%20Fitness%20&%20AI%20Coach%20Platform/FitMate-AI/docs/architecture/DATABASE_ISSUES.md#L140-L182))
  The architecture strictly delineates operational saga execution state from final statutory audit records:

  ```
  ┌─────────────────────────────────────────────────────────────────────────────┐
  │              OPERATIONAL SAGA LEDGER vs. FINAL AUDIT LOG                    │
  ├─────────────────────────────────────────────────────────────────────────────┤
  │                                                                             │
  │   1. OPERATIONAL SAGA LEDGER (deletion_saga_jobs)                           │
  │   - Role: Active execution coordinator. Tracks step-by-step progress.       │
  │   - Fields: sagaId, targetUserId, status, currentStep, completedSteps,      │
  │             failedSteps, retryCount, leaseOwner, leaseExpiresAt, heartbeat. │
  │   - Lifecycle: Mutable during deletion; cleared or archived upon completion.│
  │   - Persistence: Dedicated collection or durable Redis task queue.          │
  │   - In-memory-only queues are strictly prohibited (fails crash recovery).   │
  │                                                                             │
  │   2. FINAL AUDIT RECORD (deletion_audit_logs)                               │
  │   - Role: Post-purge statutory audit record.                                │
  │   - Written: ONLY after all domain purges reach terminal completion.        │
  │   - Content: Pseudonymized hash, key version, outcome, modules purged.      │
  │   - PII: Zero plaintext user IDs, emails, or personal data.                 │
  │   - Retention: Governed by MongoDB TTL index (retention period is OPEN).    │
  │                                                                             │
  └─────────────────────────────────────────────────────────────────────────────┘
  ```

  ### 4.3 TypeScript Interface Proposals (Documentation Only)
  ```typescript
  import { Document, Types } from 'mongoose';

  export type DeletionTerminalOutcome = 'success' | 'manual_review_required';

  export interface IDeletionAuditLog {
    pseudonymizedUserId: string;       // HMAC-SHA256(userId, KMS.getKey(hmacKeyVersion))
    hmacKeyVersion: string;            // Key version used to generate the hash (e.g. 'v1')
    requestedAt: Date;                 // Original deletion request timestamp
    completedAt: Date;                 // Timestamp when final purge step committed
    outcome: DeletionTerminalOutcome;  // 'success' | 'manual_review_required'
    purgedModules: string[];           // List of confirmed purged modules (e.g. ['auth', 'workouts', ...])
    retentionReason: string;           // Legal statutory basis category
    executionDurationMs: number;       // Execution duration in milliseconds
    expiresAt: Date;                   // Eventual TTL cleanup timestamp (retention period is OPEN)
    schemaVersion: number;             // Default 1 (DB-015)
    createdAt: Date;
    updatedAt: Date;
  }

  export interface IDeletionAuditLogDocument
    extends Document<Types.ObjectId>,
      IDeletionAuditLog {
    id: string;
  }
  ```

  ### 4.4 Field Specification Table
  | Field Name | BSON / Mongoose Type | Required | Default | Validation & Bounds | Description |
  | :--- | :--- | :---: | :---: | :--- | :--- |
  | `_id` | `ObjectId` | Auto | Generated | Unique MongoDB identifier | Document primary key. |
  | `pseudonymizedUserId`| `String` | Yes | — | Exactly 64 hex characters | Keyed `HMAC-SHA256(userId, serverSecretKey)`. Zero plaintext PII. |
  | `hmacKeyVersion` | `String` | Yes | — | Non-empty string (e.g. `'v1'`) | Key version identifier for key rotation auditing. |
  | `requestedAt` | `Date` | Yes | — | Valid Date | Timestamp when user initiated account deletion. |
  | `completedAt` | `Date` | Yes | Now | Valid Date | Timestamp when deletion saga reached terminal state. |
  | `outcome` | `String` | Yes | `'success'` | Enum: `['success', 'manual_review_required']` | Terminal execution outcome. |
  | `purgedModules` | `Array<String>` | Yes | — | Array of strings | List of modules purged (`['auth', 'workouts', 'nutrition', 'progress', 'coach', 'users']`). |
  | `retentionReason` | `String` | Yes | `'statutory_compliance_defense'` | Max 100 characters | Legal statutory defense category. |
  | `executionDurationMs`| `Number` | Yes | — | $\ge 0$ integer | Total elapsed time to coordinate purge across modules. |
  | `expiresAt` | `Date` | Yes | — | Future Date | Eventual TTL cleanup timestamp (governed by open retention policy). |
  | `schemaVersion` | `Number` | Yes | `1` | Integer $\ge 1$ | Document schema versioning ([DB-015](file:///d:/2026/Personal%20Fitness%20&%20AI%20Coach%20Platform/FitMate-AI/docs/architecture/DATABASE_ISSUES.md#L94-L105)). |
  | `createdAt` | `Date` | Auto | Now | Valid Date | Document creation timestamp (`timestamps: true`). |
  | `updatedAt` | `Date` | Auto | Now | Valid Date | Document modification timestamp (`timestamps: true`). |

  ### 4.5 Index Definitions & Justifications
  | Index Key | Index Type | Index Name | Supported Query Patterns & ESR Justification |
  | :--- | :---: | :--- | :--- |
  | `{ pseudonymizedUserId: 1, hmacKeyVersion: 1 }` | Unique | `uniq_deletion_audit_pseudonym_ver` | Enables $O(1)$ proof-of-erasure verification while supporting historical key rotation versions. |
  | `{ expiresAt: 1 }` | TTL | `ttl_deletion_audit_cleanup` | Eventual background disk reclamation (`expireAfterSeconds: 0`). |

  ### 4.6 Statutory Retention & Privacy Realities
  1. **Retention Duration is OPEN**:
    - The platform **removes unsupported claims that 90 days is a statutory requirement**. The exact retention window and legal basis remain an **OPEN decision** pending formal legal/product counsel input.
  2. **TTL Cleanup Realities**:
    - MongoDB background TTL threads run opportunistically (~once every 60 seconds). TTL indexes represent an **eventual cleanup mechanism**, not an exact millisecond guarantee.
  3. **Pseudonymous vs. Anonymous Data**:
    - Under GDPR Recital 26, keyed HMAC hashes are **pseudonymous data**, NOT legally anonymous data, because anyone with access to the KMS key could re-identify the subject. Data is treated with strict access controls.

  ---

  ## 5. Collection 4 (Proposed Operational Collection): `deletion_saga_jobs` ([DB-018](file:///d:/2026/Personal%20Fitness%20&%20AI%20Coach%20Platform/FitMate-AI/docs/architecture/DATABASE_ISSUES.md#L140-L182))

  ### 5.1 Purpose & Infrastructure Context
  If MongoDB is selected as the persistence store for active deletion saga coordination (DB-018), `deletion_saga_jobs` stores the mutable, step-by-step execution state of active account deletion workflows. It is owned exclusively by `UsersModule`.

  *Persistence Choice is OPEN*: Whether this operational ledger resides in a dedicated MongoDB collection or a distributed Redis / BullMQ queue is an **OPEN infrastructure decision**. The logical schema, state machine, and concurrency rules defined below apply regardless of the underlying persistence technology.

  ### 5.2 TypeScript Interface Proposals (Documentation Only)
  ```typescript
  import { Document, Types } from 'mongoose';

  export type DeletionSagaStatus =
    | 'pending'                  // Created, awaiting initial worker pickup
    | 'in_progress'              // Actively executing by a leased worker
    | 'retry_pending'            // A step failed with a recoverable error; awaiting exponential backoff
    | 'completed'                // Terminal success: all steps committed, audit log created
    | 'abandoned_manual_review'; // Max retries exceeded; escalated to operational engineering

  export type DeletionSagaStep =
    | 'lock_account'             // Step 1: Lock account status & revoke sessions (AuthModule)
    | 'purge_workouts'           // Step 2: Delete workout sessions & idempotency keys (WorkoutsModule)
    | 'purge_nutrition'          // Step 3: Delete nutrition logs (NutritionModule)
    | 'purge_progress'           // Step 4: Delete body weight entries (ProgressModule)
    | 'purge_coach'              // Step 5: Delete coach conversations & messages (CoachModule)
    | 'purge_external_storage'   // Step 6: Purge S3 avatars & export artifacts
    | 'pseudonymize_consents'    // Step 7: Pseudonymize consent records (UsersModule)
    | 'purge_profile'            // Step 8: Delete user profile (UsersModule)
    | 'purge_auth_credentials'   // Step 9: Delete user identities & user document (AuthModule)
    | 'finalize_audit_log';      // Step 10: Persist deletion_audit_logs record

  export interface IDeletionStepExecution {
    step: DeletionSagaStep;
    status: 'pending' | 'completed' | 'failed';
    startedAt?: Date;
    completedAt?: Date;
    retryCount: number;
    lastError?: string;
  }

  export interface IDeletionSagaJob {
    sagaId: string;                      // Unique UUIDv4 identifier for the saga execution
    idempotencyKey: string;              // Client idempotency key from DELETE /api/v1/users/account
    targetUserId: Types.ObjectId;        // Target user ID (retained on saga record until job completion)
    status: DeletionSagaStatus;
    currentStep: DeletionSagaStep;
    completedSteps: DeletionSagaStep[];  // List of successfully completed steps
    failedSteps: IDeletionStepExecution[];// History of failed attempts per step
    retryCount: number;                  // Total accumulated retries across all steps
    maxRetries: number;                  // Max retries allowed (default: 5) before manual review
    nextRetryAt?: Date;                  // Exponential backoff timestamp
    leaseOwner: string | null;           // Worker instance identifier (e.g. 'worker-pod-84f9a:pid-42')
    leaseExpiresAt: Date | null;         // Expiration timestamp of the current worker lease
    lastHeartbeatAt: Date | null;        // Last worker heartbeat renewal timestamp
    failureDetails?: {
      step: DeletionSagaStep;
      errorName: string;
      errorMessage: string;
      stackTrace?: string;
      timestamp: Date;
    };
    hmacKeyVersion: string;              // Key version used when computing pseudonymizedUserId
    pseudonymizedUserId?: string;        // Pre-computed or generated HMAC hash for audit logging
    schemaVersion: number;               // Default 1 (DB-015)
    createdAt: Date;
    updatedAt: Date;
  }

  export interface IDeletionSagaJobDocument
    extends Document<Types.ObjectId>,
      IDeletionSagaJob {
    id: string;
  }
  ```

  ### 5.3 Field Specification Table
  | Field Name | BSON / Mongoose Type | Required | Default | Validation & Bounds | Description |
  | :--- | :--- | :---: | :---: | :--- | :--- |
  | `_id` | `ObjectId` | Auto | Generated | Unique MongoDB identifier | Document primary key. |
  | `sagaId` | `String` | Yes | Generated | UUIDv4 regex | Unique execution tracking identifier. |
  | `idempotencyKey` | `String` | Yes | — | Min 16, max 128 chars | Client idempotency key ensuring duplicate requests return the same saga. |
  | `targetUserId` | `ObjectId` | Yes | — | Ref: `User` | Target user account being erased. Retained until saga cleanup. |
  | `status` | `String` | Yes | `'pending'` | Enum: `['pending', 'in_progress', 'retry_pending', 'completed', 'abandoned_manual_review']` | Current state machine status. |
  | `currentStep` | `String` | Yes | `'lock_account'`| Enum: `DeletionSagaStep` | Step currently executing or scheduled next. |
  | `completedSteps` | `Array<String>` | Yes | `[]` | Array of `DeletionSagaStep` | Ordered list of confirmed committed purge steps. |
  | `failedSteps` | `Array<Object>` | Yes | `[]` | Array of `IDeletionStepExecution` | Audit log of failed step executions with error details. |
  | `retryCount` | `Number` | Yes | `0` | $\ge 0$ integer | Number of retries executed across all steps. |
  | `maxRetries` | `Number` | Yes | `5` | $\ge 1$ integer | Maximum retries before escalating to manual review. |
  | `nextRetryAt` | `Date` | No | `undefined` | Valid Date | Exponential backoff delay timestamp for retries. |
  | `leaseOwner` | `String` | No | `null` | String identifier or null | Worker ID holding the active execution lease. |
  | `leaseExpiresAt` | `Date` | No | `null` | Future Date or null | Expiration timestamp of the current worker lease (e.g. now + 60s). |
  | `lastHeartbeatAt`| `Date` | No | `null` | Valid Date or null | Timestamp of the last worker heartbeat renewal. |
  | `failureDetails` | `Object` | No | `undefined` | Subdocument | Structured diagnostic info for the most recent failure. |
  | `hmacKeyVersion` | `String` | Yes | `'v1'` | Non-empty string | KMS key version for computing the post-deletion pseudonym. |
  | `pseudonymizedUserId`| `String` | No | `undefined` | 64 hex characters | Pre-computed HMAC hash for the target user. |
  | `schemaVersion` | `Number` | Yes | `1` | Integer $\ge 1$ | Document schema versioning ([DB-015](file:///d:/2026/Personal%20Fitness%20&%20AI%20Coach%20Platform/FitMate-AI/docs/architecture/DATABASE_ISSUES.md#L94-L105)). |
  | `createdAt` | `Date` | Auto | Now | Valid Date | Creation timestamp (`timestamps: true`). |
  | `updatedAt` | `Date` | Auto | Now | Valid Date | Modification timestamp (`timestamps: true`). |

  ### 5.4 Index Definitions & Query Justifications
  | Index Key | Index Type | Index Name | Supported Query Patterns & ESR Justification |
  | :--- | :---: | :--- | :--- |
  | `{ sagaId: 1 }` | Unique | `uniq_saga_job_sagaId` | $O(1)$ lookup for saga status polling and management. |
  | `{ idempotencyKey: 1 }` | Unique | `uniq_saga_job_idempotency` | Enforces exact once saga creation on client retries. |
  | `{ targetUserId: 1 }` | Partial Unique | `uniq_saga_active_targetUserId` | Partial unique filter: `{ status: { $in: ['pending', 'in_progress', 'retry_pending'] } }`. Prevents concurrent overlapping deletion sagas for the same account. |
  | `{ status: 1, leaseExpiresAt: 1 }` | Compound | `idx_saga_worker_polling` | ESR: Supports worker polling for available jobs (`status: 'pending'`) or expired leases (`status: 'in_progress', leaseExpiresAt: { $lt: now }`). |
  | `{ status: 1, nextRetryAt: 1 }` | Compound | `idx_saga_retry_scheduling` | Supports the retry scheduler finding jobs ready for re-execution (`status: 'retry_pending', nextRetryAt: { $lte: now }`). |

  ### 5.5 State Transitions, Terminal States & Worker Fencing Protocol

  ```
                          ┌────────────────────────┐
                          │   Initiation Request   │
                          └───────────┬────────────┘
                                      │
                                      ▼
                            ┌──────────────────┐
                            │     pending      │
                            └─────────┬────────┘
                                      │ Worker acquires lease
                                      ▼
    ┌───────────────────────►  in_progress  ◄───────────────────────┐
    │                                │                              │
    │ Step retry (backoff)           │ Step fails (retries < max)   │ Lease expired &
    │                                ▼                              │ reclaimed
    │                         retry_pending                         │ by sweeper
    │                                │                              │
    │                                │ Max retries exceeded         │
    │                                ▼                              │
    │                    abandoned_manual_review                    │
    │                                                               │
    │ Step succeeds (all steps)                                     │
    │                                                               │
    └───────────────────────────────►  completed  ──────────────────┘
  ```

  #### Worker Fencing Protocol (Optimistic Locking via CAS)
  To prevent split-brain execution when a worker stalls (e.g. during a prolonged GC pause or network partition) and its lease expires:
  1. **Lease Acquisition**: A worker acquires an available or expired lease using an atomic `findOneAndUpdate`:
    ```javascript
    const now = new Date();
    const leaseDurationMs = 60000; // 60 seconds
    const job = await DeletionSagaJob.findOneAndUpdate(
      {
        _id: jobId,
        status: { $in: ['pending', 'retry_pending', 'in_progress'] },
        $or: [
          { leaseOwner: null },
          { leaseExpiresAt: { $lt: now } }
        ]
      },
      {
        $set: {
          status: 'in_progress',
          leaseOwner: workerId,
          leaseExpiresAt: new Date(now.getTime() + leaseDurationMs),
          lastHeartbeatAt: now,
          updatedAt: now
        }
      },
      { returnDocument: 'after' }
    );
    ```
  2. **Heartbeat Renewal**: For long-running steps, the worker issues heartbeats every 20 seconds, updating `leaseExpiresAt = now + 60s` only if `leaseOwner === workerId`.
  3. **Step Commitment Fencing**: Before committing step completion, the worker updates the document with the precondition `{ _id: jobId, leaseOwner: workerId, leaseExpiresAt: { $gte: now } }`. If the update matches 0 documents, the worker has lost its lease and must immediately abort execution without committing further changes.

  ### 5.6 Handling Uncertain External Operations & Network Timeouts
  During Step 6 (`purge_external_storage`, e.g. deleting S3 profile avatars) or remote API calls:
  - **Idempotent Delete Contracts**: All purge operations must be idempotent. In S3, calling `DeleteObject` on a non-existent key returns `204 No Content` / success. The saga worker treats `404 Not Found` or `204 No Content` as successful erasure.
  - **Handling Network Timeouts (5xx / ECONNRESET)**: If an external call times out, the outcome is uncertain. The worker marks the step as failed, increments `retryCount`, and enters `retry_pending` with exponential backoff ($2^{\text{retryCount}} \times 1\text{s}$). On retry, the worker repeats the delete. Because the operation is idempotent, repeating an already-executed delete produces zero side-effects.

  ### 5.7 Alternative Architecture: Redis / BullMQ Durability & Recovery Realities
  If Redis / BullMQ is selected instead of a MongoDB collection:
  - **Durability Invariant**: Standard Redis defaults to in-memory storage with asynchronous RDB snapshots or AOF with `appendfsync everysec`. In the event of an ungraceful Redis crash or host failure, up to 1 second of job updates can be lost.
  - **Durability Requirements for Saga Jobs**:
    1. Redis must be configured with `appendonly yes` and `appendfsync everysec` (or `always` for strict financial/legal grade guarantees).
    2. Multi-AZ replication (Redis Sentinel or Cluster) with synchronous replication acknowledgment is required to avoid losing queued deletion jobs during failover.
    3. BullMQ jobs must be configured with persistent job data and manual acknowledgments (`autoRemove: false` until terminal completion).
  - **Split-Brain & Dual-Store Consistency**: Storing the saga ledger in Redis while domain data lives in MongoDB creates dual-store consistency challenges. If Redis is selected, a durable intent record in MongoDB or a two-phase initialization protocol is required to guarantee crash recovery.

  ---

  ## 6. Cross-Collection & Multi-Module Workflows

  ---

  ### 6.1 Workflow 1A: User Registration & Initial Profile Creation (`POST /api/v1/auth/register`)
  - **Invocation Context**: User completes onboarding questionnaire and submits email/password credentials ([FR-ONBD-004](file:///d:/2026/Personal%20Fitness%20&%20AI%20Coach%20Platform/FitMate-AI/docs/product/FUNCTIONAL_REQUIREMENTS.md#L101-L112)).
  - **Collections Affected**:
    1. `users` (`AuthModule`)
    2. `user_identities` (`AuthModule`)
    3. `refresh_tokens` (`AuthModule`)
    4. `user_profiles` (`UsersModule`)
    5. `consent_records` (`UsersModule`)
    6. `body_weight_entries` (`ProgressModule` — *Fix: Initial baseline weigh-in record*)
  - **Transaction Boundaries & Atomicity ([ADR-006](file:///d:/2026/Personal%20Fitness%20&%20AI%20Coach%20Platform/FitMate-AI/docs/architecture/ARCHITECTURE_DECISION_RECORDS.md#L23), [DB-032](file:///d:/2026/Personal%20Fitness%20&%20AI%20Coach%20Platform/FitMate-AI/docs/architecture/DATABASE_ISSUES.md#L290-L298))**:
    Executes inside a single MongoDB `ClientSession` transaction coordinated by `AuthModule`:
    ```
    AuthService.register()
      ├── session = startSession(); session.startTransaction()
      ├── 1. users.create({ email, status: 'active' }, { session })
      ├── 2. user_identities.create({ userId, provider: 'local', passwordHash, isPrimary: true }, { session })
      ├── 3. refresh_tokens.create({ userId, hashedToken, tokenFamily }, { session })
      ├── 4. usersService.createInitialProfile(session, userId, onboardingDto)
      │        └── user_profiles.create({ userId, heightCm, weightKg, isOnboardingCompleted: true, ... }, { session })
      ├── 5. usersService.recordConsent(session, userId, consentDto)
      │        └── consent_records.create({ userId, consentType, action: 'accepted', hasAccepted: true, ... }, { session })
      ├── 6. progressService.recordInitialWeight(session, userId, { weightKg, recordedAt: now, note: 'Initial baseline' })
      │        └── body_weight_entries.create({ userId, weightKg, date: localDateString, ... }, { session })
      └── session.commitTransaction()
    ```
  - **Authoritative Baseline Ledger Enforcement**: The profile snapshot `user_profiles.weightKg` is accompanied by the creation of the baseline record in `body_weight_entries`. If `progressService.recordInitialWeight` fails, the transaction aborts, ensuring no profile is created without its authoritative baseline entry.
  - **Rollback Behavior**: If any step fails, `session.abortTransaction()` cleanly rolls back all 6 collections. Zero orphaned documents remain.

  ---

  ### 6.2 Workflow 1B: Google OAuth Registration & Staged Onboarding Completion
  - **Invocation Context**: User signs in with Google OAuth (`POST /api/v1/auth/google`) prior to completing onboarding questionnaire ([DB-025](file:///d:/2026/Personal%20Fitness%20&%20AI%20Coach%20Platform/FitMate-AI/docs/architecture/DATABASE_ISSUES.md#L248-L256), [DB-026](file:///d:/2026/Personal%20Fitness%20&%20AI%20Coach%20Platform/FitMate-AI/docs/architecture/DATABASE_ISSUES.md#L257-L265)).
  - **Stage 1: Account Creation (`POST /api/v1/auth/google`)**:
    - `AuthModule` validates the Google ID token (`sub`, `email`, `email_verified`).
    - Executes a transaction across `users`, `user_identities` (`provider: 'google'`, `providerUserId: sub`), `refresh_tokens`, and `usersService.createSkeletonProfile`:
      ```
      AuthService.loginWithGoogle()
        ├── session.startTransaction()
        ├── users.create({ email, status: 'active' }, { session })
        ├── user_identities.create({ userId, provider: 'google', providerUserId: sub, isPrimary: true }, { session })
        ├── refresh_tokens.create({ userId, hashedToken }, { session })
        ├── usersService.createSkeletonProfile(session, userId, { displayName: name, preferredLanguage })
        │     └── user_profiles.create({ userId, isOnboardingCompleted: false, unitSystem: 'metric' }, { session })
        ├── usersService.recordConsent(session, userId, { consentType: 'terms_of_service', action: 'accepted' })
        └── session.commitTransaction()
      ```
    - Required anthropometrics (`heightCm`, `weightKg`, `goal`, targets) remain `undefined`.
    - App navigation gates dashboard access and directs user to onboarding screens.
  - **Stage 2: Onboarding Completion (`POST /api/v1/users/onboarding/complete`)**:
    - Separate authenticated request containing completed questionnaire data.
    - Executes a single transaction:
      ```
      UsersService.completeOnboarding(userId, dto)
        ├── session.startTransaction()
        ├── 1. Calculate energy targets: nutritionService.calculateEnergyTargets(dto)
        ├── 2. user_profiles.updateOne({ userId }, {
        │        $set: {
        │          goal: dto.goal,
        │          biologicalSex: dto.biologicalSex,
        │          birthDate: dto.birthDate,
        │          heightCm: dto.heightCm,
        │          weightKg: dto.weightKg,
        │          weightRecordedAt: now,
        │          activityMultiplier: dto.activityMultiplier,
        │          trainingExperience: dto.trainingExperience,
        │          dailyCalorieTarget: targets.calories,
        │          proteinTargetGrams: targets.protein,
        │          carbsTargetGrams: targets.carbs,
        │          fatTargetGrams: targets.fat,
        │          targetsCalculatedAt: now,
        │          isOnboardingCompleted: true
        │        }
        │      }, { session })
        ├── 3. progressService.recordInitialWeight(session, userId, { weightKg: dto.weightKg, recordedAt: now })
        │        └── body_weight_entries.create({ userId, weightKg: dto.weightKg, ... }, { session })
        ├── 4. usersService.recordConsent(session, userId, { consentType: 'health_disclaimer', action: 'accepted' })
        └── session.commitTransaction()
      ```
    - Upon commit, `isOnboardingCompleted: true` unlocks the mobile dashboard.

  ---

  ### 6.3 Workflow 2: Profile Anthropometric Updates & Pure Target Recalculation (`PATCH /api/v1/users/profile`)
  - **Invocation Context**: User modifies height, weight, goal, or activity multiplier on `SCR-021`.
  - **Collections Affected**: `user_profiles`.
  - **Workflow & Calculation Steps**:
    1. `UsersController` validates input payload.
    2. `UsersService` calls pure calculation contract:
      `nutritionService.calculateEnergyTargets({ weightKg, heightCm, age, sex, goal, activityMultiplier })`.
    3. `calculateEnergyTargets` computes Mifflin-St Jeor arithmetic deterministically with zero database queries.
    4. **Target Preservation Logic**:
      - If `userProfile.isTargetsCustomized === true`: Custom targets are retained. The API returns the computed targets in response metadata and sets `userProfile.baselineRecalculatedAt = new Date()`.
      - If `userProfile.isTargetsCustomized === false`: Targets are updated to the newly computed values, and `userProfile.targetsCalculatedAt = new Date()`.
    5. `user_profiles` is saved.
  - **Forward-Only Recalculation Invariant ([DB-019](file:///d:/2026/Personal%20Fitness%20&%20AI%20Coach%20Platform/FitMate-AI/docs/architecture/DATABASE_ISSUES.md#L190-L197))**: Historical `nutrition_logs` retain past target snapshots and are never retroactively recomputed.

  ---

  ### 6.4 Workflow 3: Dual Communication Paths for Body Weight Updates ([ADR-013](file:///d:/2026/Personal%20Fitness%20&%20AI%20Coach%20Platform/FitMate-AI/docs/architecture/ARCHITECTURE_DECISION_RECORDS.md#L559-L605))

  ```
  ┌─────────────────────────────────────────────────────────────────────────────┐
  │                 DUAL COMMUNICATION PATHS FOR BODY WEIGHT                    │
  ├─────────────────────────────────────────────────────────────────────────────┤
  │                                                                             │
  │   PATH 1: Profile Screen Edit (SCR-021) [Synchronous Command]               │
  │   User edits weight in Profile -> UsersModule                               │
  │     ├── 1. progressService.logWeight(userId, { weightKg, date })            │
  │     │      └── Commits authoritative record in body_weight_entries          │
  │     └── 2. Upon confirmed commit, atomically updates user_profiles.weightKg │
  │            and sets weightRecordedAt = authoritative measurement date       │
  │                                                                             │
  │   PATH 2: Progress Screen Log (SCR-020) [Asynchronous Event]                │
  │   User logs weight in Progress -> ProgressModule                            │
  │     ├── 1. Commits authoritative record in body_weight_entries              │
  │     └── 2. Emits domain event: weight.recorded { userId, weightKg, date,    │
  │            entryId, createdAt }                                             │
  │              └── UsersModule Event Listener:                                │
  │                    Executes atomic conditional update:                      │
  │                    $or: [                                                   │
  │                      { weightRecordedAt: { $lt: event.date } },             │
  │                      { weightRecordedAt: event.date,                        │
  │                        weightEntryId: { $lt: event.entryId } }              │
  │                    ]                                                        │
  │                                                                             │
  │   FAILURE RECOVERY / WEIGH-IN DELETION: Deterministic Snapshot Rebuild      │
  │   If event lost or latest weigh-in deleted:                                 │
  │   usersService.rebuildWeightSnapshotFromLedger(userId)                      │
  │   queries progressService.getLatestWeight(userId) and resyncs snapshot.     │
  │                                                                             │
  └─────────────────────────────────────────────────────────────────────────────┘
  ```

  ---

  ### 6.5 Workflow 4: Account Deletion Saga Initiation & Orchestration ([DB-018](file:///d:/2026/Personal%20Fitness%20&%20AI%20Coach%20Platform/FitMate-AI/docs/architecture/DATABASE_ISSUES.md#L140-L182))
  - **Invocation Context**: User initiates permanent deletion via `DELETE /api/v1/users/account` ([SCR-022](file:///d:/2026/Personal%20Fitness%20&%20AI%20Coach%20Platform/FitMate-AI/docs/product/SCREEN_INVENTORY.md#L423-L438)).
  - **Fix: Reliable Initiation Protocol (Eliminating the Failure Window)**:
    In v1.1.0, locking the account prior to persisting the saga job created a failure window where a process crash left an account locked with no recoverable saga record. The revised initiation protocol enforces:
    ```
    UsersController.deleteAccount(userId, idempotencyKey)
      ├── 1. PERSIST SAGA JOB FIRST:
      │      deletion_saga_jobs.create({
      │        sagaId: uuidv4(),
      │        idempotencyKey,
      │        targetUserId: userId,
      │        status: 'pending',
      │        currentStep: 'lock_account',
      │        retryCount: 0
      │      })
      │      (If duplicate idempotencyKey: returns existing saga job)
      ├── 2. ATTEMPT ACCOUNT LOCKOUT:
      │      authService.setAccountStatus(userId, 'pending_deletion')
      │      authService.revokeAllSessions(userId)
      ├── 3. ADVANCE SAGA TO IN_PROGRESS:
      │      deletion_saga_jobs.updateOne({ sagaId }, {
      │        $set: { status: 'in_progress', currentStep: 'purge_workouts' },
      │        $push: { completedSteps: 'lock_account' }
      │      })
      └── 4. Respond to client with 202 Accepted { sagaId, status: 'pending_deletion' }
    ```
    *Crash Recovery during Initiation*: If the server crashes between Step 1 and Step 2, the background saga worker sweeps unassigned `pending` jobs. It idempotently executes `authService.setAccountStatus(userId, 'pending_deletion')` and `authService.revokeAllSessions(userId)`. Because account lockout is idempotent, no account can become stranded in `pending_deletion` without an active saga ledger record.
  - **Idempotent Multi-Module Purge Sequence**:
    Once locked, background workers execute purge steps sequentially:
    - Step 1: `workoutsService.purgeUserData(userId)` $\rightarrow$ deletes `workout_sessions` & `processed_idempotency_keys`.
    - Step 2: `nutritionService.purgeUserData(userId)` $\rightarrow$ deletes `nutrition_logs`.
    - Step 3: `progressService.purgeUserData(userId)` $\rightarrow$ deletes `body_weight_entries`.
    - Step 4: `coachService.purgeUserData(userId)` $\rightarrow$ deletes `coach_conversations` & `coach_messages`.
    - Step 5: External storage purges (e.g. S3 user profile pictures, temporary export files).
    - Step 6: `consent_records` pseudonymization (`userId = null`, `pseudonymizedUserId = HMAC`, `hmacKeyVersion: 'v1'`, `status = 'pseudonymized'`).
    - Step 7: `user_profiles.deleteOne({ userId })`.
    - Step 8: `authService.deleteAccountData(userId)` $\rightarrow$ deletes `user_identities`, `password_reset_tokens`, and `users`.
    - Step 9: `deletion_audit_logs.create({ pseudonymizedUserId, hmacKeyVersion, outcome: 'success', ... })`.
    - Step 10: Clean up or archive `deletion_saga_jobs` record.
  - **Terminal Failure & Escalation**:
    If a step encounters non-transient errors or exhausts 5 retries:
    - `deletion_saga_jobs` is updated to `status: 'abandoned_manual_review'`.
    - `deletion_audit_logs` is created with `outcome: 'manual_review_required'`.
    - Operational alerting is triggered for engineering intervention.

  ---

  ## 7. End-of-Document Architecture Summaries

  ---

  ### 7.1 Collection Inventory (UsersModule)
  | Collection Name | Owning Module | Cardinality | Primary Key | Storage Bounding Strategy | Lifecycle |
  | :--- | :--- | :---: | :--- | :--- | :--- |
  | `user_profiles` | `UsersModule` | 1-to-1 | `_id: ObjectId` | Bounded (~1.2 KB per doc). Exactly 1 per user. | Active user entity; deleted in Step 8 of saga. |
  | `consent_records` | `UsersModule` | 1-to-few | `_id: ObjectId` | Bounded (1–5 records per active user). | Retained pseudonymized indefinitely upon deletion. |
  | `deletion_audit_logs` | `UsersModule` | 1-to-1 | `_id: ObjectId` | Bounded (~800 B). Zero plaintext PII. | Post-deletion statutory audit; purged via TTL. |
  | `deletion_saga_jobs` | `UsersModule` | 1-to-1 (active) | `_id: ObjectId` | Bounded (~2 KB). Mutable operational record. | Transient; cleared/archived on terminal completion. (*Proposed if MongoDB is selected*). |

  ---

  ### 7.2 Index Inventory (UsersModule)
  | Collection Name | Index Key | Unique | Partial Filter Expression | Index Name | Supported Query Pattern |
  | :--- | :--- | :---: | :--- | :--- | :--- |
  | `user_profiles` | `{ userId: 1 }` | Yes | None | `uniq_user_profile_userId` | Primary profile lookup and context retrieval. |
  | `consent_records` | `{ userId: 1, consentType: 1 }` | No | `{ userId: { $type: 'objectId' } }` | `idx_consent_active_userId_type` | Verifies active user consent agreements; excludes pseudonymized docs. |
  | `consent_records` | `{ pseudonymizedUserId: 1, hmacKeyVersion: 1 }` | No | `{ pseudonymizedUserId: { $type: 'string' } }` | `idx_consent_pseudonymized_lookup`| Statutory regulatory inspection lookup across key rotation versions. |
  | `deletion_audit_logs` | `{ pseudonymizedUserId: 1, hmacKeyVersion: 1 }` | Yes | None | `uniq_deletion_audit_pseudonym_ver` | Proof of erasure verification across key rotation versions. |
  | `deletion_audit_logs` | `{ expiresAt: 1 }` | No | None (TTL: 0s) | `ttl_deletion_audit_cleanup` | Eventual background disk reclamation. |
  | `deletion_saga_jobs` | `{ sagaId: 1 }` | Yes | None | `uniq_saga_job_sagaId` | Direct status lookup and worker lease management. |
  | `deletion_saga_jobs` | `{ idempotencyKey: 1 }` | Yes | None | `uniq_saga_job_idempotency` | Enforces exact-once creation on client retries. |
  | `deletion_saga_jobs` | `{ targetUserId: 1 }` | Yes | `{ status: { $in: ['pending', 'in_progress', 'retry_pending'] } }` | `uniq_saga_active_targetUserId` | Prevents overlapping concurrent sagas for the same account. |
  | `deletion_saga_jobs` | `{ status: 1, leaseExpiresAt: 1 }` | No | None | `idx_saga_worker_polling` | Worker polling for unassigned jobs or expired leases. |
  | `deletion_saga_jobs` | `{ status: 1, nextRetryAt: 1 }` | No | None | `idx_saga_retry_scheduling` | Retry scheduler polling for jobs ready for re-execution. |

  ---

  ### 7.3 Cross-Collection Transaction Matrix
  | Workflow | Collections Involved | Transaction Boundary | Failure Recovery Strategy |
  | :--- | :--- | :--- | :--- |
  | **Local User Registration** | `users`, `user_identities`, `refresh_tokens`, `user_profiles`, `consent_records`, `body_weight_entries` | Multi-Document Replica Set Transaction (`ClientSession`) | Aborts transaction on failure; client retries or logs in via duplicate-email path ([MODULE_BOUNDARIES.md §3.1](file:///d:/2026/Personal%20Fitness%20&%20AI%20Coach%20Platform/FitMate-AI/docs/architecture/MODULE_BOUNDARIES.md#L459-L466)). |
  | **Google OAuth Registration** | `users`, `user_identities`, `refresh_tokens`, `user_profiles` (skeleton), `consent_records` | Multi-Document Replica Set Transaction (`ClientSession`) | Aborts transaction on failure; client re-initiates Google Sign-In. |
  | **Onboarding Completion** | `user_profiles`, `consent_records`, `body_weight_entries` | Multi-Document Replica Set Transaction (`ClientSession`) | Aborts transaction on failure; user re-submits onboarding wizard. |
  | **Profile Measurement Edit** | `user_profiles`, `body_weight_entries` | Sequential Command Pattern | Authoritative ledger commits first; snapshot updates second; on-demand rebuild on discrepancy. |
  | **Account Deletion Initiation** | `deletion_saga_jobs`, `users` | Two-Phase Idempotent Protocol | Saga job created first in `pending`; lockout executed second; sweeper retries lockout if process crashes. |
  | **Account Deletion Execution** | All Domain Collections + `deletion_audit_logs` + `deletion_saga_jobs` | Durable Orchestrated Saga | Idempotent step retry with worker lease locks via background reconciliation cron. |

  ---

  ### 7.4 Database Issue Traceability Matrix
  | Issue ID | Document Section | Treatment & Architectural Compliance |
  | :--- | :--- | :--- |
  | **DB-012** | Section 2.2, 2.3 | Preserved `isEstimated: true` unconditionally on all calculated metabolic targets. |
  | **DB-013** | Section 3.2, 3.5 | Strictly separated active `userId: ObjectId` from post-deletion `pseudonymizedUserId: string`. |
  | **DB-014** | Section 2.4, 7.2 | Redundant index audit applied; standalone index on prefix fields eliminated. |
  | **DB-015** | Section 2.3, 3.3, 4.4, 5.3 | Universal versioning (`schemaVersion: 1`) and `{ timestamps: true }` enforced. |
  | **DB-016** | Section 2.3 | Multi-tier precision applied: `weightKg` (2 decimals), `heightCm` (1 decimal), `calories` (integer). |
  | **DB-018** | Section 4.2, 5.1–5.7, 6.5 | Fully specified operational saga schema (`deletion_saga_jobs`), worker lease fencing, initiation ordering, and crash recovery. Preserved infrastructure choice as OPEN. |
  | **DB-019** | Section 2.5, 6.3 | Target recalculation policy strictly forward-only; separated calculation vs customization timestamps (`targetsCalculatedAt`, `customTargetsSetAt`, `baselineRecalculatedAt`). |
  | **DB-025** | Section 6.1, 6.2 | Local + Google OAuth MVP scopes maintained; defined staged onboarding flow for OAuth accounts. |
  | **DB-026** | Section 2.3, 2.5, 6.2 | Transient onboarding lifecycle enforced; skeletal profiles supported for Google OAuth with conditional field validation. |
  | **DB-029** | Section 3.4 | Added `action: 'accepted' \| 'withdrawn'` and `hasAccepted: boolean`; distinguished terms vs health disclaimer vs privacy; preserved append-only vs mutable ledger as OPEN. |
  | **DB-032** | Section 6.1, 6.2 | Multi-document transactions explicitly annotated with MongoDB Replica Set prerequisites. |

  ---

  ### 7.5 Open Decisions & Architectural Dependencies Requiring Resolution
  1. **DB-018 (Durable Deletion Saga Persistence Location)**:
    - Whether `deletion_saga_jobs` lives in a dedicated operational MongoDB collection or a distributed Redis / BullMQ queue during active purge execution is an **OPEN infrastructure decision**.
  2. **Deletion Audit Log Retention Duration & Statutory Basis**:
    - The retention duration and exact statutory basis remain **OPEN** pending formal legal/product counsel input.
  3. **DB-029 (Append-Only Consent Ledger vs. Mutable Update)**:
    - Whether consent updates insert a new record or update existing records in-place with an audit array remains **OPEN** pending legal counsel review.
  4. **Plain SHA-256 IP Hashing vs Keyed Salt / Subnet Truncation**:
    - Whether IP audit hashes should transition to a keyed HMAC or subnet truncation to mitigate rainbow table precomputation remains **OPEN**.
  5. **ARCH-006 (Durable Transactional Outbox for Domain Events)**:
    - Durable outbox table vs in-process event bus with on-demand snapshot rebuild remains **OPEN** for evaluation.
  6. **ProgressModule Event Metadata Dependency (New OPEN Dependency)**:
    - Supporting deterministic tie-breaking during equal-timestamp weigh-in updates requires `ProgressModule` to include `entryId: Types.ObjectId` and `createdAt: Date` in the `weight.recorded` domain event and `IProgressService.getLatestWeight` response. Preserved as an **OPEN dependency on ProgressModule**.

  ---

  ### 7.6 Document Change Summary (v1.2.0)
  - **Complete DB-018 Operational Saga Schema**: Added complete specification for `deletion_saga_jobs` (TypeScript interfaces, field validation, lease fencing protocol, state machine transitions, retry handling, uncertain external outcome handling, and Redis durability analysis).
  - **Fixed Deletion Initiation Failure Window**: Reversed order of operations in account deletion workflow: persists `deletion_saga_jobs` in `pending` status *before* initiating account lockout in `AuthModule`, guaranteeing crash recovery without orphaned locked accounts.
  - **Fixed Initial Weight Registration**: Integrated `ProgressModule.recordInitialWeight` into the atomic registration transaction (`POST /api/v1/auth/register`) and Google onboarding completion transaction (`POST /api/v1/users/onboarding/complete`), ensuring `body_weight_entries` is populated as the authoritative baseline ledger.
  - **Resolved Weight Snapshot Concurrency**: Designed atomic conditional updates (`$or` with `$lt` on `recordedAt` and tie-breaker on `entryId`), specified duplicate event handling, detailed handling for deletions of the latest measurement, and recorded an open dependency on ProgressModule event metadata.
  - **Clarified Target Calculation Timestamps**: Separated formula calculation timestamp (`targetsCalculatedAt`), custom target modification timestamp (`customTargetsSetAt`), and presentation recalculation timestamp (`baselineRecalculatedAt`), ensuring retained custom targets are not falsely marked as recalculated.
  - **Implemented HMAC Key Versioning**: Added `hmacKeyVersion` to `consent_records` and `deletion_audit_logs`, documented KMS secret management, historical record compatibility during key rotation, and GDPR Recital 26 pseudonymous classification.
  - **Clarified Google OAuth Staged Onboarding**: Documented the two-stage lifecycle (`POST /api/v1/auth/google` creating a skeletal profile with `isOnboardingCompleted: false`, followed by `POST /api/v1/users/onboarding/complete` setting anthropometrics, baseline weight, and unlocking the dashboard).
  - **Refined Consent Withdrawal Semantics**: Introduced `action: 'accepted' | 'withdrawn'`, reconciled `hasAccepted` boolean logic, and distinguished non-negotiable core terms from toggleable consent while DB-029 remains OPEN.
