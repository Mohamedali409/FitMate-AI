# FitMate AI — Database Collection Inventory

**Document Version:** 1.1.0  
**Phase:** 3.2 — Database Schema Design  
**Status:** PROPOSED (Awaiting Human Review & Approval)  
**Last Updated:** 2026-11-02  
**Owning Architecture:** Backend Engineering & MongoDB Data Modeling  
**Author:** Antigravity Senior Backend Architect & MongoDB Database Designer  

---

## 1. Architectural Foundation & Data Ownership Principles

In strict alignment with the **Modular Monolith** architecture ([ADR-001](file:///d:/2026/Personal%20Fitness%20&%20AI%20Coach%20Platform/FitMate-AI/docs/architecture/ARCHITECTURE_DECISION_RECORDS.md#L34-L63)) and **Encapsulation Invariants** defined in [MODULE_BOUNDARIES.md](file:///d:/2026/Personal%20Fitness%20&%20AI%20Coach%20Platform/FitMate-AI/docs/architecture/MODULE_BOUNDARIES.md), database collections in FitMate AI are governed by the following non-negotiable architectural rules:

1. **Strict Single Data Ownership**: Every MongoDB collection is owned exclusively by exactly one domain module. No module may directly query, insert, update, or delete records from a collection owned by another module via Mongoose models or raw MongoDB drivers.
2. **Zero Cross-Module `$lookup` Joins**: Modules must never execute relational aggregation `$lookup` stages across collections owned by different modules. Cross-module data retrieval must occur strictly through typed public service interfaces.
3. **Pure Bounded Documents (16MB BSON Defense)**: No collection may contain unbounded arrays that grow indefinitely over time. 1-to-many relationships exceeding bounded limits (~50-100 items) are modeled strictly using separate referenced collections with compound indexes.
4. **Canonical SI Storage & Estimation Transparency**:
   - All body weights are persisted canonically in kilograms (`weightKg`), heights in centimeters (`heightCm`), and serving portions in grams (`servingSizeGrams`) ([ADR-010](file:///d:/2026/Personal%20Fitness%20&%20AI%20Coach%20Platform/FitMate-AI/docs/architecture/ARCHITECTURE_DECISION_RECORDS.md#L450-L498), [DB-016](file:///d:/2026/Personal%20Fitness%20&%20AI%20Coach%20Platform/FitMate-AI/docs/architecture/DATABASE_ISSUES.md#L107-L122)).
   - Nutritional estimation flags are disambiguated per [DB-012](file:///d:/2026/Personal%20Fitness%20&%20AI%20Coach%20Platform/FitMate-AI/docs/architecture/DATABASE_ISSUES.md#L45-L70): raw reference items in `food_library` maintain `isVerified: true`, while calculations, scaled portions, Quick Adds, and daily summaries preserve `isEstimated: true` ([Core Invariant 2](file:///d:/2026/Personal%20Fitness%20&%20AI%20Coach%20Platform/FitMate-AI/.agents/AGENTS.md#L25-L35)).
5. **Universal Schema Versioning & Timestamps Policy ([DB-015](file:///d:/2026/Personal%20Fitness%20&%20AI%20Coach%20Platform/FitMate-AI/docs/architecture/DATABASE_ISSUES.md#L94-L105))**: Every root persistent document contains `schemaVersion: Number` (default: `1`) and Mongoose timestamps (`createdAt`, `updatedAt`).

---

## 2. Complete Collection Inventory Matrix

The table below summarizes all collections in the FitMate AI backend architecture, their owning module, relationship strategy, and MVP delivery status:

| # | Collection Name | Owning Module | Cardinality per User | Relationship Strategy | Expected Document Growth | MVP Status |
| :-: | :--- | :--- | :---: | :--- | :--- | :---: |
| 1 | `users` | `AuthModule` | 1-to-1 | Root Core Account Entity | Bounded (1 record per user) | **MVP (Phase A)** |
| 2 | `user_identities` | `AuthModule` | 1-to-few | Referenced (`userId`) | Bounded (1–3 auth methods per user) | **MVP (Phase A)** |
| 3 | `refresh_tokens` | `AuthModule` | 1-to-few | Referenced (`userId`) | Bounded (1–5 active sessions, TTL purged) | **MVP (Phase A)** |
| 4 | `password_reset_tokens` | `AuthModule` | 1-to-few | Referenced (`userId`) | Bounded (Ephemeral, TTL 1 hour) | **MVP (Phase A)** |
| 5 | `user_profiles` | `UsersModule` | 1-to-1 | Referenced (`userId`) | Bounded (1 record per user) | **MVP (Phase A)** |
| 6 | `consent_records` | `UsersModule` | 1-to-few | Referenced (`userId`) | Bounded (1–3 records per user) | **MVP (Phase A)** |
| 7 | `deletion_audit_logs` | `UsersModule` | 1-to-1 | Pseudonymized Ledger | Bounded (1 record per deleted account, TTL 90d) | **MVP (Phase A)** |
| 8 | `nutrition_logs` | `NutritionModule` | 1-to-many | Referenced (`userId`), Embedded Items | Unbounded daily logs; Bounded per-day items | **MVP (Phase B)** |
| 9 | `food_library` | `NutritionModule` | Global / Read-Only | Static Reference Catalog | Bounded (~150–200 curated items) | **MVP (Phase B)** |
| 10 | `workout_sessions` | `WorkoutsModule` | 1-to-many | Referenced (`userId`), Embedded Sets | Unbounded sessions; Bounded sets (10–30) | **MVP (Phase C)** |
| 11 | `exercise_catalog` | `WorkoutsModule` | Global / Read-Only | Static Reference Catalog | Bounded (~100 curated items) | **MVP (Phase C)** |
| 12 | `processed_idempotency_keys` | `WorkoutsModule` | 1-to-many | Referenced (`userId`) | Bounded (TTL purged, $\ge \text{QueueAge}$) | **MVP (Phase C)** |
| 13 | `body_weight_entries` | `ProgressModule` | 1-to-many | Referenced (`userId`) | Unbounded (1 entry per day, historical ledger) | **MVP (Phase D)** |
| 14 | `coach_conversations` | `CoachModule` | 1-to-few | Referenced (`userId`) | Bounded (1–5 active/archived threads) | **MVP (Phase E)** |
| 15 | `coach_messages` | `CoachModule` | 1-to-many | Referenced (`conversationId`) | Unbounded (Separate collection, paginated) | **MVP (Phase E)** |
| 16 | `outbox_events` | `Shared / Cross-Cutting` | System-wide | Transactional Outbox | Ephemeral (Deferred for MVP under ARCH-006) | **Deferred (Phase E)** |

---

## 3. Module-by-Module Detailed Collection Specifications

---

### 3.1 AuthModule Collections

#### 3.1.1 `users`
- **Owning Module**: `AuthModule`
- **Purpose**: Authoritative core user account entity. Tracks account status, email, global token version, and deletion lifecycle. Sensitive credentials and provider linkages are delegated to `user_identities`.
- **Document Structure**:
  ```typescript
  interface IUserDocument {
    _id: Types.ObjectId;
    email: string;                     // Lowercase, trimmed, unique index
    isEmailVerified: boolean;          // Upgraded when Google OAuth links or email is verified
    tokenVersion: number;              // Incremented on global logout or password reset
    status: 'active' | 'pending_deletion' | 'deleting' | 'suspended';
    deletionRequestedAt?: Date;
    schemaVersion: number;             // Default 1
    createdAt: Date;
    updatedAt: Date;
  }
  ```
- **Access Patterns**:
  - `GET by email` on login and identity linking.
  - `GET by _id` during token verification middleware.
  - `UPDATE tokenVersion` on global logout / password reset.
  - `UPDATE status` during account deletion saga ([DB-018](file:///d:/2026/Personal%20Fitness%20&%20AI%20Coach%20Platform/FitMate-AI/docs/architecture/DATABASE_ISSUES.md#L137-L157)).
- **Relationship & Bounding**: Root entity. Strictly bounded (1 document per registered user).
- **Primary & Compound Indexes**:
  - `{ email: 1 }` (Unique, Collation: `{ locale: 'en', strength: 2 }` for case-insensitive matching).
  - `{ status: 1 }` (Sparse, for filtering active vs deleting accounts).

#### 3.1.2 `user_identities` (Confirmed for MVP)
- **Owning Module**: `AuthModule`
- **Purpose**: Authoritative credentials and authentication provider registry. Supports local email/password registration and Google OAuth sign-in in the MVP baseline, preventing credential coupling on the core account.
- **Document Structure**:
  ```typescript
  interface IUserIdentityDocument {
    _id: Types.ObjectId;
    userId: Types.ObjectId;            // Ref: users
    provider: 'local' | 'google' | 'apple';
    providerUserId: string;            // For local: user's email; For google: Google sub ID
    passwordHash?: string;             // Argon2id / bcrypt hash (only for provider: 'local', select: false)
    isPrimary: boolean;                // Indicates primary identity used during registration
    lastAuthenticatedAt?: Date;
    schemaVersion: number;             // Default 1
    createdAt: Date;
    updatedAt: Date;
  }
  ```
- **Access Patterns**:
  - `GET by { provider, providerUserId }` during login (`POST /api/v1/auth/login` and `/oauth`).
  - `GET by { userId, provider }` to verify existing identities before linking.
  - `UPDATE passwordHash` during password reset workflow.
  - `DELETE Many by userId` during account deletion saga.
- **Relationship & Bounding**: 1-to-few per user (typically 1–2 identities: Local + Google). Bounded.
- **Primary & Compound Indexes**:
  - `{ provider: 1, providerUserId: 1 }` (Compound Unique — guarantees one account per third-party provider ID).
  - `{ userId: 1, provider: 1 }` (Compound Unique — ensures a user cannot link multiple accounts from the same provider).
  - *Audit Note ([DB-014](file:///d:/2026/Personal%20Fitness%20&%20AI%20Coach%20Platform/FitMate-AI/docs/architecture/DATABASE_ISSUES.md#L72-L92))*: A standalone index on `{ userId: 1 }` is redundant because `{ userId: 1, provider: 1 }` provides left-prefix coverage.

#### 3.1.3 `refresh_tokens`
- **Owning Module**: `AuthModule`
- **Purpose**: Persists revocable refresh token records for active mobile sessions. Supports token rotation, reuse detection ([ARCH-003](file:///d:/2026/Personal%20Fitness%20&%20AI%20Coach%20Platform/FitMate-AI/docs/architecture/ARCHITECTURE_DECISION_RECORDS.md#L614)), and race-condition grace periods ([DB-022](file:///d:/2026/Personal%20Fitness%20&%20AI%20Coach%20Platform/FitMate-AI/docs/architecture/DATABASE_ISSUES.md#L182-L196)).
- **Document Structure**:
  ```typescript
  interface IRefreshTokenDocument {
    _id: Types.ObjectId;
    userId: Types.ObjectId;            // Ref: users
    hashedToken: string;               // SHA-256 one-way hash of raw random token
    tokenFamily: string;               // UUID v4 identifying session lineage
    replacedByTokenHash?: string;      // Token hash that superseded this token
    isRevoked: boolean;                // Default false
    revokedAt?: Date;
    revocationReason?: 'logout' | 'rotation' | 'reuse_detected' | 'password_reset' | 'account_deletion';
    expiresAt: Date;                   // 30 days from creation
    truncatedUserAgent: string;        // Max 100 chars, no PII
    ipHash: string;                    // SHA-256 hash of IP (NFR-SEC-006)
    createdAt: Date;
    updatedAt: Date;
  }
  ```
- **Access Patterns**:
  - `GET by hashedToken` on `POST /api/v1/auth/refresh` (enforcing `expiresAt > now` per [DB-023](file:///d:/2026/Personal%20Fitness%20&%20AI%20Coach%20Platform/FitMate-AI/docs/architecture/DATABASE_ISSUES.md#L198-L210)).
  - `UPDATE isRevoked = true` on single device logout or token rotation.
  - `UPDATE Many by userId` on global logout (`revokeAllSessions`).
- **Relationship & Bounding**: 1-to-few per user (typically 1–3 active devices). Automatic purge via MongoDB TTL index.
- **Primary & Compound Indexes**:
  - `{ hashedToken: 1 }` (Unique).
  - `{ userId: 1, isRevoked: 1 }` (Rapid session revocation; left-covers `{ userId: 1 }` per [DB-014](file:///d:/2026/Personal%20Fitness%20&%20AI%20Coach%20Platform/FitMate-AI/docs/architecture/DATABASE_ISSUES.md#L72-L92)).
  - `{ expiresAt: 1 }` (TTL index: `expireAfterSeconds: 0`).

#### 3.1.4 `password_reset_tokens`
- **Owning Module**: `AuthModule`
- **Purpose**: Single-use cryptographic tokens for password reset workflows.
- **Document Structure**:
  ```typescript
  interface IPasswordResetTokenDocument {
    _id: Types.ObjectId;
    userId: Types.ObjectId;            // Ref: users
    hashedToken: string;               // SHA-256 hash of single-use token
    expiresAt: Date;                   // 1 hour lifespan
    usedAt?: Date;
    createdAt: Date;
    updatedAt: Date;
  }
  ```
- **Access Patterns**:
  - `GET by hashedToken` on password reset submission (with `expiresAt > now` and `usedAt === null`).
- **Relationship & Bounding**: Ephemeral. 1-to-few. Purged automatically via TTL index.
- **Primary & Compound Indexes**:
  - `{ hashedToken: 1 }` (Unique).
  - `{ userId: 1 }`.
  - `{ expiresAt: 1 }` (TTL index: `expireAfterSeconds: 0`).

---

### 3.2 UsersModule Collections

#### 3.2.1 `user_profiles`
- **Owning Module**: `UsersModule`
- **Purpose**: Manages user physical traits, fitness goals, training background, calculated baseline targets, and cached current weight snapshot ([ADR-013](file:///d:/2026/Personal%20Fitness%20&%20AI%20Coach%20Platform/FitMate-AI/docs/architecture/ARCHITECTURE_DECISION_RECORDS.md#L559-L605)).
- **Document Structure**:
  ```typescript
  interface IUserProfileDocument {
    _id: Types.ObjectId;
    userId: Types.ObjectId;            // Ref: users (Unique 1-to-1)
    goal: 'fat_loss' | 'muscle_gain' | 'recomposition' | 'maintenance' | 'general_fitness' | 'undecided';
    biologicalSex: 'male' | 'female' | 'prefer_not_to_say';
    birthDate: Date;
    heightCm: number;                  // Canonical SI metric, float64 rounded to 1 decimal (DB-016)
    weightKg: number;                  // Operational cached snapshot, float64 rounded to 2 decimals (DB-016)
    weightUpdatedAt: Date;             // Timestamp guard against stale event overwrites
    activityMultiplier: number;        // 1.2, 1.375, 1.55, 1.725, 1.9
    trainingExperience: 'beginner' | 'intermediate' | 'advanced';
    preferredLanguage: 'en' | 'ar';
    unitSystem: 'metric' | 'imperial';
    dailyCalorieTarget: number;        // Calculated Mifflin-St Jeor target (integer, DB-016)
    proteinTargetGrams: number;        // Float64 rounded to 1 decimal
    carbsTargetGrams: number;          // Float64 rounded to 1 decimal
    fatTargetGrams: number;            // Float64 rounded to 1 decimal
    isTargetsCustomized: boolean;      // Default false
    targetsCalculatedAt: Date;         // Tracks formula recalculation (DB-019)
    schemaVersion: number;             // Default 1
    createdAt: Date;
    updatedAt: Date;
  }
  ```
- **Access Patterns**:
  - `GET by userId` for profile view (`SCR-021`), Coach context injection, and nutrition diary budget rendering.
  - `UPDATE by userId` on profile edit or onboarding completion.
  - `UPDATE weightKg, weightUpdatedAt` on authoritative weigh-in sync.
- **Relationship & Bounding**: Strict 1-to-1 with `userId`. Exactly 1 document per user. Bounded (~1.2KB).
- **Primary & Compound Indexes**:
  - `{ userId: 1 }` (Unique).

#### 3.2.2 `consent_records`
- **Owning Module**: `UsersModule`
- **Purpose**: Statutory audit registry documenting user acceptance of health disclaimers and terms of service. Separates active `userId` from `pseudonymizedUserId` per [DB-013](file:///d:/2026/Personal%20Fitness%20&%20AI%20Coach%20Platform/FitMate-AI/docs/architecture/DATABASE_ISSUES.md#L72-L92).
- **Document Structure**:
  ```typescript
  interface IConsentRecordDocument {
    _id: Types.ObjectId;
    userId: Types.ObjectId | null;     // Set to null upon deletion
    pseudonymizedUserId?: string;      // Populated strictly during deletion saga (DB-013)
    status: 'active' | 'pseudonymized';// Status flag
    consentType: 'health_disclaimer' | 'terms_of_service' | 'privacy_policy';
    hasAccepted: boolean;              // Must be true
    disclaimerVersion: string;         // e.g. '1.0.0'
    acceptedAt: Date;
    ipHash: string;                    // SHA-256 hash of IP at consent time
    userAgentTruncated: string;
    pseudonymizedAt?: Date;
    schemaVersion: number;
    createdAt: Date;
    updatedAt: Date;
  }
  ```
- **Access Patterns**:
  - `INSERT` within atomic registration transaction ([ADR-006](file:///d:/2026/Personal%20Fitness%20&%20AI%20Coach%20Platform/FitMate-AI/docs/architecture/ARCHITECTURE_DECISION_RECORDS.md#L23)).
  - `UPDATE userId = null, pseudonymizedUserId = HMAC, status = 'pseudonymized'` on account deletion saga.
- **Relationship & Bounding**: 1-to-few per user (1–3 records). Bounded.
- **Primary & Compound Indexes**:
  - `{ userId: 1, consentType: 1 }` (Sparse, covering active consents).
  - `{ pseudonymizedUserId: 1 }` (Sparse, for regulatory lookup).

#### 3.2.3 `deletion_audit_logs`
- **Owning Module**: `UsersModule`
- **Purpose**: Cryptographic audit record verifying completed account deletion for GDPR/regulatory defense without storing personal data ([DB-018](file:///d:/2026/Personal%20Fitness%20&%20AI%20Coach%20Platform/FitMate-AI/docs/architecture/DATABASE_ISSUES.md#L137-L157)).
- **Document Structure**:
  ```typescript
  interface IDeletionAuditLogDocument {
    _id: Types.ObjectId;
    pseudonymizedUserId: string;       // HMAC-SHA256(userId, serverSecret)
    status: 'pending' | 'in_progress' | 'completed' | 'failed_retry';
    completedSteps: string[];          // e.g. ['auth_revoked', 'workouts_purged', 'nutrition_purged', 'consent_pseudonymized']
    failedStep?: string;
    errorDetails?: string;
    requestedAt: Date;
    completedAt?: Date;
    expiresAt: Date;                   // 90-day retention window
    createdAt: Date;
    updatedAt: Date;
  }
  ```
- **Access Patterns**:
  - `INSERT / UPDATE` during deletion saga.
  - `GET by status = 'failed_retry'` by background recovery worker.
- **Relationship & Bounding**: 1 record per deletion request. Automatically pruned via TTL index after 90 days.
- **Primary & Compound Indexes**:
  - `{ pseudonymizedUserId: 1 }`.
  - `{ status: 1, requestedAt: 1 }`.
  - `{ expiresAt: 1 }` (TTL index: `expireAfterSeconds: 0`).

---

### 3.3 NutritionModule Collections

#### 3.3.1 `nutrition_logs`
- **Owning Module**: `NutritionModule`
- **Purpose**: Daily nutritional diary partitioned into four standard meal slots (`breakfast`, `lunch`, `dinner`, `snack`). Supports curated food logging and manual Quick Add without separate custom food tables ([DEC-010](file:///d:/2026/Personal%20Fitness%20&%20AI%20Coach%20Platform/FitMate-AI/docs/product/OPEN_QUESTIONS.md)). Disambiguates estimation flags per [DB-012](file:///d:/2026/Personal%20Fitness%20&%20AI%20Coach%20Platform/FitMate-AI/docs/architecture/DATABASE_ISSUES.md#L45-L70).
- **Document Structure**:
  ```typescript
  interface INutritionLogItem {
    itemId: string;                    // UUID v4
    foodId?: Types.ObjectId;           // Ref: food_library (null if Quick Add)
    name: string;                      // Display name snapshot
    servingQuantity: number;           // e.g. 1.5
    servingUnit: string;               // e.g. 'portion', 'g'
    servingWeightGrams: number;        // Canonical weight in grams
    calories: number;
    proteinGrams: number;
    carbsGrams: number;
    fatGrams: number;
    isQuickAdd: boolean;
    isEstimated: boolean;              // Disambiguated per DB-012
    loggedAt: Date;
  }

  interface IMealSlot {
    slotName: 'breakfast' | 'lunch' | 'dinner' | 'snack';
    slotTotalCalories: number;
    slotTotalProtein: number;
    slotTotalCarbs: number;
    slotTotalFat: number;
    items: INutritionLogItem[];
  }

  interface INutritionLogDocument {
    _id: Types.ObjectId;
    userId: Types.ObjectId;            // Ref: users
    date: string;                      // YYYY-MM-DD canonical local date (DB-017)
    timezoneOffsetMinutes: number;     // e.g. -120 for UTC+2 (DB-017)
    slots: {
      breakfast: IMealSlot;
      lunch: IMealSlot;
      dinner: IMealSlot;
      snack: IMealSlot;
    };
    dailyTotalCalories: number;
    dailyTotalProtein: number;
    dailyTotalCarbs: number;
    dailyTotalFat: number;
    isEstimated: boolean;              // Always true for daily totals (Core Invariant 2)
    schemaVersion: number;             // Default 1
    createdAt: Date;
    updatedAt: Date;
  }
  ```
- **Access Patterns**:
  - `GET by { userId, date }` on Diary Screen (`SCR-009`, `SCR-010`).
  - `UPDATE (push item, increment totals)` on `POST /api/v1/nutrition/meals/quick-add` or `/item`.
  - `UPDATE (pull item, decrement totals)` on `DELETE /api/v1/nutrition/meals/:logId/items/:itemId`.
- **Relationship & Bounding**:
  - **1 document per user per day**.
  - **Embedded slots and items**: A typical user logs 3–15 items across 4 slots per day. Document size remains strictly under 15–30 KB, well within MongoDB's 16MB boundary.
- **Primary & Compound Indexes**:
  - `{ userId: 1, date: 1 }` (Compound Unique — guarantees exactly one diary document per day).
  - `{ userId: 1, date: -1 }` (ESR index for historical date range queries).

#### 3.3.2 `food_library`
- **Owning Module**: `NutritionModule`
- **Purpose**: Curated baseline dataset of verified common and regional Middle Eastern foods (~150–200 items), seeded from backend JSON with `catalogVersion` ([ADR-012](file:///d:/2026/Personal%20Fitness%20&%20AI%20Coach%20Platform/FitMate-AI/docs/architecture/ARCHITECTURE_DECISION_RECORDS.md#L521-L557)). Read-only at runtime in MVP.
- **Document Structure**:
  ```typescript
  interface IFoodLibraryDocument {
    _id: Types.ObjectId;
    catalogId: string;                 // e.g. 'food_001'
    catalogVersion: string;            // e.g. '1.0.0'
    nameEn: string;
    nameAr: string;
    category: 'protein' | 'carbohydrate' | 'fat' | 'dairy' | 'fruit' | 'vegetable' | 'beverage' | 'snack' | 'middle_eastern' | 'composite';
    servingSizeGrams: number;          // Reference portion (e.g. 100g)
    servingUnitNameEn: string;         // e.g. 'piece', 'medium cup', 'gram'
    servingUnitNameAr: string;         // e.g. 'قطعة', 'كوب متوسط', 'جرام'
    caloriesPer100g: number;
    proteinPer100g: number;
    carbsPer100g: number;
    fatPer100g: number;
    isVerified: boolean;               // Always true for curated seed (DB-012)
    isEstimated: boolean;              // False for lab-verified per-100g reference values (DB-012)
    isArchived: boolean;               // Default false
    schemaVersion: number;
    createdAt: Date;
    updatedAt: Date;
  }
  ```
- **Access Patterns**:
  - `GET by catalogId` or `_id` on logging food item.
  - `GET text search` (or bundled local search on client).
- **Relationship & Bounding**: Global shared catalog. Fixed size (~150–200 documents).
- **Primary & Compound Indexes**:
  - `{ catalogId: 1 }` (Unique).
  - `{ catalogVersion: 1 }`.
  - `{ nameEn: 'text', nameAr: 'text' }` (Text index for server-side fallback search).

---

### 3.4 WorkoutsModule Collections

#### 3.4.1 `workout_sessions`
- **Owning Module**: `WorkoutsModule`
- **Purpose**: Historical log of completed workout sessions, containing exercise names, completed sets, weights, reps, and calculated volume.
- **Document Structure**:
  ```typescript
  interface IWorkoutSetLog {
    setNumber: number;
    weightKg: number;                  // Canonical SI metric (2 decimals, DB-016)
    reps: number;
    rpe?: number;                      // Rate of Perceived Exertion (1-10)
    isCompleted: boolean;              // Checkmark status
    completedAt?: Date;
  }

  interface IWorkoutExerciseLog {
    exerciseId: Types.ObjectId;        // Ref: exercise_catalog
    exerciseNameSnapshotEn: string;    // Historical snapshot
    exerciseNameSnapshotAr: string;
    orderIndex: number;
    notes?: string;
    sets: IWorkoutSetLog[];
  }

  interface IWorkoutSessionDocument {
    _id: Types.ObjectId;
    userId: Types.ObjectId;            // Ref: users
    clientSessionUuid: string;         // Client-generated UUID v4 for deduplication
    name: string;                      // e.g. 'Upper Body Strength'
    startedAt: Date;
    completedAt: Date;
    durationSeconds: number;
    totalVolumeKg: number;             // Sum of (weightKg * reps) for completed sets (DB-016)
    totalSetsCompleted: number;
    exercises: IWorkoutExerciseLog[];
    schemaVersion: number;             // Default 1
    createdAt: Date;
    updatedAt: Date;
  }
  ```
- **Access Patterns**:
  - `GET by userId, completedAt` (Sorted descending) for workout history list and calendar markers.
  - `GET by _id` for session review modal (`SCR-020`).
  - `INSERT` on session completion (`POST /api/v1/workouts/sessions` or sync).
- **Relationship & Bounding**:
  - **1-to-many referenced by `userId`**.
  - **Embedded sets within session**: A standard gym workout contains 4–8 exercises with 3–5 sets each. Total document size is 5–15 KB, strictly bounded.
- **Primary & Compound Indexes**:
  - `{ userId: 1, completedAt: -1 }` (ESR rule: Equality on `userId`, Sort on `completedAt`; prefix-covers `{ userId: 1 }` per [DB-014](file:///d:/2026/Personal%20Fitness%20&%20AI%20Coach%20Platform/FitMate-AI/docs/architecture/DATABASE_ISSUES.md#L72-L92)).
  - `{ userId: 1, clientSessionUuid: 1 }` (Unique compound index to prevent duplicate saves).

#### 3.4.2 `exercise_catalog`
- **Owning Module**: `WorkoutsModule`
- **Purpose**: Curated baseline catalog of gym movements (~100 exercises) with muscle group classifications and bilingual execution cues.
- **Document Structure**:
  ```typescript
  interface IExerciseCatalogDocument {
    _id: Types.ObjectId;
    catalogId: string;                 // e.g. 'ex_001'
    catalogVersion: string;            // e.g. '1.0.0'
    nameEn: string;
    nameAr: string;
    targetMuscleGroup: 'chest' | 'back' | 'shoulders' | 'quadriceps' | 'hamstrings' | 'calves' | 'biceps' | 'triceps' | 'core' | 'full_body';
    secondaryMuscleGroups: string[];
    equipment: 'barbell' | 'dumbbell' | 'cable' | 'machine' | 'bodyweight' | 'bands' | 'kettlebell' | 'none';
    movementPattern: 'push' | 'pull' | 'hinge' | 'squat' | 'lunge' | 'carry' | 'isolation';
    instructionsEn: string;
    instructionsAr: string;
    isArchived: boolean;               // Default false
    schemaVersion: number;
    createdAt: Date;
    updatedAt: Date;
  }
  ```
- **Access Patterns**:
  - `GET by targetMuscleGroup, equipment` for catalog browsing.
  - `GET by _id` for exercise detail display.
- **Relationship & Bounding**: Global shared catalog. Fixed size (~100 documents).
- **Primary & Compound Indexes**:
  - `{ catalogId: 1 }` (Unique).
  - `{ targetMuscleGroup: 1, equipment: 1 }`.
  - `{ nameEn: 'text', nameAr: 'text' }` (Text search index).

#### 3.4.3 `processed_idempotency_keys`
- **Owning Module**: `WorkoutsModule`
- **Purpose**: Deduplicates offline workout mutations and network retries using client-provided idempotency keys ([ADR-007](file:///d:/2026/Personal%20Fitness%20&%20AI%20Coach%20Platform/FitMate-AI/docs/architecture/ARCHITECTURE_DECISION_RECORDS.md#L24)). Replaces redundant backend sync queues.
- **Document Structure**:
  ```typescript
  interface IProcessedIdempotencyKeyDocument {
    _id: Types.ObjectId;
    userId: Types.ObjectId;            // Ref: users
    idempotencyKey: string;            // Client-provided header UUID
    requestMethod: string;             // e.g. 'POST'
    requestPath: string;               // e.g. '/api/v1/workouts/sync'
    requestPayloadHash: string;        // SHA-256 of raw body (detects payload tampering)
    resourceId?: Types.ObjectId;       // ID of created workout_session
    statusCode: number;                // e.g. 200, 201
    responseHeaders?: Record<string, string>;
    responseBody: any;                 // Cached JSON response snapshot
    createdAt: Date;                   // Governed by TTL index
  }
  ```
- **Access Patterns**:
  - `GET by { userId, idempotencyKey }` prior to executing workout sync.
  - `INSERT` within transaction alongside session creation.
- **Relationship & Bounding**: Ephemeral log. Automatically pruned via MongoDB TTL index ($30\text{ days} = 2,592,000\text{ seconds}$).
- **Primary & Compound Indexes**:
  - `{ userId: 1, idempotencyKey: 1 }` (Compound Unique).
  - `{ createdAt: 1 }` (TTL index: `expireAfterSeconds: 2592000`).

---

### 3.5 ProgressModule Collections

#### 3.5.1 `body_weight_entries`
- **Owning Module**: `ProgressModule`
- **Purpose**: Sole authoritative historical time-series ledger of user body weight measurements. Drives 7-day moving averages and trendline analytics ([ADR-013](file:///d:/2026/Personal%20Fitness%20&%20AI%20Coach%20Platform/FitMate-AI/docs/architecture/ARCHITECTURE_DECISION_RECORDS.md#L559-L605)).
- **Document Structure**:
  ```typescript
  interface IBodyWeightEntryDocument {
    _id: Types.ObjectId;
    userId: Types.ObjectId;            // Ref: users
    date: string;                      // YYYY-MM-DD canonical format
    weightKg: number;                  // Canonical SI metric (float64, 2 decimals, DB-016)
    note?: string;                     // Optional note (max 200 chars)
    source: 'progress_screen' | 'profile_screen' | 'onboarding'; // Audit trail
    schemaVersion: number;             // Default 1
    createdAt: Date;
    updatedAt: Date;
  }
  ```
- **Access Patterns**:
  - `GET by { userId, date: { $gte, $lte } }` sorted by `date ASC` for chart rendering (`SCR-020`).
  - `GET by userId` sorted by `date DESC` limit 1 for latest weigh-in recovery.
  - `INSERT / UPSERT` on weigh-in submission.
- **Relationship & Bounding**:
  - **1-to-many referenced by `userId`**.
  - **Single weigh-in per day**: At most 365 documents per user per year. Highly efficient time-series ledger.
- **Primary & Compound Indexes**:
  - `{ userId: 1, date: 1 }` (Compound Unique — enforces at most one authoritative entry per date; repeat logs update the day's record).
  - `{ userId: 1, date: -1 }` (ESR index for latest weigh-in and moving average windows; prefix-covers `{ userId: 1 }` per [DB-014](file:///d:/2026/Personal%20Fitness%20&%20AI%20Coach%20Platform/FitMate-AI/docs/architecture/DATABASE_ISSUES.md#L72-L92)).

---

### 3.6 CoachModule Collections

#### 3.6.1 `coach_conversations`
- **Owning Module**: `CoachModule`
- **Purpose**: Conversation session header tracking conversation titles, active status, and message counters.
- **Document Structure**:
  ```typescript
  interface ICoachConversationDocument {
    _id: Types.ObjectId;
    userId: Types.ObjectId;            // Ref: users
    title: string;                     // e.g. 'Guidance on Calorie Deficit'
    status: 'active' | 'archived';
    startedAt: Date;
    lastMessageAt: Date;
    messageCount: number;
    schemaVersion: number;             // Default 1
    createdAt: Date;
    updatedAt: Date;
  }
  ```
- **Access Patterns**:
  - `GET by { userId, status: 'active' }` sorted by `lastMessageAt DESC`.
  - `UPDATE lastMessageAt, messageCount` on new message exchange.
- **Relationship & Bounding**: 1-to-few per user (1–5 threads). Bounded.
- **Primary & Compound Indexes**:
  - `{ userId: 1, lastMessageAt: -1 }`.

#### 3.6.2 `coach_messages`
- **Owning Module**: `CoachModule`
- **Purpose**: Authoritative log of individual chat exchanges between user and assistant. Stores buffered, safety-validated responses and refusal/fallback indicators ([ADR-009](file:///d:/2026/Personal%20Fitness%20&%20AI%20Coach%20Platform/FitMate-AI/docs/architecture/ARCHITECTURE_DECISION_RECORDS.md#L26)).
- **Document Structure**:
  ```typescript
  interface ICoachMessageDocument {
    _id: Types.ObjectId;
    conversationId: Types.ObjectId;    // Ref: coach_conversations
    userId: Types.ObjectId;            // Ref: users (for rapid rate limiting)
    sender: 'user' | 'assistant';
    content: string;                   // Validated safe content (max 4,000 chars)
    isRefusal: boolean;                // True if guardrail triggered refusal
    refusalReason?: 'medical_diagnosis' | 'acute_pain' | 'prescription' | 'crash_dieting' | 'general_safety';
    isFallback: boolean;               // True if LLM error fallback occurred
    promptTokens?: number;
    completionTokens?: number;
    schemaVersion: number;             // Default 1
    createdAt: Date;
  }
  ```
- **Access Patterns**:
  - `GET by conversationId` sorted by `createdAt ASC` with cursor pagination (`limit: 20`).
  - `COUNT by { userId, createdAt: { $gte: oneHourAgo } }` for hourly rate limit check (20 msgs/hr, [DB-020](file:///d:/2026/Personal%20Fitness%20&%20AI%20Coach%20Platform/FitMate-AI/docs/architecture/DATABASE_ISSUES.md#L169-L180)).
- **Relationship & Bounding**:
  - **Modeled as a separate referenced collection**, NOT an embedded array inside `coach_conversations`. This completely protects against the 16MB BSON limit over extended chat histories.
- **Primary & Compound Indexes**:
  - `{ conversationId: 1, createdAt: 1 }` (ESR for chronological chat transcript rendering).
  - `{ userId: 1, createdAt: -1 }` (Compound index for 20 msgs/hour rate limit enforcement).

---

### 3.7 Shared / Cross-Cutting Collections

#### 3.7.1 `outbox_events` (Deferred for MVP under ARCH-006)
- **Owning Module**: `Shared / Infrastructure`
- **Purpose**: Transactional Outbox pattern for asynchronous domain event delivery. Preserved in architectural design but **deferred for MVP delivery** in favor of In-Process Event Bus with snapshot rebuild fallback.
- **Status**: **DEFERRED (Phase E)**.

---

## 4. Confirmed Architectural Decisions & Trade-Offs

1. **Separation of `users` and `user_identities` (Confirmed for MVP)**:
   - Google Login is an explicit MVP requirement alongside Local Email/Password.
   - Separating `users` (account lifecycle, status, email) from `user_identities` (provider, credentials, OAuth sub IDs) provides clean identity decoupling.
   - **Atomic Registration Transaction**: Registration executes across 5 collections (`users`, `user_identities`, `refresh_tokens`, `user_profiles`, `consent_records`) in an atomic MongoDB `ClientSession` transaction.
2. **Rejection of Backend `workout_sync_operations` (Confirmed)**:
   - The offline mutation queue belongs strictly on the mobile client device.
   - The combination of `workout_sessions` and `processed_idempotency_keys` handles idempotent sync with zero backend write amplification.
3. **Deferral of `outbox_events` (Confirmed)**:
   - An In-Process Event Bus with timestamp protection (`recordedAt >= weightUpdatedAt`) and deterministic fallback (`usersService.rebuildWeightSnapshotFromLedger`) fulfills MVP requirements without running a persistent Outbox poller.
4. **Account Deletion Saga State Machine (Confirmed)**:
   - Operational state is managed on `users.status` (`'pending_deletion'`, `'deleting'`, `'failed_retry'`).
   - Crash recovery is executed by a scheduled reconciliation worker.
   - Final audit proof is persisted in `deletion_audit_logs` using keyed `HMAC-SHA256` pseudonymization.

---

## 5. Storage Estimates & Index Sizing for MVP Baseline (10k Users / 180 Days)

| Collection Name | Est. Documents | Avg. Doc Size | Est. Data Size | Est. Index Size | Total Storage |
| :--- | :---: | :---: | :---: | :---: | :---: |
| `users` | 10,000 | 400 B | 4 MB | 1 MB | 5 MB |
| `user_identities` (Local + Google) | 12,000 | 500 B | 6 MB | 1.5 MB | 7.5 MB |
| `refresh_tokens` (TTL active) | 15,000 | 600 B | 9 MB | 2 MB | 11 MB |
| `password_reset_tokens` (TTL) | 500 | 300 B | 0.15 MB | 0.1 MB | 0.25 MB |
| `user_profiles` | 10,000 | 1.2 KB | 12 MB | 1 MB | 13 MB |
| `consent_records` | 20,000 | 400 B | 8 MB | 1.5 MB | 9.5 MB |
| `deletion_audit_logs` (TTL 90d) | 500 | 800 B | 0.4 MB | 0.2 MB | 0.6 MB |
| `nutrition_logs` (180 days) | 1,800,000 | 12 KB | 21.6 GB | 180 MB | 21.8 GB |
| `food_library` (Static Seed) | 200 | 1 KB | 0.2 MB | 0.1 MB | 0.3 MB |
| `workout_sessions` (3/wk x 26 wks) | 780,000 | 8 KB | 6.24 GB | 90 MB | 6.33 GB |
| `exercise_catalog` (Static Seed) | 100 | 1.5 KB | 0.15 MB | 0.1 MB | 0.25 MB |
| `processed_idempotency_keys` (TTL 30d) | 130,000 | 1.5 KB | 195 MB | 25 MB | 220 MB |
| `body_weight_entries` (180 days) | 1,800,000 | 300 B | 540 MB | 160 MB | 700 MB |
| `coach_conversations` | 30,000 | 500 B | 15 MB | 3 MB | 18 MB |
| `coach_messages` (Paginated) | 600,000 | 1 KB | 600 MB | 85 MB | 685 MB |
| **Total Projected Footprint** | **~5.18 Million** | — | **~29.2 GB** | **~550.4 MB** | **~29.8 GB** |

---

## 6. Next Steps in Phase 3.2

1. **Step 3**: Detailed Mongoose Schema Definitions (`DATABASE_SCHEMA.md`), starting with AuthModule.
2. **Step 4**: Complete ESR Index Optimization & Query Performance Analysis (`DATABASE_INDEXES.md`).
3. **Step 5**: Entity-Relationship Strategy & Mermaid Diagram (`DATABASE_RELATIONSHIPS.md`).
4. **Step 6**: Database Risk Register, Edge Cases & Migration Plan (`DATABASE_ISSUES.md`).
