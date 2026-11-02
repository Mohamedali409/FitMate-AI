# FitMate AI — Phase 3.1 Architecture Reconciliation Report

**Date:** 2026-11-01  
**Author:** Principal Software Architect & Independent Architecture Reviewer  
**Review Target:** FitMate AI Phase 3.1 Architecture Documentation Suite  
**Scope:** Comprehensive cross-document architecture reconciliation, resolving all technical tensions across authentication, offline sync boundaries, body weight snapshot reliability, account deletion saga, module interfaces, and AI safety buffering.  
**Overall Status:** PROPOSED — Ready for Human Review & Stakeholder Approval  

---

## 1. Executive Summary

As Principal Software Architect and Independent Architecture Reviewer for FitMate AI, I have performed an exhaustive, evidence-based reconciliation of the Phase 3.1 architecture documentation suite.

This reconciliation resolves technical discrepancies, corrects inaccurate architectural claims, and establishes mathematically and behaviorally defensible contracts across all four Phase 3.1 canonical architecture documents:
1. `docs/architecture/SYSTEM_ARCHITECTURE.md` (v1.1.0)
2. `docs/architecture/ARCHITECTURE_DECISION_RECORDS.md` (v1.1.0)
3. `docs/architecture/MODULE_BOUNDARIES.md` (v1.1.0)
4. `docs/architecture/architecture-diagram.mmd` (v1.1.0)

### Key Architectural Resolutions:
1. **Authentication Token Storage & Platform Keystores**: Delineated the segregation between short-lived access JWTs (held **strictly in application runtime memory**, never written to disk/AsyncStorage/SecureStore, lost upon process termination) and long-lived refresh tokens (persisted on-device via `expo-secure-store`, backed by iOS Keychain and Android KeyStore / EncryptedSharedPreferences). Explicitly clarified the difference between platform secure storage and hardware-backed protection, acknowledging Android hardware fragmentation (e.g. absence of StrongBox / hardware HSM on budget devices).
2. **Atomic Registration Transaction & Post-Commit Network Failure**: Formalized `POST /api/v1/auth/register` across four collections (`users`, `user_profiles`, `consent_records`, `refresh_tokens`). Established that because the backend strictly stores a SHA-256 one-way cryptographic hash of the refresh token, raw refresh tokens **cannot be decrypted or recovered** upon post-commit network failure. Unauthenticated retries cannot safely mint fresh tokens on idempotency keys alone; therefore, the authoritative recovery path is a user-friendly duplicate-email redirect to Login (`SCR-002`) where credentials authentication mints fresh tokens.
3. **Offline Workout Sync & Server Verification Realities**: Explicitly acknowledged that for workout sessions created entirely offline, the server **cannot authoritatively verify the exact historical physical wall-clock start time**. The server instead verifies arrival timestamp `receivedAt`, Bearer auth authenticity, monotonic duration across sets, payload hashes, and duplicate keys in `processed_idempotency_keys`. Bounded acceptance to $[ \text{receivedAt} - \text{MaxSupportedOfflineQueueAge}, \text{receivedAt} + \text{ForwardDriftTolerance} ]$. Mutations outside this window are rejected with `MUTATION_EXPIRED` and quarantined with explicit recovery options (Retry All, Export Raw Log, Discard).
4. **Body Weight Data Ownership & Snapshot Reliability**: Replaced inaccurate claims of "completely unidirectional" dependency with an explicit dual-path model: synchronous command calls (`UsersModule` $\rightarrow$ `ProgressModule`) and asynchronous domain events (`ProgressModule` $\rightarrow$ `UsersModule`). Established snapshot reliability defenses: timestamp guards (`event.recordedAt >= userProfile.weightUpdatedAt`), snapshot rebuild from the authoritative ledger (`rebuildWeightSnapshotFromLedger`), and registered durable outbox evaluation (`ARCH-006`).
5. **Account Deletion Saga & Legal Distinctions**: Replaced atomic cross-module transaction claims with a failure-tolerant 4-stage saga (`pending_deletion` $\rightarrow$ `deleting` $\rightarrow$ `deleted` / `failed_retry`). Delineated cryptographic pseudonymization (`HMAC-SHA256(userId, serverSecretKey)`) of consent records from absolute legal anonymization under GDPR Recital 26, establishing that final retention policies require formal legal counsel review.
6. **Pure Nutrition Calculation Interface**: Resolved reciprocal coupling between `UsersModule` and `NutritionModule` by defining `calculateEnergyTargets` as a pure domain function that takes inputs and returns outputs without database queries or module calls. `UsersModule` calls this pure function and persists targets in `user_profiles`. `NutritionModule` reads targets via `getProfileSnapshot(userId)`.
7. **AI Coach Safety Buffering & Retention Limits**: Formalized complete server-side response buffering prior to Layer 3 output validation, preventing unretractable display of unsafe tokens on mobile screens. Defined reference release for memory disposal, chat history persistence of safe refusal envelopes, and refrained from claiming zero provider retention until contractual terms are verified under `Q-001`. Preserved `Unsafe Prompt Refusal Recall` ($\ge 99\%$) as a measurable Phase E acceptance target.
8. **Numeric Precision Realities**: Documented that standard IEEE 754 float64 arithmetic produces base-10 representation error (`0.1 + 0.2 !== 0.3`) and refrained from claiming "mathematically perfect decimal fidelity". Enforced deterministic boundary rounding rules.

**Strict Governance Guarantees**:
- Zero application source code written.
- Zero npm dependencies installed (`package.json` untouched).
- Zero database schemas or migrations created.
- Phase 2 canonical specifications in `docs/product/` remain 100% untouched.
- All 13 ADRs (`ADR-001` through `ADR-013`) strictly maintain status `PROPOSED`.
- Phase 3.2 has NOT been initiated.

---

## 2. Actual Files and Versions Inspected

| File Path | Version Inspected | Version After Edit | Role in Architecture Suite |
| :--- | :---: | :---: | :--- |
| `docs/architecture/SYSTEM_ARCHITECTURE.md` | v1.0.0 | **v1.1.0** | Core system architecture specification |
| `docs/architecture/ARCHITECTURE_DECISION_RECORDS.md` | v1.0.0 | **v1.1.0** | Master Architecture Decision Records registry (`ADR-001`–`ADR-013`) |
| `docs/architecture/MODULE_BOUNDARIES.md` | v1.0.0 | **v1.1.0** | Domain boundaries, TypeScript service interfaces, collections, matrix |
| `docs/architecture/architecture-diagram.mmd` | v1.0.0 | **v1.1.0** | High-level system architecture Mermaid topology diagram |
| `docs/product/PRODUCT_OVERVIEW.md` | v2.0.0 | *Unchanged* | Canonical Product Overview (Read-Only) |
| `docs/product/MVP_SCOPE.md` | v2.0.0 | *Unchanged* | Canonical MVP Scope & Boundaries (Read-Only) |
| `docs/product/USER_PERSONAS.md` | v2.0.0 | *Unchanged* | Canonical User Personas (Read-Only) |
| `docs/product/USER_FLOWS.md` | v2.0.0 | *Unchanged* | Canonical User Flows (Read-Only) |
| `docs/product/SCREEN_INVENTORY.md` | v2.0.0 | *Unchanged* | Canonical Screen Inventory (`SCR-001`–`SCR-025`) (Read-Only) |
| `docs/product/FUNCTIONAL_REQUIREMENTS.md` | v2.0.0 | *Unchanged* | Canonical Functional Requirements (Read-Only) |
| `docs/product/NON_FUNCTIONAL_REQUIREMENTS.md` | v2.0.0 | *Unchanged* | Canonical Non-Functional Requirements (Read-Only) |
| `docs/product/OPEN_QUESTIONS.md` | v2.0.0 | *Unchanged* | Canonical Decisions `DEC-001`–`DEC-010` & `Q-001`–`Q-004` (Read-Only) |
| `docs/product/RISKS_AND_ASSUMPTIONS.md` | v2.0.0 | *Unchanged* | Canonical Risk Matrix (Read-Only) |

---

## 3. Inconsistencies Identified & Corrections Applied

### Inconsistency 1: Access Token Persistence in Keystore
- **Previous State**: `ADR-004` and `SYSTEM_ARCHITECTURE.md` claimed that all session tokens (including access JWTs) were written to hardware-backed `expo-secure-store`.
- **Defect**: Access tokens are short-lived 15-minute JWTs. Persisting them to disk or keystores introduces unnecessary I/O overhead on every request, increases the physical device attack surface, and contradicts the requirement for memory-only access token storage. Furthermore, claiming universal hardware-backed encryption ignores Android device fragmentation.
- **Correction Applied**: Updated `ADR-004`, `SYSTEM_ARCHITECTURE.md` Section 2.1, 4.1, and `architecture-diagram.mmd`. Access tokens reside **strictly in application runtime memory** and are never persisted to disk, SQLite, or SecureStore. Only refresh tokens are stored in `expo-secure-store`. Explicitly distinguished platform secure storage (Keychain/EncryptedSharedPreferences) from hardware-backed security (Secure Enclave / StrongBox), noting Android hardware realities.

### Inconsistency 2: Post-Commit Registration Network Failure & Token Recovery
- **Previous State**: Registration was stated to commit atomically, but post-commit network failure recovery was described simply as "the user logs in via SCR-002". No analysis was provided regarding idempotency retries, refresh token recovery, or duplicate-email handling.
- **Defect**: If the network drops after database commit, the user account exists, but the client has no tokens. Attempting to recover the raw refresh token from the database is impossible because only a SHA-256 hash was persisted. Attempting to issue fresh tokens to an unauthenticated retry presenting only an idempotency key introduces a severe session hijacking vulnerability.
- **Correction Applied**: Updated `ADR-006`, `SYSTEM_ARCHITECTURE.md` Section 5.2, and `MODULE_BOUNDARIES.md` Section 3.1. Formally documented why raw refresh token recovery is cryptographically impossible from a one-way hash, why unauthenticated token minting is prohibited, and established the authoritative recovery path: re-registration returns `409 Conflict` (`EMAIL_ALREADY_EXISTS`), client UI displays a clear explanation, and redirects to Login (`SCR-002`) where credential authentication mints fresh tokens.

### Inconsistency 3: Offline Workout Start Time Verification Fallacy
- **Previous State**: `SYSTEM_ARCHITECTURE.md` Section 6.4 claimed: *"The backend evaluates mutation expiration by comparing server-side arrival time against the authenticated session's server-recorded start time."*
- **Defect**: If a user performs a workout entirely offline in a subterranean gym, the server has never seen the session before. There is NO "server-recorded start time". Relying on client wall-clock time is vulnerable to clock manipulation or drift.
- **Correction Applied**: Updated `ADR-007`, `SYSTEM_ARCHITECTURE.md` Section 6.4, and `MODULE_BOUNDARIES.md` Section 2.4. Explicitly documented what the server CANNOT verify (exact physical historical start time of an offline-created session) versus what it CAN verify (server arrival time, Bearer authenticity, monotonic duration between sets, payload hash, duplicate idempotency keys). Defined the bounded acceptance window $[ \text{receivedAt} - \text{MaxSupportedOfflineQueueAge}, \text{receivedAt} + 5\,\text{min} ]$, client monotonic uptime guards, and quarantine recovery options.

### Inconsistency 4: Inaccurate "Completely Unidirectional" Claim for Body Weight
- **Previous State**: `MODULE_BOUNDARIES.md` claimed that the relationship between `UsersModule` and `ProgressModule` was "strictly unidirectional: UsersModule $\rightarrow$ ProgressModule", while also describing the asynchronous `weight.recorded` domain event from Progress to Users.
- **Defect**: An asynchronous event emitted by Progress and consumed by Users is an architectural communication path. Calling the relationship "completely unidirectional" was inaccurate. Furthermore, in-process event delivery in Node.js is not guaranteed across crashes, and delayed events could overwrite newer profile edits.
- **Correction Applied**: Updated `ADR-013`, `MODULE_BOUNDARIES.md` Section 2.2, 3.4, and `architecture-diagram.mmd`. Accurately documented dual communication paths: (1) Synchronous Command Path (`Users` $\rightarrow$ `Progress`), and (2) Asynchronous Event Path (`Progress` $\rightarrow$ `Users`). Established snapshot reliability defenses: timestamp guards (`event.recordedAt >= userProfile.weightUpdatedAt`), snapshot rebuild from the authoritative ledger (`rebuildWeightSnapshotFromLedger`), and registered durable outbox evaluation (`ARCH-006`).

### Inconsistency 5: Account Deletion Saga & Anonymization Fallacy
- **Previous State**: Account deletion was loosely described as an atomic multi-document operation across all modules, and hashing user IDs in consent records was described as "anonymizing consent records".
- **Defect**: A multi-document MongoDB transaction across six modules causes severe lock contention, timeout vulnerabilities, and connection pool exhaustion. Furthermore, under GDPR Recital 26 and privacy frameworks, cryptographic hashing with a key is **pseudonymization, NOT absolute legal anonymization**.
- **Correction Applied**: Updated `SYSTEM_ARCHITECTURE.md` Section 5.3, `MODULE_BOUNDARIES.md` Section 3.6, and `architecture-diagram.mmd`. Formalized account deletion as an orchestrated 4-stage saga with an explicit state machine (`active` $\rightarrow$ `pending_deletion` $\rightarrow$ `deleting` $\rightarrow$ `deleted` / `failed_retry`). Delineated cryptographic pseudonymization (`HMAC-SHA256(userId, serverSecretKey)`) from absolute legal anonymization, and stated that final statutory retention policies require formal legal counsel review.

### Inconsistency 6: Reciprocal Dependency Between UsersModule and NutritionModule
- **Previous State**: `UsersModule` called `nutritionService.recalculateTargets`, while `NutritionModule` queried `UsersModule` for physical metrics, creating reciprocal coupling and interface naming discrepancies.
- **Defect**: Reciprocal coupling between two core modules risks circular dependencies, tight coupling, and unclear persistence ownership.
- **Correction Applied**: Updated `MODULE_BOUNDARIES.md` Section 2.2, 2.3, 3.2, 4, and `architecture-diagram.mmd`. Defined `calculateEnergyTargets(metrics: MetabolicProfileInput): EnergyTargetsOutput` as a pure calculation contract. It executes Mifflin-St Jeor arithmetic without database access or calls to `UsersModule`. `UsersModule` calls this pure function and persists the targets into `user_profiles`. `NutritionModule` queries `usersService.getProfileSnapshot(userId)` strictly when rendering the daily diary. DTOs reside in shared interfaces.

### Inconsistency 7: AI Coach Safety Pipeline & Provider Retention Claims
- **Previous State**: Architecture drafts claimed contractual zero provider retention as an established fact, used loose metric names ("Refusal Accuracy"), and lacked explicit specifications for memory disposal and chat transcript representation.
- **Defect**: Claiming zero provider retention is premature before an enterprise agreement is verified (`Q-001`). Claiming physical memory zeroing in JavaScript is inaccurate. Omitting safe refusal envelopes from chat history causes conversational gaps.
- **Correction Applied**: Updated `ADR-009`, `SYSTEM_ARCHITECTURE.md` Section 7.1, 7.1.1, 7.1.2, 7.2, and `MODULE_BOUNDARIES.md` Section 2.6. Specified that memory disposal releases object references for garbage collection. Specified that safe refusal envelopes and fallback messages ARE recorded in `coach_messages` with `isRefusal: true` / `isFallback: true` for chat continuity. Used exact metric label `Unsafe Prompt Refusal Recall` ($\ge 99\%$ target). Preserved provider zero-retention verification under `Q-001`.

### Inconsistency 8: Floating-Point Limitations & ReDoS Misconceptions
- **Previous State**: Earlier text claimed that conversion-boundary rounding eliminated floating-point drift and that a 100kb body parser prevented ReDoS.
- **Defect**: IEEE 754 binary floating-point representation cannot represent base-10 decimal fractions with exact precision (`0.1 + 0.2 !== 0.3`). A 100kb payload cap does not prevent ReDoS, which can be triggered by a 50-byte payload on an unanchored regex.
- **Correction Applied**: Updated `SYSTEM_ARCHITECTURE.md` Section 1.1, 3.1.1, 8.2, and `ADR-010`. Clarified IEEE 754 float64 limitations and eliminated claims of "mathematically perfect decimal fidelity". Documented that ReDoS defense requires regex static auditing, safe engines, and execution timeouts. Clarified that Zod `.strict()` strictly rejects unknown fields by throwing errors rather than silently stripping them.

---

## 4. Why Corrections Were Necessary

Every correction applied in this reconciliation pass was strictly necessary to:
1. **Prevent Security Vulnerabilities**: Storing access tokens in keystores or issuing tokens to unauthenticated retries created session exposure and hijacking vulnerabilities.
2. **Prevent Data Corruption**: Out-of-order event delivery, unverified offline session timestamps, or silent re-transmissions risked corrupting workout volume and weight tracking analytics.
3. **Ensure Scientific & Legal Accuracy**: Replacing false claims of "mathematically perfect decimal fidelity" and "automatic legal anonymization" with defensible engineering and privacy classifications protects the project from legal liability and technical debt.
4. **Enforce Modular Monolith Boundaries**: Resolving reciprocal dependencies into pure calculation contracts prevents circular imports and spaghetti architecture.

---

## 5. Files and Sections Affected

| Canonical Document | Affected Sections |
| :--- | :--- |
| `docs/architecture/SYSTEM_ARCHITECTURE.md` | • Header & Versioning (v1.1.0)<br>• Section 1.1 (Principles 3 & 8)<br>• Section 2.1 (Client Secure Storage & Memory)<br>• Section 2.3 (Schema Versioning Strategy)<br>• Section 2.4 (External LLM Zero-Retention Status)<br>• Section 2.5 (Catalog Build-Time Validation & Integrity)<br>• Section 3.1.1 (CORS, ReDoS, Context Rate Limiting, Zod `.strict()`, BOLA primitives)<br>• Section 4.1 (Token Architecture Table, Keystore Fragment Realities, Logout Semantics)<br>• Section 4.2 (Silent Refresh Interceptor Cleanup)<br>• Section 4.3 (BOLA Repository Scoping without Express `req`)<br>• Section 5.1 & 5.2 (Registration across 4 Collections, Post-Commit Network Failure & Duplicate-Email UX)<br>• Section 5.3 (*NEW*: Coordinated Account Deletion Saga Lifecycle)<br>• Section 6.4 (Offline Expiration Capabilities vs. Limitations, Bounded Window)<br>• Section 7.1.1, 7.1.2 & 7.2 (AI Safety Buffering, Memory Reference Release, `Unsafe Prompt Refusal Recall`, Chat History Representation)<br>• Section 8.1 (Arabic Line-Height Non-Universal Proposal)<br>• Section 8.2 (IEEE 754 float64 Representation Realities & Boundary Rounding)<br>• Section 12 (Scope Classification & Open Decisions Registry) |
| `docs/architecture/ARCHITECTURE_DECISION_RECORDS.md` | • Header & Versioning (v1.1.0)<br>• Decision Index (Updated ADR-004 title, verified all 13 `PROPOSED`)<br>• `ADR-004` (Runtime Memory Access Token & Platform Secure Storage Refresh Token)<br>• `ADR-006` (Atomic Registration across 4 Collections, Post-Commit Failure & Duplicate-Email UX)<br>• `ADR-007` (Offline Sync Server Capabilities vs Limitations, Bounded Window)<br>• `ADR-009` (AI Safety Full Buffering, Memory Reference Disposal, Chat History Envelopes, Q-001/Q-002)<br>• `ADR-010` (Canonical SI Storage, IEEE 754 float64 Realities & Explicit Rounding)<br>• `ADR-011` (Bi-Directional Ergonomics, Arabic Line-Height Non-Universal Benchmarking)<br>• `ADR-012` (Bundled Offline Datasets, Build-Time Hash Validation)<br>• `ADR-013` (Body Weight Dual Communication Paths, Snapshot Reliability, Stale Event Guard)<br>• Open Decisions Registry (`ARCH-001` through `ARCH-006`) |
| `docs/architecture/MODULE_BOUNDARIES.md` | • Header & Versioning (v1.1.0)<br>• Section 2.1 (AuthModule: `revokeAllSessions`, `password_reset_tokens`, metadata minimization)<br>• Section 2.2 (UsersModule: `weightUpdatedAt`, pure calculation call, Screen IDs `SCR-020`/`SCR-021`)<br>• Section 2.3 (NutritionModule: Pure calculation contract `calculateEnergyTargets`, `getProfileSnapshot` read)<br>• Section 2.6 (CoachModule: Memory reference disposal, chat history envelopes)<br>• Section 3.1 (Auth <-> Users Registration across 4 collections, post-commit network failure recovery)<br>• Section 3.2 (Users <-> Nutrition Pure calculation and profile snapshot contract)<br>• Section 3.4 (Users <-> Progress Dual communication paths, snapshot reliability, timestamp guard, `ARCH-006`)<br>• Section 3.6 (Account Deletion Saga: 4 stages, lockout, pseudonymization vs anonymization, recovery worker)<br>• Section 4 (Cross-Module Communication & Dependency Matrix) |
| `docs/architecture/architecture-diagram.mmd` | • Client Layer (Access token in runtime memory only, refresh token in `expo-secure-store`)<br>• Gateway (CORS browser-only note, ReDoS regex note, context-specific rate limiting, Zod `.strict()` reject)<br>• Inter-Module Links (Pure calculation `calculateEnergyTargets`, dual sync/async Progress links, deletion saga)<br>• Database Tier (Added `password_reset_tokens`, clarified collection ownership) |

---

## 6. Phase 2 Decisions Preserved

Every approved Phase 2 product decision has been strictly respected and preserved without modification:
- `DEC-001`: Curated baseline Food Library (~150–200 items) preserved; external food APIs excluded.
- `DEC-002`: Curated offline Exercise Catalog (~100 items) preserved; bundled in app assets.
- `DEC-003`: Provider-agnostic AI Coach interface preserved behind server-side `AICoachAdapter`.
- `DEC-004`: Pure transient in-memory pre-registration state preserved; zero guest accounts or pre-auth disk persistence.
- `DEC-005`: Mifflin-St Jeor formula with transparent `isEstimated: true` labeling and safety floors preserved.
- `DEC-006`: Camera, computer vision, and gym equipment recognition strictly deferred to v2.0.
- `DEC-007`: 100% Free Core Alpha/MVP with zero paywalls preserved.
- `DEC-008`: Phased implementation sequence (Foundation $\rightarrow$ Nutrition $\rightarrow$ Workouts $\rightarrow$ Progress $\rightarrow$ AI Coach) preserved.
- `DEC-009`: Bilingual first-class launch (Arabic RTL & English LTR) and multi-unit support preserved.
- `DEC-010`: Quick Add meal logging preserved; reusable custom food CRUD deferred to v1.1.

---

## 7. ADR Status Verification

All 13 Architecture Decision Records have been audited and verified. Every single ADR strictly maintains status **PROPOSED**:

| Decision ID | Title | Status Verified |
| :--- | :--- | :---: |
| `ADR-001` | Backend Architectural Pattern: Modular Monolith | **PROPOSED** |
| `ADR-002` | Mobile Client Architecture: React Native & Expo Router | **PROPOSED** |
| `ADR-003` | Mobile Server-State Management: TanStack Query | **PROPOSED** |
| `ADR-004` | Mobile Credential Storage: Runtime Memory Access Token & Platform Secure Storage for Refresh Token | **PROPOSED** |
| `ADR-005` | Pre-Registration State Lifecycle: Pure Transient In-Memory State | **PROPOSED** |
| `ADR-006` | Atomic Registration Architecture: Multi-Document Transaction Across Four Collections | **PROPOSED** |
| `ADR-007` | Offline Workout Logging & Idempotent Synchronization Engine | **PROPOSED** |
| `ADR-008` | AI Coach Abstraction: Provider-Agnostic Adapter Pattern | **PROPOSED** |
| `ADR-009` | Multi-Layered AI Safety & Non-Medical Guardrail Pipeline | **PROPOSED** |
| `ADR-010` | Canonical SI Metric Storage with Client-Side Dynamic Conversion | **PROPOSED** |
| `ADR-011` | Bi-Directional Layout & Typographic Line-Height Scaling Engine | **PROPOSED** |
| `ADR-012` | Food & Exercise Search Sourcing: Bundled Offline Datasets & Build-Time Integrity | **PROPOSED** |
| `ADR-013` | Data Ownership of Body Weight Records: Authoritative Ledger vs. Operational Profile Snapshot | **PROPOSED** |

---

## 8. Master Registry of Open Technical Decisions

The following technical evaluations and benchmarkings are explicitly cataloged and preserved for Phase 3.2 (Technology Stack Validation & Selection) or future phases:

| Identifier | Evaluation Topic | Target Phase | Status | Constraints & Scope |
| :--- | :--- | :---: | :---: | :--- |
| **ARCH-001** | Mobile Storage Engine Selection | Phase 3.2 | **OPEN** | Benchmark React Native MMKV vs. SQLite / WatermelonDB for active session crash recovery and queueing. |
| **ARCH-002** | Idempotency Key Retention TTL Duration | Phase 3.2 | **OPEN** | Benchmark 7-day vs. 14-day vs. 30-day TTL index on `processed_idempotency_keys`. Mandatory constraint: $\text{TTL} \ge \text{MaxSupportedOfflineQueueAge}$. |
| **ARCH-003** | Refresh Token Rotation Policy & Reuse Detection | Phase 3.2 | **OPEN** | Evaluate single-use rotating refresh tokens with automated reuse detection vs. fixed-window refresh tokens. |
| **ARCH-004** | Fast Revocation In-Memory Distributed Cache | Phase 3.2 / Phase E | **OPEN** | Evaluate Redis blocklist vs. stateful database checks for sub-millisecond multi-instance token revocation. |
| **ARCH-005** | Arabic Typographic Metrics Benchmarking | Phase 3.2 | **OPEN** | Validate line-height scaling heuristic (+20% to +25%) against Cairo and Noto Sans Arabic typefaces. |
| **ARCH-006** | Durable Event Outbox & Reconciliation Strategy | Phase 3.2 | **OPEN** | Evaluate transactional outbox pattern vs. periodic background reconciliation for cross-module domain events. |
| **Q-001** | External LLM Provider Selection | Phase E | **OPEN** | Benchmark candidate LLMs (Gemini, OpenAI, Claude) for latency, Arabic comprehension, and verify enterprise zero-retention terms. |
| **Q-002** | Qualified Professional Review Gate | Pre-Release Gate | **OPEN** | Formal audit and sign-off on Mifflin-St Jeor floors and AI guardrails by a registered dietitian or licensed medical professional. |
| **Q-003** | Regional Middle Eastern Food Additions | Phase B | **OPEN** | Community-driven food catalog expansion based on alpha user feedback. |
| **Q-004** | Commercial Food APIs & Barcode Scanning | Phase v1.2 | **OPEN** | Evaluate Nutritionix/Edamam and barcode scanning SDKs for post-MVP integration. |

---

## 9. Issues That Could Not Be Resolved Safely Without Implementation

The following issues were deliberately preserved as open architectural evaluations rather than prematurely invented:
1. **Durable Event Outbox Implementation (`ARCH-006`)**: Single-instance MVP Node.js runtime utilizes an in-process EventEmitter with timestamp checking and on-demand ledger rebuild. Selecting between a MongoDB-based transactional outbox table versus Redis Streams / RabbitMQ requires infrastructure sizing and concurrency load benchmarking in Phase 3.2.
2. **Exact Offline Queue TTL Duration (`ARCH-002`)**: Bounding the exact TTL (7, 14, or 30 days) requires balancing database storage growth against mobile user travel behavior in subterranean gyms, which will be benchmarked in Phase 3.2.
3. **LLM Contractual Zero-Retention (`Q-001`)**: Cannot be asserted as an established architecture invariant until specific enterprise vendor agreements (Gemini vs OpenAI vs Anthropic) are reviewed and executed.

---

## 10. Cross-Document Consistency Matrix

| Consistency Dimension | `SYSTEM_ARCHITECTURE.md` | `ARCHITECTURE_DECISION_RECORDS.md` | `MODULE_BOUNDARIES.md` | `architecture-diagram.mmd` | Phase 2 Canonical Specs | Status |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: |
| **Access Token In-Memory Only** | Section 2.1, 4.1 | `ADR-004` | Section 2.1 | `MEM_AUTH` node | `NFR-SEC-001` | **PASS** |
| **Platform Keystore Realities** | Section 4.1 | `ADR-004` | Section 2.1 | `SECSTORE` node | `NFR-SEC-001` | **PASS** |
| **Registration across 4 Collections** | Section 5.2 | `ADR-006` | Section 2.1, 3.1 | `AUTH_SRV` transaction | `FR-AUTH-001`, `DEC-004` | **PASS** |
| **Post-Commit Failure & Recovery** | Section 5.2 | `ADR-006` | Section 3.1 | Documented in prose | `FR-AUTH-001` | **PASS** |
| **Offline Verification Boundaries** | Section 6.4 | `ADR-007` | Section 2.4 | `OFFLINE` queue node | `NFR-REL-001`, `FR-WORK-005` | **PASS** |
| **Mandatory Idempotency TTL $\ge$ Queue Age** | Section 6.4 | `ADR-007` | Section 2.4 | `COL_IDEMPOTENCY` node | `NFR-REL-001` | **PASS** |
| **Weight Ledger vs. Snapshot Ownership** | Section 2.3 | `ADR-013` | Section 2.2, 2.5 | `COL_WEIGHT` owned by Progress | `FR-PROG-001`, `ADR-013` | **PASS** |
| **Dual Weight Sync & Event Paths** | Section 2.3 | `ADR-013` | Section 3.4, 4 | Sync command + Async event | `FR-PROG-001`, `NFR-DATA-001` | **PASS** |
| **Weight Stale Overwrite Defense** | Section 2.3 | `ADR-013` | Section 3.4 | Timestamp guarded | `NFR-DATA-001` | **PASS** |
| **Account Deletion 4-Stage Saga** | Section 5.3 | `ADR-001` | Section 3.6 | Deletion saga flow | `FR-SAFE-001`, `NFR-SEC-002` | **PASS** |
| **Consent Pseudonymization vs. Anonymization** | Section 5.3 | `ADR-001` | Section 2.2, 3.6 | Pseudonymized consent node | GDPR Recital 26, `NFR-SEC-002` | **PASS** |
| **Pure Nutrition Calculation Contract** | Section 2.3 | Section 12 | Section 2.3, 3.2 | Pure calculation arrow | `FR-NUTR-001`, `DEC-005` | **PASS** |
| **AI Safety Complete Buffering** | Section 7.1 | `ADR-009` | Section 2.6 | `BUFFER` node before L3 | `FR-COACH-002`, `NFR-SEC-007` | **PASS** |
| **Memory Reference Release on Rejection** | Section 7.1.2 | `ADR-009` | Section 2.6 | L3 discard branch | Core Invariant 1 | **PASS** |
| **Chat History Safe Refusal Envelopes** | Section 7.1.2 | `ADR-009` | Section 2.6 | Persisted envelopes | `FR-COACH-001` | **PASS** |
| **Unsafe Prompt Refusal Recall ($\ge 99\%$)** | Section 7.2 | `ADR-009` | Section 2.6 | Measurable target | `FR-COACH-002`, `NFR-SEC-007` | **PASS** |
| **IEEE 754 float64 Realities & Rounding** | Section 8.2 | `ADR-010` | Section 1.1 | Documented in prose | `DEC-009`, `FR-I18N-002` | **PASS** |
| **Arabic Line-Height Non-Universal Proposal**| Section 8.1 | `ADR-011` | Section 1.1 | Evaluated in `ARCH-005` | `NFR-I18N-002` | **PASS** |
| **Catalog Build-Time Hash Validation** | Section 2.5 | `ADR-012` | Section 2.3, 2.4 | Seeded collections | `DEC-001`, `DEC-002` | **PASS** |
| **Correct Screen IDs (`SCR-020` & `SCR-021`)**| All Sections | All Sections | All Sections | All Sections | `SCREEN_INVENTORY.md` | **PASS** |
| **All 13 ADRs Status PROPOSED** | Section 12 | Decision Index & All | All Sections | All Sections | N/A | **PASS** |
| **Phase 2 Canonical Specs Untouched** | 9 Files | 9 Files | 9 Files | 9 Files | All 9 Files Intact | **PASS** |

---

## 11. Final Recommendation

### Recommendation: **READY FOR HUMAN REVIEW**

The Phase 3.1: System Architecture Design documentation suite (`SYSTEM_ARCHITECTURE.md`, `ARCHITECTURE_DECISION_RECORDS.md`, `MODULE_BOUNDARIES.md`, and `architecture-diagram.mmd`) is fully reconciled, technically sound, and cross-document consistent. All contradictions have been resolved, false or absolute claims eliminated, and open decisions cleanly categorized.

**Phase 3.1 is READY FOR HUMAN REVIEW.** Standing by for explicit human review and stakeholder approval before proceeding to **Phase 3.2 (Technology Stack Validation & Selection)**.

