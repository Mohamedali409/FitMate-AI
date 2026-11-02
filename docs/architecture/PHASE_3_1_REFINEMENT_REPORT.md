# FitMate AI — Phase 3.1 Architecture Refinement Report

**Date:** 2026-11-01  
**Author:** Antigravity Senior Software Architect  
**Review Target:** Phase 3.1 Architecture Refinements (Stakeholder Feedback Resolution)  
**Status:** Complete — Ready for Stakeholder Approval  

---

## 1. Executive Summary

In response to stakeholder review findings on the initial Phase 3.1 architecture deliverables, a systematic refinement pass was executed across the architectural documentation suite.

The refinement addresses six core technical dimensions:
1. **Offline Workout Architecture**: Explicitly partitioned into a three-state data model (local active persisted session, pending sync queue, confirmed server state), with defined retry backoff, crash recovery behavior, and idempotency ownership. Local storage engine selection (MMKV vs. SQLite) is formally reserved for Phase 3.2.
2. **AI Safety Framework**: Removed all absolute claims (e.g. "guaranteed 100% interception"). Re-anchored the Phase 2 $\ge 99\%$ refusal benchmark as a **measurable evaluation target** for Phase E, documenting bilingual test coverage (Arabic & English), adversarial prompt categories, false positive/negative metrics, scoring methodology, regex filtering limitations, and human professional review requirements.
3. **Registration Transactions**: Formalized the MongoDB Replica Set deployment prerequisite, atomic multi-document creation (`User`, `UserProfile`, `ConsentRecord`), duplicate email handling, rollback mechanics, and token issuance strictly post-commit, without inventing final API error contracts.
4. **Idempotency Logical Contract**: Defined the user-scoped identifier contract `(userId, idempotencyKey)`, atomic duplicate prevention, repeated request replay, conflict handling for reused keys with mismatched payload hashes, and retention TTL as an open architectural decision.
5. **Onboarding Lifecycle**: Formally distinguished step navigation, app backgrounding, OS process termination, explicit cancellation, and successful registration, correcting misconceptions regarding background memory retention.
6. **Module Boundaries**: Explicitly formalized communication contracts and DTO exchanges between Auth and Users, Nutrition and Progress, Workouts and Progress, and Coach and read-only context providers, strictly banning cross-module database access.

Zero application source code was written, zero npm packages were installed, zero database schemas were created, and the nine canonical Phase 2 specifications remain completely untouched.

---

## 2. Inventory of Modified Architecture Documents

| Document | Modification Summary | Status |
| :--- | :--- | :---: |
| [`docs/architecture/SYSTEM_ARCHITECTURE.md`](./SYSTEM_ARCHITECTURE.md) | Refined Section 5 (Onboarding & Registration lifecycle, MongoDB replica set prerequisite, duplicate email handling, post-commit token issuance), Section 6 (Three-state workout model, retry policy, session recovery, idempotency logical contract), and Section 7 (Multi-layer AI safety, removal of absolute claims, measurable evaluation methodology). | **UPDATED / PROPOSED** |
| [`docs/architecture/ARCHITECTURE_DECISION_RECORDS.md`](./ARCHITECTURE_DECISION_RECORDS.md) | Refined `ADR-005` (In-memory onboarding lifecycle scenarios & limitations), `ADR-006` (Replica set transaction prerequisite, atomic commit & rollback), `ADR-007` (Three-state workout model, idempotency logical contract, conflict handling, open retention decision), and `ADR-009` (AI safety defense-in-depth, regex limitations, evaluation framework). | **UPDATED / PROPOSED** |
| [`docs/architecture/MODULE_BOUNDARIES.md`](./MODULE_BOUNDARIES.md) | Added Section 3 detailing explicit inter-module communication contracts between Auth ◄► Users, Nutrition ◄► Progress, Workouts ◄► Progress, and Coach ◄► Context Providers. Re-numbered sections and reinforced strict database isolation. | **UPDATED / PROPOSED** |
| [`docs/architecture/architecture-diagram.mmd`](./architecture-diagram.mmd) | Updated node labels in CoachModule (`GUARD_L1`) and Database (`COL_IDEMPOTENCY`) to reflect pattern filtering pre-check and open retention policy. | **UPDATED / PROPOSED** |
| [`docs/architecture/PHASE_3_1_ARCHITECTURE_REVIEW_REPORT.md`](./PHASE_3_1_ARCHITECTURE_REVIEW_REPORT.md) | Aligned Section 6.1 summary to eliminate absolute 100% claims, harmonizing with refined `ADR-009`. | **UPDATED** |

---

## 3. Systematic Breakdown of Refinements

### 3.1 Offline Workout Architecture Refinement
- **Three-State Data Model**:
  1. *Local Persisted Workout Data (Active Session State)*: Ongoing workout session on `SCR-017`. Set mutations, checkmarks, and elapsed time write synchronously to local device storage before/concurrently with UI updates, ensuring crash resilience.
  2. *Pending Synchronization Queue (Sync Ledger)*: Persistent FIFO queue of unacknowledged session mutations, tracking `idempotencyKey` (`UUIDv4`), `sessionClientUuid` (`UUIDv4`), `payloadHash`, `status` (`pending`, `syncing`, `failed`), `retryCount`, and backoff timestamps.
  3. *Confirmed Server State*: Server-acknowledged sessions moved to confirmed local history and dequeued from pending sync.
- **Failed Mutations & Retry Policy**:
  - Transient network failures trigger exponential backoff with randomized jitter ($\pm 20\%$) to prevent thundering herds when subterranean gym users regain cellular signals at street level.
  - Permanent payload validation errors are quarantined in local error logs without blocking subsequent independent mutations.
- **App Termination & Session Recovery**:
  - Cold start / post-crash initialization detects unclosed sessions (`status: "in_progress"`) and displays a Dashboard recovery banner: *"Resume active workout?"*, restoring exact sets and duration.
- **Storage Engine Choice Reserved**:
  - Evaluating **React Native MMKV** (high-speed synchronous key-value storage) versus **SQLite / WatermelonDB** (relational queuing) is explicitly designated as an open technical evaluation for Phase 3.2 (`ARCH-001`).

### 3.2 AI Safety & Evaluation Methodology Refinement
- **Removal of Absolute Claims**:
  - Eliminated assertions claiming "guaranteed 100% interception" or "zero LLM variance".
  - Re-anchored the Phase 2 $\ge 99\%$ refusal benchmark (`FR-COACH-002`, `NFR-SEC-007`) as a **measurable acceptance target** for Phase E, not an established result.
- **Acknowledged Limitations of Regex Filtering**:
  - Regex keyword filters serve strictly as a coarse, low-latency first line of defense ($< 5\,\text{ms}$) to intercept obvious violations.
  - Acknowledged that regex is vulnerable to leetspeak, dialectal slang, creative misspellings, metaphors, and prompt injection obfuscation, necessitating Layer 2 (system prompt role boundary) and Layer 3 (post-generation inspection).
- **Comprehensive Evaluation Methodology (Phase E Target)**:
  - *Bilingual Coverage*: Testing in English, Modern Standard Arabic (MSA), regional dialects (Egyptian, Gulf, Levantine), and Arabizi (phonetic transliteration).
  - *Adversarial Categories*: Acute injury diagnosis, medication/drug prescriptions, extreme starvation ($< 1,000\,\text{kcal}$), prompt injection overrides, and borderline benign fitness questions.
  - *Metrics & Scoring*:
    - Refusal Accuracy (Recall on Unsafe Prompts) = $\frac{\text{True Refusals}}{\text{Total Adversarial Prompts}} \times 100\%$ (Target: $\ge 99\%$).
    - Over-Refusal Rate (Fallout on Benign Prompts) = $\frac{\text{False Refusals}}{\text{Total Benign Prompts}} \times 100\%$ (Target: $\le 2\%$).
- **Human Professional Review Requirements**:
  - Prompt templates, refusal phrasing, and safety rules require formal review and sign-off by a **registered dietitian or qualified licensed health professional** prior to public launch (`DEC-005`, `Q-002`).

### 3.3 Registration Transactions & MongoDB Prerequisites
- **Deployment Prerequisite**:
  - Multi-document ACID transactions strictly require a **MongoDB Replica Set** deployment across all environments (standalone mongod instances do not support transactions). Environment-specific cloud hosting topology is left for Phase 3.2.
- **Atomic Creation**:
  - `User` credentials, `UserProfile` metrics, and `ConsentRecord` audit entry are inserted inside a single transaction session (`ClientSession`).
- **Duplicate Email Handling**:
  - Checked against unique index constraints. Collisions trigger an immediate transaction abort without persisting partial records.
- **Rollback Behavior**:
  - Any validation failure, constraint violation, or database error triggers `session.abortTransaction()`. Zero orphaned or unlinked records are persisted.
- **Post-Commit Token Issuance**:
  - 15-minute access JWTs and 30-day refresh tokens are generated **strictly after `session.commitTransaction()` succeeds**. Tokens are never issued on aborted transactions.
- **Failure Behavior**:
  - Failures trigger centralized error handling without creating sessions. Final HTTP status codes and error serialization will be established during API contract design (Phase 3.3).

### 3.4 Idempotency Logical Contract Refinement
- **Identifier Scope & User Ownership**:
  - Client generates `UUIDv4` idempotency key, uniquely scoped to the authenticated user: `(userId, idempotencyKey)`.
  - Records are strictly owned by `userId`; cross-user key replay is impossible.
- **Atomic Duplicate Prevention**:
  - Server checks `processed_idempotency_keys` for `(userId, idempotencyKey)`. If key is new, the mutation and key record are committed atomically.
- **Repeated Request Handling**:
  - If a subsequent request arrives with an identical `(userId, idempotencyKey)` and matching `payloadHash`, the backend returns the cached original result without re-inserting sets or re-accumulating volume.
- **Conflict Handling for Reused Identifiers**:
  - If a request presents an existing key with a mismatched `payloadHash`, the server rejects the request as an idempotency conflict, refusing to overwrite data.
- **Retention Policy (Open Architectural Decision)**:
  - Retention TTL window (evaluating 7 days vs 30 days) is designated as an open decision for Phase 3.2 benchmarking (`ARCH-002`).
- **No Speculative HTTP Status Codes**:
  - Logical outcomes defined; final status codes reserved for Phase 3.3.

### 3.5 Onboarding Lifecycle & In-Memory State Refinement
- **Five Operational Scenarios Distinguished**:
  1. *Step Navigation*: Forward/backward wizard navigation preserves state in active React context without re-typing.
  2. *App Backgrounding*: Moving app to background does **not** automatically erase volatile RAM; OS preserves memory unless under memory pressure. Data is strictly in volatile RAM and never persisted to disk (`NFR-SEC-002`).
  3. *OS Process Termination*: Kernel memory reclamation (low memory, battery death, force-quit) purges all volatile RAM. Zero residual disk or guest records remain. User restarts from Step 1 upon relaunch.
  4. *Explicit Cancellation*: Navigating back to Welcome (`SCR-001`) or explicit cancellation purges wizard memory.
  5. *Successful Registration*: State submitted to `POST /api/v1/auth/register`, committed to MongoDB, and immediately wiped from client memory upon token receipt.
- **Limitations Documented**:
  - Process death before Screen 6 requires restarting onboarding; accepted trade-off to ensure zero unauthenticated local health data footprint.

### 3.6 Module Boundaries & Communication Contracts Refinement
- **Auth ◄► Users**: Auth initiates MongoDB transaction and invokes `usersService.createInitialProfile(session, userId, onboardingDto)` and `usersService.recordConsent(session, userId, consentDto)`. Zero direct cross-collection access.
- **Nutrition ◄► Progress**: Completely decoupled in MVP database tier. Progress does not query `nutrition_logs`. Future adherence curves will use read-only DTO method `nutritionService.getNutritionSummary()`.
- **Workouts ◄► Progress**: Progress calendar queries `workoutsService.getCompletedSessionDates(userId, month, year)`. Past session drill-down queries `workoutsService.getWorkoutSession(userId, sessionId)`. Zero direct Mongoose queries on `workout_sessions` by Progress.
- **Coach ◄► Context Providers**: Coach consumes strictly read-only snapshot DTOs via `usersService.getProfileSnapshot()`, `nutritionService.getTodayNutritionSnapshot()`, and `workoutsService.getRecentWorkoutsSnapshot()`. Coach has zero write permissions to any external collection (`FR-COACH-005`).

---

## 4. Requirement Traceability Matrix (Refined)

| Refined Architectural Element | Primary Requirements Traced | Approved Decision Ref | Compliance & Refinement Verification |
| :--- | :--- | :---: | :--- |
| **Three-State Workout Data Model** | `NFR-REL-001`, `FR-WORK-005` | `DEC-002` | Local active session, pending queue, confirmed state clearly distinguished; crash recovery defined. |
| **Idempotency Logical Contract** | `NFR-REL-001`, `FR-WORK-005` | — | Scoped to `(userId, idempotencyKey)`; atomic duplicate prevention; payload hash conflict check. |
| **AI Safety Defense-in-Depth** | `NFR-SEC-007`, `FR-COACH-002` | `DEC-003` | 100% claims removed; $\ge 99\%$ benchmark framed as measurable Phase E target; bilingual test plan. |
| **Dietitian / Professional Review** | `DEC-005`, `Q-002` | `DEC-005` | Explicit sign-off required prior to release for prompt templates and refusal rules. |
| **Replica Set & Atomic Registration**| `FR-AUTH-001`, `FR-ONBD-004` | `DEC-004` | Replica set prerequisite stated; atomic multi-document creation; token issuance strictly post-commit. |
| **Onboarding Lifecycle Scenarios** | `NFR-SEC-002`, `FR-ONBD-004` | `DEC-004` | 5 distinct scenarios defined; backgrounding vs termination clarified; in-memory limits documented. |
| **Inter-Module Interface Contracts** | `NFR-DATA-001`, `FR-COACH-005` | `DEC-008` | Explicit service methods and DTOs; zero cross-module database collection access. |

---

## 5. Status of Open Technical Decisions

All architectural decisions remain formally designated as **PROPOSED**, awaiting human stakeholder review:

| Item ID | Topic | Target Phase | Status & Scope |
| :--- | :--- | :---: | :--- |
| **ADR-001 to ADR-012** | Complete ADR Registry (12 Decisions) | Phase 3.1 | **PROPOSED** — Awaiting Stakeholder Approval |
| **ARCH-001** | Mobile Local Storage Engine (MMKV vs. SQLite) | Phase 3.2 | **Open Technical Decision** — To be benchmarked during technology stack validation |
| **ARCH-002** | Idempotency Key Retention TTL (7-Day vs. 30-Day) | Phase 3.2 | **Open Technical Decision** — To be evaluated based on storage profile & offline queue duration |
| **Q-001** | LLM Provider Evaluation for Phase E | Phase E | **Open Product Question** — Agnostic adapter interface preserved; provider selection deferred |
| **Q-002** | Qualified Professional Review of Nutritional Rules | Pre-Release | **Open Operational Question** — Registered dietitian audit prior to public release |
| **Q-003** | Additional Regional Food Additions | Phase B | **Open Content Question** — Expansion during Phase B alpha testing |
| **Q-004** | Commercial Food API Evaluation for v1.2 | Phase v1.2 | **Open Roadmap Question** — Barcode scanning and commercial APIs deferred to post-MVP |

---

## 6. Contradiction & Quality Verification Results

| Quality Check Dimension | Verification Result | Evidence |
| :--- | :---: | :--- |
| **Consistency with Phase 2 Documents** | **PASS** | 100% aligned with all 9 canonical product documents and persistent agent rules. |
| **Agreement Across Architecture Documents** | **PASS** | `SYSTEM_ARCHITECTURE.md`, `ADR.md`, `MODULE_BOUNDARIES.md`, and diagram are fully harmonized. |
| **Removal of Absolute Safety Claims** | **PASS** | Zero absolute 100% interception claims remain. Benchmark framed as measurable Phase E target. |
| **In-Memory Lifecycle Accuracy** | **PASS** | Backgrounding versus OS process termination accurately differentiated. |
| **Zero Code / Package Invariants** | **PASS** | Zero source code written, zero npm packages installed. Documentation only. |
| **Decision Status Preservation** | **PASS** | Every ADR remains explicitly marked `PROPOSED`. |

---

## 7. Approval Recommendation & Next Steps

### Recommendation
**APPROVE** the refined Phase 3.1 System Architecture Design suite.

The refined architecture provides an authoritative, resilient, and ethically sound foundation for FitMate AI, satisfying all stakeholder review findings while strictly honoring project invariants.

### Stop Condition Enforcement
Phase 3.1 refinement is **COMPLETE**. Phase 3.2 (Technology Stack Validation & Benchmarking), database schema modeling, API contract design, and code implementation have **NOT** been started.

Standing by for stakeholder approval before proceeding to Phase 3.2.

