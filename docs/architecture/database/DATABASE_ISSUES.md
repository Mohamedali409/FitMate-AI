# FitMate AI — Database Issues & Schema Decisions Register

**Document Version:** 1.2.0  
**Phase:** 3.2 — Database Schema Design  
**Status:** PROPOSED / ACTIVE TRACKING  
**Last Updated:** 2026-11-02  
**Owning Architecture:** Backend Engineering & MongoDB Data Modeling  
**Author:** Antigravity Senior Backend Architect & MongoDB Database Designer  

---

## 1. Document Overview & Change Log

This document is the authoritative register for all database architectural issues, schema design questions, edge cases, and concurrency protocols in FitMate AI.

### Change History & Version 1.2.0 Summary:
- **v1.0.0 (2026-11-02)**: Initial baseline register (`DB-012` through `DB-023`).
- **v1.1.0 (2026-11-02)**: Added AuthModule review topics.
- **v1.2.0 (2026-11-02)**:
  - **Preserved Issue ID Traceability**: Restored the original, previously established issues `DB-024` through `DB-032` (Idempotency payload hashing, MVP OAuth scope, onboarding optionality, session lifecycle, timestamp exceptions, append-only consent, atomic Coach rate limiting, storage assumptions, and replica set prerequisites).
  - **Reassigned Conflicting v1.1.0 IDs**: Migrated the 8 AuthModule review topics to `DB-033` through `DB-040` with an explicit Migration & Mapping Table.
  - **Status Policy Realignment**: Strictly applied status criteria (`OPEN`, `PROPOSED`, `PARTIALLY_RESOLVED`, `RESOLVED`). Demoted candidate solutions to `PROPOSED` or `OPEN` where technical gaps or unverified runtime behaviors remain.
  - **Reassessed Critical Issues**:
    - `DB-018` (Account Deletion Recovery): Changed to `OPEN`. Specified durable saga state, per-module step ledger, worker lease/claim locks, crash recovery, and external storage purges.
    - `DB-022` / `DB-036` / `DB-037` (Refresh Token Rotation): Specified AES-256-GCM recovery encryption with external KMS secret, IV uniqueness, auth tag verification, write-conflict retry loops, and explicit security limitations of grace periods.
    - `DB-040` (TokenVersion Enforcement): Changed to `OPEN`. Documented MongoDB authoritative source, multi-instance cache consistency, fail-closed policies, and bounded invalidation delays.
    - `DB-016` (Numeric Precision): Changed to `PARTIALLY_RESOLVED`. Separated calculation, persistence, serialization, and display precision tiers, explaining IEEE 754 float64 boundaries.
    - `DB-012` (Nutrition Estimation Semantics): Kept `OPEN`. Reconciled Core Invariant 2 with verified catalog source data vs calculated meal logs.
    - `DB-021` (Google OAuth Validation): Changed to `PROPOSED`. Specified full token verification (signature, issuer, audience, expiration, stable `sub`).
    - `DB-038` (Email Synchronization): Changed to `PROPOSED`. Clarified that Google identities use immutable `sub` (not email), and specified email change re-authentication.

---

## 2. Issue ID Migration & Mapping Table (v1.1.0 $\longrightarrow$ v1.2.0)

To resolve ID conflicts introduced in v1.1.0 while preserving 100% historical traceability, the following mapping is established:

| Issue Topic / Scope | Original Review ID | Conflicting v1.1.0 ID | Authoritative v1.2.0 ID | Status in v1.2.0 |
| :--- | :---: | :---: | :---: | :---: |
| Idempotency Canonical Payload Hashing & Request Replay | **DB-024** | — | **DB-024** | **OPEN** |
| MVP Identity Provider Scope (Local & Google; Apple Deferred) | **DB-025** | — | **DB-025** | **PROPOSED** |
| Incomplete Onboarding & Profile Optionality Lifecycle | **DB-026** | — | **DB-026** | **PROPOSED** |
| Workout Session Lifecycle (Active vs Completed Sessions) | **DB-027** | — | **DB-027** | **RESOLVED** |
| Schema Versioning & Timestamp Exceptions across Models | **DB-028** | — | **DB-028** | **RESOLVED** |
| Append-Only Consent History & Statutory Retention | **DB-029** | — | **DB-029** | **OPEN** |
| Atomic Coach Hourly Rate Limiting | **DB-030** | — | **DB-030** | **OPEN** |
| Storage Estimate Assumptions & Document Growth Modeling | **DB-031** | — | **DB-031** | **RESOLVED** |
| Cross-Module Transaction Boundaries & Replica Set Prerequisites | **DB-032** | — | **DB-032** | **OPEN** |
| Duplicate Email Index Declarations in `users` | — | DB-024 (v1.1.0) | **DB-033** | **PROPOSED** |
| Conditional Password Validation for Document & Query Contexts | — | DB-025 (v1.1.0) | **DB-034** | **PROPOSED** |
| Single Primary Identity Invariant Enforcement | — | DB-026 (v1.1.0) | **DB-035** | **PROPOSED** |
| Refresh Token Grace Period & Plaintext Successor Recovery | — | DB-027 (v1.1.0) | **DB-036** | **PROPOSED** |
| Concurrent Refresh Token Rotation & Atomic Write Locks | — | DB-028 (v1.1.0) | **DB-037** | **OPEN** |
| Atomic Email Synchronization Across Account & Local Identity | — | DB-029 (v1.1.0) | **DB-038** | **PROPOSED** |
| Atomic Password Reset Consumption & Session Invalidation | — | DB-030 (v1.1.0) | **DB-039** | **PROPOSED** |
| TokenVersion Enforcement & Request Caching Architecture | — | DB-031 (v1.1.0) | **DB-040** | **OPEN** |

---

## 3. Master Issues Matrix

| Issue ID | Topic | Module(s) Affected | Severity | Current Status | Primary Architectural Trace |
| :--- | :--- | :--- | :---: | :---: | :--- |
| **DB-012** | Nutrition Estimation Semantics (`isEstimated`) | `NutritionModule` | Medium | **OPEN** | [Core Invariant 2](file:///d:/2026/Personal%20Fitness%20&%20AI%20Coach%20Platform/FitMate-AI/.agents/AGENTS.md#L25-L35), [FR-NUTR-006](file:///d:/2026/Personal%20Fitness%20&%20AI%20Coach%20Platform/FitMate-AI/docs/architecture/MODULE_BOUNDARIES.md#L253) |
| **DB-013** | Consent Record Identity Separation | `UsersModule` | High | **RESOLVED** | [MODULE_BOUNDARIES.md §2.2](file:///d:/2026/Personal%20Fitness%20&%20AI%20Coach%20Platform/FitMate-AI/docs/architecture/MODULE_BOUNDARIES.md#L135) |
| **DB-014** | Redundant Compound Indexes & Prefix Audit | All Modules | High | **RESOLVED** | [DATABASE_SCHEMA.md §4](file:///d:/2026/Personal%20Fitness%20&%20AI%20Coach%20Platform/FitMate-AI/docs/architecture/DATABASE_SCHEMA.md#L895-L915) |
| **DB-015** | Universal Schema Versioning & Timestamps Policy | All Modules | Medium | **RESOLVED** | [DATABASE_SCHEMA.md §1](file:///d:/2026/Personal%20Fitness%20&%20AI%20Coach%20Platform/FitMate-AI/docs/architecture/DATABASE_SCHEMA.md#L15-L35) |
| **DB-016** | Multi-Tier Numeric Precision & IEEE 754 Float64 | `Users`, `Workouts`, `Nutrition`, `Progress` | High | **PARTIALLY_RESOLVED** | [ADR-010](file:///d:/2026/Personal%20Fitness%20&%20AI%20Coach%20Platform/FitMate-AI/docs/architecture/ARCHITECTURE_DECISION_RECORDS.md#L450-L498) |
| **DB-017** | Nutrition Diary Date & Timezone Semantics | `NutritionModule` | High | **OPEN** | [COLLECTION_INVENTORY.md §3.3.1](file:///d:/2026/Personal%20Fitness%20&%20AI%20Coach%20Platform/FitMate-AI/docs/architecture/COLLECTION_INVENTORY.md#L205-L235) |
| **DB-018** | Durable Account Deletion Saga & Crash Recovery | `Users`, `Auth`, All | High | **OPEN** | [MODULE_BOUNDARIES.md §3.6](file:///d:/2026/Personal%20Fitness%20&%20AI%20Coach%20Platform/FitMate-AI/docs/architecture/MODULE_BOUNDARIES.md#L542-L575) |
| **DB-019** | Profile Target Recalculation & Formula Versioning | `UsersModule`, `NutritionModule` | Medium | **PROPOSED** | [MODULE_BOUNDARIES.md §3.2](file:///d:/2026/Personal%20Fitness%20&%20AI%20Coach%20Platform/FitMate-AI/docs/architecture/MODULE_BOUNDARIES.md#L467-L476) |
| **DB-020** | Concurrent AI Coach Hourly Rate Limiting | `CoachModule` | Medium | **PROPOSED** | [FR-COACH-004](file:///d:/2026/Personal%20Fitness%20&%20AI%20Coach%20Platform/FitMate-AI/docs/architecture/MODULE_BOUNDARIES.md#L431) |
| **DB-021** | Cryptographic Google OAuth Token & Identity Validation | `AuthModule` | High | **PROPOSED** | [FR-AUTH-002](file:///d:/2026/Personal%20Fitness%20&%20AI%20Coach%20Platform/FitMate-AI/docs/architecture/MODULE_BOUNDARIES.md#L81) |
| **DB-022** | Refresh Token Rotation Policy & Grace Framing | `AuthModule` | High | **PARTIALLY_RESOLVED** | [ARCH-003](file:///d:/2026/Personal%20Fitness%20&%20AI%20Coach%20Platform/FitMate-AI/docs/architecture/ARCHITECTURE_DECISION_RECORDS.md#L614) |
| **DB-023** | TTL Index Cleanup Lag vs. Query Enforcement | `AuthModule`, `WorkoutsModule` | High | **RESOLVED** | [DATABASE_SCHEMA.md §1.5](file:///d:/2026/Personal%20Fitness%20&%20AI%20Coach%20Platform/FitMate-AI/docs/architecture/DATABASE_SCHEMA.md#L26-L28) |
| **DB-024** | Idempotency Canonical Hashing & Request Replay | `WorkoutsModule` | High | **OPEN** | [ADR-007](file:///d:/2026/Personal%20Fitness%20&%20AI%20Coach%20Platform/FitMate-AI/docs/architecture/ARCHITECTURE_DECISION_RECORDS.md#L24), [ARCH-002](file:///d:/2026/Personal%20Fitness%20&%20AI%20Coach%20Platform/FitMate-AI/docs/architecture/ARCHITECTURE_DECISION_RECORDS.md#L613) |
| **DB-025** | MVP Identity Provider Scope (Local & Google) | `AuthModule` | Medium | **PROPOSED** | [FEAT-001](file:///d:/2026/Personal%20Fitness%20&%20AI%20Coach%20Platform/FitMate-AI/docs/architecture/SYSTEM_ARCHITECTURE.md#L250), [COLLECTION_INVENTORY.md §3.1](file:///d:/2026/Personal%20Fitness%20&%20AI%20Coach%20Platform/FitMate-AI/docs/architecture/COLLECTION_INVENTORY.md#L55-L95) |
| **DB-026** | Incomplete Onboarding & Profile Optionality | `UsersModule`, `AuthModule` | High | **PROPOSED** | [ADR-005](file:///d:/2026/Personal%20Fitness%20&%20AI%20Coach%20Platform/FitMate-AI/docs/architecture/ARCHITECTURE_DECISION_RECORDS.md#L22), [ADR-006](file:///d:/2026/Personal%20Fitness%20&%20AI%20Coach%20Platform/FitMate-AI/docs/architecture/ARCHITECTURE_DECISION_RECORDS.md#L23) |
| **DB-027** | Workout Session Lifecycle (Active vs Completed) | `WorkoutsModule` | Medium | **RESOLVED** | [ADR-007](file:///d:/2026/Personal%20Fitness%20&%20AI%20Coach%20Platform/FitMate-AI/docs/architecture/ARCHITECTURE_DECISION_RECORDS.md#L24) |
| **DB-028** | Universal Versioning & Timestamp Exceptions | All Modules | Low | **RESOLVED** | [DATABASE_SCHEMA.md §1](file:///d:/2026/Personal%20Fitness%20&%20AI%20Coach%20Platform/FitMate-AI/docs/architecture/DATABASE_SCHEMA.md#L15-L35) |
| **DB-029** | Append-Only Consent History & Statutory Retention | `UsersModule` | High | **OPEN** | [FR-SAFE-001](file:///d:/2026/Personal%20Fitness%20&%20AI%20Coach%20Platform/FitMate-AI/docs/architecture/MODULE_BOUNDARIES.md#L191) |
| **DB-030** | Atomic Coach Rate Limiting & Concurrency | `CoachModule` | Medium | **OPEN** | [FR-COACH-004](file:///d:/2026/Personal%20Fitness%20&%20AI%20Coach%20Platform/FitMate-AI/docs/architecture/MODULE_BOUNDARIES.md#L431) |
| **DB-031** | Storage Estimate Assumptions & Document Bounding | Cross-Cutting | Medium | **RESOLVED** | [COLLECTION_INVENTORY.md §5](file:///d:/2026/Personal%20Fitness%20&%20AI%20Coach%20Platform/FitMate-AI/docs/architecture/COLLECTION_INVENTORY.md#L350-L375) |
| **DB-032** | Multi-Document Transactions & Replica Set Prerequisites | `AuthModule`, Infrastructure | High | **OPEN** | [ADR-006](file:///d:/2026/Personal%20Fitness%20&%20AI%20Coach%20Platform/FitMate-AI/docs/architecture/ARCHITECTURE_DECISION_RECORDS.md#L23) |
| **DB-033** | Single Authoritative Unique Email Index | `AuthModule` | High | **PROPOSED** | [DATABASE_SCHEMA.md §2.1.5](file:///d:/2026/Personal%20Fitness%20&%20AI%20Coach%20Platform/FitMate-AI/docs/architecture/DATABASE_SCHEMA.md#L135-L145) |
| **DB-034** | Conditional Password Validation Safeguards | `AuthModule` | High | **PROPOSED** | [DATABASE_SCHEMA.md §2.2.4](file:///d:/2026/Personal%20Fitness%20&%20AI%20Coach%20Platform/FitMate-AI/docs/architecture/DATABASE_SCHEMA.md#L270-L280) |
| **DB-035** | Single Primary Identity Invariant Enforcement | `AuthModule` | High | **PROPOSED** | [DATABASE_SCHEMA.md §2.2.5](file:///d:/2026/Personal%20Fitness%20&%20AI%20Coach%20Platform/FitMate-AI/docs/architecture/DATABASE_SCHEMA.md#L282-L300) |
| **DB-036** | Refresh Successor Ephemeral Recovery Encryption | `AuthModule` | High | **PROPOSED** | [DATABASE_SCHEMA.md §2.3.4](file:///d:/2026/Personal%20Fitness%20&%20AI%20Coach%20Platform/FitMate-AI/docs/architecture/DATABASE_SCHEMA.md#L430-L450) |
| **DB-037** | Concurrent Refresh Rotation Protocol & Write Conflicts | `AuthModule` | High | **OPEN** | [DATABASE_SCHEMA.md §2.3.5](file:///d:/2026/Personal%20Fitness%20&%20AI%20Coach%20Platform/FitMate-AI/docs/architecture/DATABASE_SCHEMA.md#L452-L480) |
| **DB-038** | Atomic Email Synchronization Across Collections | `AuthModule` | High | **PROPOSED** | [DATABASE_SCHEMA.md §3.1](file:///d:/2026/Personal%20Fitness%20&%20AI%20Coach%20Platform/FitMate-AI/docs/architecture/DATABASE_SCHEMA.md#L550-L580) |
| **DB-039** | Atomic Password Reset Consumption Flow | `AuthModule` | High | **PROPOSED** | [DATABASE_SCHEMA.md §2.4.3](file:///d:/2026/Personal%20Fitness%20&%20AI%20Coach%20Platform/FitMate-AI/docs/architecture/DATABASE_SCHEMA.md#L510-L545) |
| **DB-040** | TokenVersion Enforcement & Multi-Instance Consistency | `AuthModule` | High | **OPEN** | [DATABASE_SCHEMA.md §3.2](file:///d:/2026/Personal%20Fitness%20&%20AI%20Coach%20Platform/FitMate-AI/docs/architecture/DATABASE_SCHEMA.md#L582-L615) |

---

## 4. Detailed Issue Specifications & Architectural Reassessments

---

### DB-012: Correct Nutrition Estimation Semantics (`isEstimated`)
- **Status**: **OPEN** (Awaiting formal schema approval in NutritionModule review).
- **Core Invariant Reconciliation**:
  [Core Invariant 2](file:///d:/2026/Personal%20Fitness%20&%20AI%20Coach%20Platform/FitMate-AI/.agents/AGENTS.md#L25-L35) strictly dictates: *"Always clearly label calorie, macro, and micronutrient calculations as estimates (`isEstimated: true`). Never present calculated nutritional information as guaranteed medical or laboratory data."*
- **Disambiguated Semantic Scope Across Entities**:
  1. `food_library` (Curated Static Catalog):
     - `isVerified: true`: Indicates verified provenance from certified food composition tables (USDA / regional Middle Eastern nutritional lab data).
     - `isEstimated: true`: Preserved on the catalog entity to uphold Core Invariant 2, acknowledging that agricultural produce and food preparation have intrinsic biological variance.
  2. `portion conversions`: Always `isEstimated: true` (converting visual units like "1 medium cup" or "1 piece" to grams introduces volumetric estimation error).
  3. `quick_add_items`: Always `isEstimated: true` (user-estimated calories and macros).
  4. `nutrition_logs.slots.*.items`: Always `isEstimated: true`.
  5. `nutrition_logs` Daily & Slot Totals: Always `isEstimated: true`.
  6. `user_profiles` Metabolic Targets (Mifflin-St Jeor): Always `isEstimated: true` (population formula, not calorimeter lab testing).
- **Invariant Conclusion**: No calculated nutritional figure, logged meal, or diary summary is ever emitted without `isEstimated: true`.

---

### DB-013: Consent Record Identity Separation
- **Status**: **RESOLVED**.
- **Specification**: In `consent_records`, separate active reference from pseudonymous audit data:
  ```typescript
  interface IConsentRecordDocument {
    _id: Types.ObjectId;
    userId: Types.ObjectId | null;      // Active reference; set to null upon account deletion
    pseudonymizedUserId?: string;       // HMAC-SHA256(userId, secret); populated strictly upon deletion
    status: 'active' | 'pseudonymized';
    consentType: 'health_disclaimer' | 'terms_of_service' | 'privacy_policy';
    hasAccepted: boolean;
    disclaimerVersion: string;
    acceptedAt: Date;
    ipHash: string;
    userAgentTruncated: string;
    pseudonymizedAt?: Date;
    createdAt: Date;
    updatedAt: Date;
  }
  ```
- **Index Alignment**: Covered by `{ userId: 1, consentType: 1 }` (sparse) and `{ pseudonymizedUserId: 1 }` (sparse).

---

### DB-014: Redundant Compound Indexes & Prefix Audit
- **Status**: **RESOLVED**.
- **Specification**: Validated that all leading compound prefixes eliminate standalone single-field indexes:
  - `user_identities`: `{ userId: 1, provider: 1 }` covers `{ userId: 1 }`.
  - `refresh_tokens`: `{ userId: 1, isRevoked: 1 }` covers `{ userId: 1 }`.
  - `workout_sessions`: `{ userId: 1, completedAt: -1 }` covers `{ userId: 1 }`.
  - `body_weight_entries`: `{ userId: 1, date: -1 }` covers `{ userId: 1 }`.
- Standalone indexes on these fields are strictly omitted.

---

### DB-015: Universal Schema Versioning & Timestamps Policy
- **Status**: **RESOLVED**.
- **Specification**: All root persistent documents enforce `{ timestamps: true }` and `schemaVersion: { type: Number, required: true, default: 1 }`. JSON transforms remove `_id` (mapped to `id`) and strip `__v`.

---

### DB-016: Multi-Tier Numeric Precision & Floating-Point Boundaries
- **Status**: **PARTIALLY_RESOLVED** (Calculation precision runtime safeguards remain open).
- **Separation of Precision Tiers**:
  1. *Calculation Tier*: Runtime arithmetic executes using native IEEE 754 double-precision float64. Intermediate steps in Mifflin-St Jeor and tonnage accumulation retain full precision to avoid premature rounding error accumulation.
  2. *Persistence Tier*: Canonical rounding applied strictly at document boundary setters:
     - `weightKg`: Rounded to **2 decimal places**: `Math.round(val * 100) / 100`. Range: $[30.00, 300.00]$.
     - `heightCm`: Rounded to **1 decimal place**: `Math.round(val * 10) / 10`. Range: $[100.0, 250.0]$.
     - `totalVolumeKg`: Rounded to **2 decimal places**.
     - `calories` & `dailyTotalCalories`: Rounded to nearest **integer** (`Math.round(val)`).
     - Macronutrients (`proteinGrams`, `carbsGrams`, `fatGrams`): Rounded to **1 decimal place**.
  3. *Serialization Tier*: API JSON envelopes serialize values with fixed decimal string formatters or clean floats to suppress floating-point representation artifacts (e.g. `75.40000000000002`).
  4. *Display Tier*: Client UI formats values according to user unit preference (`metric` vs `imperial`) and active language locale (`en` vs `ar`).
- **Floating-Point Limitation Note**: Setting persistence precision does not eliminate IEEE 754 binary representation limitations; it provides an agreed-upon storage and exchange boundary.

---

### DB-017: Nutrition Diary Date & Timezone Semantics
- **Status**: **OPEN** (Detailed validation scheduled for NutritionModule schema).
- **Specification Requirements**:
  - Authoritative diary key: Canonical local date string `YYYY-MM-DD` (e.g. `'2026-11-02'`) determined by user's active device timezone at meal logging time.
  - Document stores `timezoneOffsetMinutes: number` (e.g. `-120` for UTC+2) to audit boundary shifts.
  - Individual food items store UTC `loggedAt: Date` for chronological ordering within the meal slot.

---

### DB-018: Durable Account Deletion Saga & Crash Recovery
- **Status**: **OPEN** (Requires multi-module review and distributed worker lease verification).
- **Architectural Gaps to Resolve**:
  1. *Durable Saga State vs. Final Audit Record*:
     - Operational saga state must NOT be stored solely on `users.status`, because when the user record is deleted in stage 4, mid-flight crash state would be lost.
     - An operational saga ledger `deletion_saga_jobs` (or durable saga collection) must track multi-step progress:
       ```typescript
       interface IDeletionSagaJob {
         _id: Types.ObjectId;
         userId: Types.ObjectId;
         status: 'pending' | 'in_progress' | 'failed_retry' | 'completed' | 'abandoned_manual_review';
         completedSteps: string[];
         currentStep: string;
         leaseOwner?: string;          // Worker instance ID
         leaseExpiresAt?: Date;        // Heartbeat timeout (e.g. 60s)
         retryCount: number;
         lastError?: string;
         createdAt: Date;
         updatedAt: Date;
       }
       ```
  2. *Ordered Step Ledger*:
     - Step 1: `auth_revoked` (`revokeAllSessions`)
     - Step 2: `workouts_purged` (`workoutsService.purgeUserData`)
     - Step 3: `nutrition_purged` (`nutritionService.purgeUserData`)
     - Step 4: `progress_purged` (`progressService.purgeUserData`)
     - Step 5: `coach_purged` (`coachService.purgeUserData`)
     - Step 6: `consent_pseudonymized` (`usersService.anonymizeConsent`)
     - Step 7: `profile_purged` (`usersService.purgeProfile`)
     - Step 8: `credentials_purged` (`authService.deleteAccountData`)
     - Step 9: `audit_persisted` (write to `deletion_audit_logs`)
     - Step 10: `saga_completed` (cleanup saga job)
  3. *Worker Claim / Lease Lock*:
     - Atomic lease acquisition:
       `findOneAndUpdate({ _id: jobId, status: { $in: ['pending', 'failed_retry'] }, $or: [{ leaseOwner: null }, { leaseExpiresAt: { $lt: now } }] }, { $set: { status: 'in_progress', leaseOwner: workerId, leaseExpiresAt: now + 60s } })`.
     - Prevents two background workers from racing on the same user purge.
  4. *Crash Recovery*: If a worker dies mid-step, its lease expires after 60s. The reconciliation cron reclaims the job and resumes idempotently from `currentStep`.
  5. *External Storage Purge*: Must specify handling for external media (e.g. S3 user profile pictures, chat cache) before finalizing deletion.

---

### DB-019: Profile Target Recalculation & Formula Versioning
- **Status**: **PROPOSED**.
- **Specification**: When physical metrics or goals change, Mifflin-St Jeor recalculations are persisted to `user_profiles` with `targetsCalculatedAt: Date`. Historical `nutrition_logs` retain the target snapshot that was active on that date; retroactive recalculation of past diary days is prohibited.

---

### DB-020: Concurrent AI Coach Hourly Rate Limiting
- **Status**: **PROPOSED** (Under evaluation in CoachModule design).
- **Specification**: `FR-COACH-004` limits users to 20 messages per hour. Evaluated between an atomic MongoDB sliding-window count `{ userId: 1, createdAt: -1 }` with transaction isolation vs. a Redis token bucket.

---

### DB-021: Cryptographic Google OAuth Token & Identity Validation
- **Status**: **PROPOSED** (Awaiting OAuth integration test plan).
- **Mandatory Cryptographic Verification Rules**:
  Validating `email_verified: true` alone is **strictly insufficient**. The backend must validate:
  1. Signature verification against Google's live public keys via JWKS (`https://www.googleapis.com/oauth2/v3/certs`).
  2. Issuer verification: `iss` must equal `'https://accounts.google.com'` or `'accounts.google.com'`.
  3. Audience verification: `aud` must match the server's registered `GOOGLE_CLIENT_ID`.
  4. Expiration check: `exp > now`.
  5. Immutable identity binding: Use Google's stable, unique numeric `sub` identifier for `providerUserId`.
  6. Email verification assertion: Only link Google identity to existing local account if `email_verified === true`.

---

### DB-022: Refresh Token Rotation Policy & Grace Framing
- **Status**: **PARTIALLY_RESOLVED** (Grace period mechanics defined; concurrency protocol under DB-037).
- **Specification**: Rotating refresh token family model ([ARCH-003](file:///d:/2026/Personal%20Fitness%20&%20AI%20Coach%20Platform/FitMate-AI/docs/architecture/ARCHITECTURE_DECISION_RECORDS.md#L614)). Rotated tokens maintain a 30-second grace window to tolerate mobile cellular drops.
- **Critical Security Limitation**: A grace period cannot cryptographically distinguish a network retry from an active token interception attack. If an attacker submits a stolen token within 30 seconds of a legitimate rotation, the server treats it as a retry. This is an accepted engineering trade-off for mobile network resilience.

---

### DB-023: TTL Index Cleanup Lag vs. Query Enforcement
- **Status**: **RESOLVED**.
- **Specification**: All authentication queries explicitly filter `expiresAt: { $gt: new Date() }`. MongoDB TTL indexes serve exclusively for disk cleanup, never as the authoritative security expiration boundary.

---

### DB-024: Idempotency Canonical Hashing & Request Replay
- **Status**: **OPEN** (To be validated in WorkoutsModule schema).
- **Specification Requirements**:
  1. *Canonical JSON Serialization*: Client payloads must be canonically serialized (keys sorted alphabetically, whitespace stripped) prior to computing `requestPayloadHash = SHA-256(canonicalBody)`.
  2. *Concurrent In-Flight Requests*: If a second request arrives with the same `idempotencyKey` while the first is still processing (`status: 'in_progress'`), the backend must return `409 Conflict` with `Retry-After: 2` or hold the connection until the initial transaction commits, rather than returning an empty cache.

---

### DB-025: MVP Identity Provider Scope (Local & Google)
- **Status**: **PROPOSED**.
- **Specification**: The MVP baseline scopes strictly Local Email/Password and Google OAuth sign-in. Apple Sign-In is preserved in the enum (`'apple'`) but deferred until Apple Developer enterprise enrollment is finalized.

---

### DB-026: Incomplete Onboarding & Profile Optionality
- **Status**: **PROPOSED**.
- **Specification**: Pre-registration onboarding state is strictly transient in-memory on the mobile device ([ADR-005](file:///d:/2026/Personal%20Fitness%20&%20AI%20Coach%20Platform/FitMate-AI/docs/architecture/ARCHITECTURE_DECISION_RECORDS.md#L22)). The account and profile are created atomically in a single transaction ([ADR-006](file:///d:/2026/Personal%20Fitness%20&%20AI%20Coach%20Platform/FitMate-AI/docs/architecture/ARCHITECTURE_DECISION_RECORDS.md#L23)). Orphaned "registered-but-un-onboarded" accounts cannot exist in the database.

---

### DB-027: Workout Session Lifecycle (Active vs Completed)
- **Status**: **RESOLVED**.
- **Specification**: In-progress workout sessions are managed strictly in mobile local storage (Zustand/SQLite per [ADR-007](file:///d:/2026/Personal%20Fitness%20&%20AI%20Coach%20Platform/FitMate-AI/docs/architecture/ARCHITECTURE_DECISION_RECORDS.md#L24)). The backend `workout_sessions` collection persists only completed, finalized sessions.

---

### DB-028: Universal Versioning & Timestamp Exceptions
- **Status**: **RESOLVED**.
- **Specification**: Universal enforcement of `schemaVersion` and timestamps. Validated exception: Static seed reference catalogs (`food_library`, `exercise_catalog`) use `catalogVersion: string` (e.g. `'1.0.0'`) alongside `schemaVersion`.

---

### DB-029: Append-Only Consent History & Statutory Retention
- **Status**: **OPEN** (Legal review of consent history model pending).
- **Specification Requirements**:
  - When terms or disclaimers update (`disclaimerVersion: '1.1.0'`), does `consent_records` append a new record or update the existing one?
  - Architectural recommendation: Append-only ledger for statutory regulatory defense, indexed by `{ userId: 1, consentType: 1, acceptedAt: -1 }`.

---

### DB-030: Atomic Coach Rate Limiting & Concurrency
- **Status**: **OPEN** (Tied to DB-020).
- **Specification**: Defining concurrency tests for multi-tab chat bursts hitting `POST /api/v1/coach/chat` to guarantee the 20 msgs/hour boundary.

---

### DB-031: Storage Estimate Assumptions & Document Bounding
- **Status**: **RESOLVED**.
- **Specification**: Documented in [COLLECTION_INVENTORY.md §5](file:///d:/2026/Personal%20Fitness%20&%20AI%20Coach%20Platform/FitMate-AI/docs/architecture/COLLECTION_INVENTORY.md#L350-L375). Total baseline projected footprint for 10k users over 180 days is ~29.8 GB across ~5.18 million documents. Over 90% of data is bounded embedded sets and meals.

---

### DB-032: Multi-Document Transactions & Replica Set Prerequisites
- **Status**: **OPEN** (Infrastructure & test runner verification pending).
- **Specification Requirements**:
  - Multi-document transactions (`ClientSession.startTransaction()`) require a MongoDB Replica Set deployment.
  - Development and test environments (Docker Compose / CI) must spin up a single-node replica set (`mongod --replSet rs0`) and execute `rs.initiate()` before running backend integration tests.

---

### DB-033: Single Authoritative Unique Email Index
- **Status**: **PROPOSED** (Awaiting schema review approval).
- **Specification**:
  - `UserSchema` removes field-level `unique: true, index: true`.
  - Exactly one unique index is declared at schema level:
    `UserSchema.index({ email: 1 }, { unique: true, name: 'uniq_user_email_ci', collation: { locale: 'en', strength: 2 } })`.
  - Migration procedure for existing databases: drop legacy indexes `email_1` before applying collated index.

---

### DB-034: Conditional Password Validation Safeguards
- **Status**: **PROPOSED**.
- **Specification**:
  - Service-level validation in `AuthService` is the primary application boundary.
  - Schema-level pre-validate hooks and context-aware validators (`this instanceof Document` vs `this.getUpdate()`) act as defense-in-depth safeguards enforcing:
    - `provider === 'local'`: `passwordHash` required ($\ge 20$ chars).
    - `provider === 'google' | 'apple'`: `passwordHash` forbidden (`undefined` or `null`).

---

### DB-035: Single Primary Identity Invariant Enforcement
- **Status**: **PROPOSED**.
- **Specification**:
  - Partial unique index `{ userId: 1, isPrimary: 1 }` with `partialFilterExpression: { isPrimary: true }` guarantees at-most-one primary identity per account at the database engine level.
  - Service-level transactional logic coordinates primary provider switches and prevents unlinking the sole remaining or primary identity.

---

### DB-036: Refresh Successor Ephemeral Recovery Encryption
- **Status**: **PROPOSED** (Security review of KMS key management pending).
- **Cryptographic Lifecycle Specification**:
  1. During token rotation, raw successor token `rawToken_B` is encrypted using **AES-256-GCM**.
  2. External Key Management: Secret key (`REFRESH_RECOVERY_KEY`) is stored strictly in server environment memory / KMS (never in MongoDB).
  3. IV: Cryptographically secure random 96-bit (12-byte) IV generated per rotation via `crypto.randomBytes(12)`. IV reuse is strictly prevented.
  4. Auth Tag: 128-bit (16-byte) GCM authentication tag verifies ciphertext integrity prior to decryption.
  5. Associated Data (AAD): Plaintext `{ userId, tokenFamily }` is bound as AAD to prevent ciphertext transplant attacks.
  6. Ephemeral Persistence: Ciphertext stored in `encryptedSuccessorToken` (`select: false`).
  7. Expiration & Cleanup: Decryption is permitted only if `now - rotatedAt <= 30_000ms`. Field is wiped upon subsequent rotation or session invalidation.

---

### DB-037: Concurrent Refresh Rotation Protocol & Write Conflicts
- **Status**: **OPEN** (Concurrency test harness verification required).
- **Protocol Specification**:
  1. Atomic conditional find-and-modify:
     `RefreshTokenModel.findOneAndUpdate({ hashedToken: incomingHash, isRevoked: false, expiresAt: { $gt: now } }, { $set: { isRevoked: true, revocationReason: 'rotation', rotatedAt: now, replacedByTokenHash: newHash, encryptedSuccessorToken: blob } }, { session, new: false })`.
  2. Exactly one concurrent request wins document lock.
  3. Losing request matches zero documents; queries token and evaluates grace window vs token reuse attack.
  4. Write Conflict Handling: In MongoDB replica sets, concurrent transaction writes throw `WriteConflictException` (code 112). Transaction runner must catch error 112 and execute an exponential backoff retry loop (max 3 retries, 10–50ms jitter).

---

### DB-038: Atomic Email Synchronization Across Collections
- **Status**: **PROPOSED**.
- **Specification**:
  - Local identity uses normalized email as `providerUserId`.
  - Google identity uses Google's immutable `sub` as `providerUserId`, **never email**.
  - Changing account email executes in a transaction updating `users.email` and `user_identities.providerUserId` (only where `provider === 'local'`). Google identities are untouched.
  - `isEmailVerified` is reset to `false` and re-verification email is dispatched via an outbox/retry queue.
  - Operation requires active session re-authentication (password confirmation).

---

### DB-039: Atomic Password Reset Consumption Flow
- **Status**: **PROPOSED**.
- **Specification**:
  - Atomic single-use consumption: `PasswordResetTokenModel.findOneAndUpdate({ hashedToken, usedAt: null, expiresAt: { $gt: now } }, { $set: { usedAt: now } })`.
  - Transaction atomically updates `user_identities.passwordHash`, increments `users.tokenVersion`, and revokes all active refresh tokens for the user.

---

### DB-040: TokenVersion Enforcement & Multi-Instance Consistency
- **Status**: **OPEN** (Distributed Redis caching benchmark pending).
- **Specification Requirements**:
  1. MongoDB `users.tokenVersion` is the authoritative source of truth.
  2. Cache Layer:
     - Multi-instance deployment requires a shared distributed cache (Redis key `auth:tokenVersion:<userId>`).
     - In-process LRU cache is limited to single-node deployments; in multi-node setups, in-process caches diverge, creating a revocation propagation window bounded by LRU TTL.
  3. Failure Policy:
     - On cache failure, fallback to querying MongoDB directly (`users.findById(sub).select('tokenVersion status')`) with circuit breaker.
     - Fail-closed: If both cache and MongoDB are unreachable, reject request with `503 Service Unavailable`.
  4. Realistic Revocation Delay: Acknowledge that distributed cache invalidation is not mathematically instantaneous; propagation across clusters has a documented bounded delay of 1–5ms (Redis) or up to cache TTL (if in-process LRU is used).

---

## 5. Next Steps in Phase 3.2

Following review and confirmation of this updated Issues Register:
1. Preserve this register as the continuous tracking document for all schema phases.
2. Complete review of `AuthModule` schemas before initiating `UsersModule` schema specifications.

