# FitMate AI — Architecture Decision Records (ADRs)

**Document Version:** 1.1.0  
**Phase:** 3.1 — System Architecture Design  
**Status:** PROPOSED (Awaiting Human Review & Approval)  
**Last Updated:** 2026-11-01  
**Change History:**  
- v1.0.0 (2026-11-01): Initial 13 Architecture Decision Records.  
- v1.1.0 (2026-11-01): Reconciled credential storage boundaries (runtime memory access token + platform secure storage for refresh token), atomic registration across 4 collections with unrecoverable hash recovery path and duplicate-email UX, offline sync verification capabilities vs limitations, AI safety full buffering and memory reference disposal, float64 representation realities and boundary rounding, non-universal Arabic line-height benchmarking, catalog build-time hash validation, dual communication paths for body weight with snapshot reliability, and registered open architectural decisions ARCH-001 through ARCH-006.  
**Author:** Antigravity Senior Software Architect  

---

## Decision Index

| Decision ID | Decision Title | Status | Primary Requirements Traced |
| :--- | :--- | :---: | :--- |
| **ADR-001** | Backend Architectural Pattern: Modular Monolith | **PROPOSED** | `NFR-DATA-001`, `NFR-PERF-003`, `DEC-008` (Context) |
| **ADR-002** | Mobile Client Architecture: React Native & Expo Router | **PROPOSED** | `NFR-PERF-001`, `NFR-I18N-001`, `DEC-009` |
| **ADR-003** | Mobile Server-State Management: TanStack Query | **PROPOSED** | `NFR-PERF-002`, `FR-NUTR-005`, `FR-WORK-003` |
| **ADR-004** | Mobile Credential Storage: Runtime Memory Access Token & Platform Secure Storage for Refresh Token | **PROPOSED** | `NFR-SEC-001`, `FR-AUTH-001`, `FR-AUTH-003` |
| **ADR-005** | Pre-Registration State Lifecycle: Pure Transient In-Memory | **PROPOSED** | `NFR-SEC-002`, `FR-ONBD-004`, `DEC-004` |
| **ADR-006** | Atomic Registration Architecture: Multi-Document Transaction | **PROPOSED** | `FR-AUTH-001`, `FR-ONBD-004`, `DEC-004` |
| **ADR-007** | Offline Workout Logging & Idempotent Synchronization | **PROPOSED** | `NFR-REL-001`, `NFR-REL-002`, `FR-WORK-005` |
| **ADR-008** | AI Coach Abstraction: Provider-Agnostic Adapter Pattern | **PROPOSED** | `DEC-003`, `FR-COACH-001`, `Q-001` |
| **ADR-009** | Multi-Layered AI Safety & Non-Medical Guardrail Pipeline | **PROPOSED** | `NFR-SEC-007`, `FR-COACH-002`, `FR-COACH-005` |
| **ADR-010** | Canonical SI Metric Storage with Client-Side Dynamic Conversion | **PROPOSED** | `FR-I18N-002`, `DEC-009`, `NFR-DATA-001` |
| **ADR-011** | Bi-Directional Layout & Typographic Line-Height Scaling Engine | **PROPOSED** | `NFR-I18N-001`, `NFR-I18N-002`, `DEC-009` |
| **ADR-012** | Food & Exercise Search Sourcing: Bundled Offline Datasets | **PROPOSED** | `DEC-001`, `DEC-002`, `FR-NUTR-003`, `FR-WORK-001` |
| **ADR-013** | Data Ownership of Body Weight: Authoritative Ledger vs. Profile Snapshot | **PROPOSED** | `FR-PROG-001`, `FR-ONBD-002`, `NFR-DATA-001` |

---

## ADR-001: Backend Architectural Pattern: Modular Monolith

### Context & Problem
FitMate AI requires a backend architecture that can deliver high developer velocity, strict domain separation, low operational complexity, and low request latency (p95 $< 200\,\text{ms}$) during MVP validation, while avoiding premature microservice distributed systems overhead.

### Proposed Decision
Adopt a **Modular Monolith** architecture implemented in Node.js with TypeScript and Express. The backend will be organized into strictly bounded domain modules (`auth`, `users`, `nutrition`, `workouts`, `progress`, `coach`, `shared`). Modules communicate strictly through public service interfaces, with direct cross-module database collection access strictly prohibited.

### Why This Decision is Appropriate
- **Zero Network Serialization Overhead**: In-process service calls eliminate inter-service HTTP/gRPC latency and network failure modes, keeping API response latency well within target ($< 200\,\text{ms}$).
- **Single Deployment Artifact**: Dramatically simplifies CI/CD pipelines, container management, and environment orchestration for the MVP team.
- **Strict Boundary Preservation**: Encapsulating module state and schemas behind public interfaces preserves high cohesion and low coupling, enabling straightforward extraction into microservices in future phases if specific modules (e.g., AI Coach or Workout Sync) face independent scaling bottlenecks.

### Alternatives Considered
- **Microservices Architecture**: Rejected as premature optimization. Microservices would introduce distributed tracing overhead, eventual consistency complexities, API gateway routing delays, and high infrastructure costs for an MVP validation phase.
- **Traditional Layered Monolith (Flat Spaghetti)**: Rejected because grouping all controllers, models, and services in global flat directories leads to cross-domain leaks, circular dependencies, and high refactoring debt.

### Trade-offs & Consequences
- **Trade-off**: Requires strict developer discipline and linting rules to prevent accidental direct imports across module boundaries.
- **Consequence**: All modules share a single Node.js runtime and database connection pool; an unhandled exception in one module could affect others if not isolated by the centralized error boundary.

### Related Product Requirements
`NFR-DATA-001`, `NFR-PERF-003`, `DEC-008` (Phased implementation sequence context; the Modular Monolith is a proposed architectural pattern designed to support phased delivery, not an approved Phase 2 decision).

### Open Questions
None.

### Decision Status
**PROPOSED** (Awaiting Human Approval).

---

## ADR-002: Mobile Client Architecture: React Native & Expo Router

### Context & Problem
FitMate AI requires a mobile client capable of delivering native 60 FPS performance, seamless hardware integrations (haptics, secure store), first-class bi-directional layout mirroring (Arabic RTL and English LTR), and rapid cross-platform deployment to both iOS and Android from a single unified codebase.

### Proposed Decision
Build the mobile client using **React Native with Expo** (Managed Workflow with Custom Dev Client capability) and **Expo Router** (file-based navigation).

### Why This Decision is Appropriate
- **Unified Cross-Platform Core**: Reuses 100% of business logic, validation schemas (Zod), and calculation utilities across iOS and Android.
- **Expo Router Ergonomics**: Provides file-based, deeply linkable, type-safe navigation reflecting the physical directory structure (`app/(auth)`, `app/(tabs)`, `app/workout`), aligning with `SCREEN_INVENTORY.md`.
- **First-Class RTL Support**: Native integration with `I18nManager` allows dynamic layout direction switching without third-party webview shims.
- **Hardware Integrations**: Direct support for `expo-secure-store`, `expo-haptics`, and `expo-image`.

### Alternatives Considered
- **Flutter**: Evaluated for UI consistency, but rejected because sharing TypeScript validation schemas and calculation utilities between mobile and Node.js backend significantly reduces code duplication and drift.
- **Bare React Native (Without Expo)**: Rejected due to unnecessary native build configuration overhead and complex native module maintenance that Expo now handles transparently.

### Trade-offs & Consequences
- **Trade-off**: Slightly larger initial bundle size compared to a purely native Swift/Kotlin application.
- **Consequence**: Mitigated by Expo EAS bundle splitting and dead-code elimination.

### Related Product Requirements
`NFR-PERF-001`, `NFR-I18N-001`, `DEC-009`.

### Open Questions
None.

### Decision Status
**PROPOSED** (Awaiting Human Approval).

---

## ADR-003: Mobile Server-State Management: TanStack Query

### Context & Problem
Mobile fitness logging requires immediate feedback for physical actions (e.g., logging a completed heavy set or adding a meal), resilient background caching, automated cache invalidation, and decoupling asynchronous network writes from UI rendering frames.

### Proposed Decision
Adopt **TanStack Query (React Query)** as the authoritative server-state and caching layer on the mobile client. Pair it with **React Context / Zustand** strictly for transient active workout session state.

### Why This Decision is Appropriate
- **Optimistic Updates**: Enables sub-50ms UI feedback for meal and set logging (`FR-NUTR-005`, `NFR-PERF-002`) by mutating local cache instantly while dispatching network requests in the background.
- **Declarative Cache Invalidation**: Query Key Factory pattern (`workoutKeys`, `nutritionKeys`) guarantees predictable cache invalidation when data mutations succeed.
- **Automatic Background Synchronization**: Built-in retry mechanisms, window-focus re-fetching, and offline query caching.

### Alternatives Considered
- **Redux Toolkit**: Rejected as overly boilerplate-heavy for server-state synchronization; requires manual management of request statuses (`loading`, `error`, `success`) and cache lifecycles.
- **Local React State Alone**: Rejected because cross-screen cache coherence (e.g., updating remaining calories on Dashboard when a meal is logged in Diary) becomes complex and bug-prone.

### Trade-offs & Consequences
- **Trade-off**: Active workout logging in subterranean gyms requires a persistent queue that outlives app process death, which standard TanStack Query in-memory cache alone does not guarantee without persistent mutation queueing.
- **Consequence**: Active workout session state will be backed by a dedicated local storage ledger (see ADR-007).

### Related Product Requirements
`NFR-PERF-002`, `FR-NUTR-005`, `FR-WORK-003`.

### Open Questions
None.

### Decision Status
**PROPOSED** (Awaiting Human Approval).

---

## ADR-004: Mobile Credential Storage: Runtime Memory Access Token & Platform Secure Storage for Refresh Token

### Context & Problem
Authentication credentials and session tokens must be protected on user mobile devices against extraction via unauthorized file-system reads, device backup extraction, and application tampering, conforming to OWASP Mobile Top 10 standards (`NFR-SEC-001`). However, access tokens and refresh tokens possess fundamentally different lifespans and security requirements, and Android device hardware security capabilities are heavily fragmented across OEMs.

### Proposed Decision
Implement a segregated mobile credential storage architecture:
1. **Short-Lived Access Token (JWT)**:
   - Stored **strictly in application runtime memory**.
   - **Never persisted** to unencrypted `AsyncStorage`, SQLite, or `expo-secure-store`.
   - Bounded to a strict **15-minute lifespan**.
   - Lost immediately upon application process termination (force-quit, OS memory reclamation, device reboot).
2. **Long-Lived Refresh Token**:
   - Persisted on the device using **`expo-secure-store`** (backed by iOS Keychain and Android KeyStore / EncryptedSharedPreferences).
   - Plain unencrypted `AsyncStorage` is strictly banned for credential persistence.
   - Bounded to a 30-day lifespan (subject to final session policy in `ARCH-003`).
3. **Platform Secure Storage vs. Hardware-Backed Protection Realities**:
   - The architecture explicitly distinguishes platform secure storage from guaranteed hardware-backed security.
   - While iOS devices provide Secure Enclave hardware protection, Android hardware security is fragmented; budget or legacy Android devices may lack StrongBox or Hardware Security Modules (HSM) and fall back to software-backed keystores. The architecture utilizes platform secure storage as the strongest OS-provided mechanism without claiming universal hardware-backed guarantees across all device models.
4. **Backend Cryptographic Hashing**:
   - The backend stores strictly a **one-way SHA-256 hash** of the refresh token in `refresh_tokens`. Raw refresh tokens are never logged or persisted on the server.

### Why This Decision is Appropriate
- **Minimization of Exposure**: Keeping the access token in volatile RAM guarantees that even a physical flash dump of device storage cannot recover an active access token.
- **OWASP Mobile Compliance**: Satisfies `NFR-SEC-001` by eliminating M1 (Improper Credential Usage) and protecting refresh tokens behind OS-level cryptographic keystores.
- **Clean Session Lifecycle**: Cold application launches retrieve the refresh token from `expo-secure-store` and silently request a fresh in-memory access token via `POST /api/v1/auth/refresh`.

### Alternatives Considered
- **Persisting Access Tokens in SecureStore**: Rejected because writing short-lived JWTs to disk/keystore introduces unnecessary I/O overhead on every request and increases the attack surface if device storage is examined.
- **AsyncStorage for Tokens**: Strictly rejected due to plain-text SQLite file exposure on rooted/jailbroken devices.

### Trade-offs & Consequences
- **Trade-off**: When an app process is terminated, the access token is lost and must be re-minted on launch.
- **Consequence**: The mobile app executes a transparent background silent refresh during cold launch, requiring negligible latency ($< 150\,\text{ms}$) before rendering authenticated screens.

### Related Product Requirements
`NFR-SEC-001`, `FR-AUTH-001`, `FR-AUTH-003`.

### Open Questions
- Refresh token rotation policy and reuse detection evaluation (`ARCH-003`).

### Decision Status
**PROPOSED** (Awaiting Human Approval).

---

## ADR-005: Pre-Registration State Lifecycle: Pure Transient In-Memory State

### Context & Problem
During the 5-step onboarding wizard (`SCR-001` to `SCR-007B`), new users input personal metrics (age, biological sex, height, weight, activity, and goals) and health disclaimer consent before creating an account. The architecture must guarantee user privacy, prevent unauthorized local health data persistence, and adhere strictly to `NFR-SEC-002` and approved decision `DEC-004`. The system must clearly distinguish user step navigation, app backgrounding, OS termination, explicit cancellation, and successful account registration.

### Proposed Decision
Retain pre-registration onboarding inputs **strictly in transient, in-memory React application state** (via a scoped React Context/Hook). Under no circumstances shall pre-registration data be written to local flash storage, SQLite, unencrypted `AsyncStorage`, or temporary server guest records.

The lifecycle behavior is explicitly defined as follows:
1. **Step Navigation (Forward & Backward)**: Moving between steps (`SCR-001` through `SCR-007B`) maintains state in memory, allowing users to navigate back and correct inputs without re-typing.
2. **App Backgrounding**: Moving the application to the background does **not** automatically purge volatile memory. The operating system preserves the app in RAM unless reclaimed under memory pressure. However, while in background, data remains in volatile RAM and is never written to disk or flash storage.
3. **OS Process Termination (Force-Kill / Memory Reclamation)**: If the operating system terminates the process due to memory pressure, battery death, or user swipe-kill, volatile RAM is immediately purged by the OS kernel. No disk records or guest accounts remain. Upon relaunching, the user must restart onboarding from Step 1.
4. **Explicit Cancellation**: Navigating back to the Welcome screen or tapping an explicit cancel/reset action triggers an immediate purge of all wizard state from memory.
5. **Successful Registration**: State is transmitted in the registration payload, committed to MongoDB, and immediately purged from client memory upon receiving session tokens.

### Why This Decision is Appropriate
- **Zero Local Footprint**: Volatile RAM ensures zero unauthenticated personal health data lingers on the physical device.
- **Zero Cloud Guest Clutter**: Prevents accumulation of abandoned anonymous guest accounts and orphaned documents in MongoDB.
- **Strict Privacy Compliance**: Eliminates data leak vectors before explicit user registration and authentication take place.

### Alternatives Considered
- **Local Disk Caching for Onboarding Resumption**: Rejected because caching unauthenticated sensitive health indicators on disk violates `NFR-SEC-002`.
- **Anonymous Cloud Guest Accounts**: Rejected per `DEC-004`. Creating guest accounts requires complex guest-to-user migration logic, introduces database bloat, and creates orphan data liabilities.

### Trade-offs & Consequences
- **Trade-off**: If an onboarding user's device terminates the process due to OS memory pressure or battery death before Screen 6, the user must restart the 5-step wizard.
- **Consequence**: Onboarding is streamlined to take $< 90$ seconds across 5 quick steps, making the friction minimal compared to the privacy and security guarantees.

### Related Product Requirements
`NFR-SEC-002`, `FR-ONBD-004`, `DEC-004`.

### Open Questions
None.

### Decision Status
**PROPOSED** (Awaiting Human Approval).

---

## ADR-006: Atomic Registration Architecture: Multi-Document Transaction Across Four Collections

### Context & Problem
When a user registers on Screen 6 (`SCR-004`), the system must create user account credentials, persist onboarding physical profile metrics, record health disclaimer consent, and establish the initial session refresh token. If any part of this operation fails, the system must not leave orphaned records. Furthermore, registration must be a public unauthenticated endpoint that does not require an existing access token (`FR-AUTH-001`, `DEC-004`). In distributed mobile environments, network connections may drop immediately after the database commits, leaving the account created while the client never receives the response tokens.

### Proposed Decision
Implement `POST /api/v1/auth/register` as an **unauthenticated public endpoint** orchestrated by `AuthModule` that executes an **atomic MongoDB multi-document ACID transaction** using a MongoDB `ClientSession` across four collections:

1. **Deployment Prerequisite**: Multi-document ACID transactions strictly require a **MongoDB Replica Set** deployment across all environments.
2. **Transaction Scope Across Four Collections**:
   - `User` credentials document in `users` (`AuthModule`). Password hashing uses **Argon2id** (memory: 64MB, time: 3, parallelism: 4) or fallback **bcrypt** with work factor $\ge 12$ rounds (`NFR-SEC-003`). Parameters are never mixed or conflated.
   - `UserProfile` document with physical traits and Mifflin-St Jeor targets in `user_profiles` (`UsersModule`).
   - Immutable `ConsentRecord` audit entry in `consent_records` (`UsersModule`).
   - Initial hashed refresh token document in `refresh_tokens` (`AuthModule`).
3. **Transaction Ownership Invariant**:
   - `AuthModule` coordinates the transaction lifecycle and is the sole authority permitted to call `session.commitTransaction()` or `session.abortTransaction()`.
   - `UsersModule` creates `user_profiles` and `consent_records` using the passed session handle and must NEVER commit or abort the transaction.
4. **Token Preparation & Commit Rules**:
   - The raw refresh token is generated in runtime memory before commit, hashed with SHA-256, and only its hash is persisted in `refresh_tokens`.
   - The access JWT and raw refresh token are returned to the client **only after `session.commitTransaction()` succeeds**. No token is ever returned if the transaction aborts.
5. **Rollback Behavior**:
   - Any write failure (validation error, unique constraint collision, timeout) triggers an immediate `session.abortTransaction()`. Zero orphaned records exist.
6. **Post-Commit Network Failure & Idempotent Retry Strategy**:
   - If the transaction commits successfully but the network connection drops before the client receives the response payload:
     - The user account exists safely in MongoDB, but the client possesses no tokens.
     - *Why Raw Refresh Token Cannot Be Recovered*: The backend stored only a SHA-256 one-way cryptographic hash of the refresh token. The raw token was discarded from server memory upon response delivery. The server **cannot decrypt or recover the original raw refresh token**.
     - *Why Unauthenticated Re-Issuance is Prohibited*: Allowing an unauthenticated request presenting an idempotency key to mint new session tokens without password authentication would introduce an unauthenticated session hijacking vulnerability.
     - *Authoritative Recovery Strategy & Duplicate-Email UX*:
       - If the client or user re-submits registration with the same email, the transaction detects the collision on `users.email` and returns `409 Conflict` (`EMAIL_ALREADY_EXISTS`).
       - The mobile client intercepts this conflict and displays a clear, helpful recovery modal:
         *"An account with this email address already exists. If you just registered, your account was created successfully! Please log in with your password to continue."*
       - The user is redirected to Login (`SCR-002`) with their email address pre-filled.
       - The user enters their password. `POST /api/v1/auth/login` verifies credentials via Argon2id/bcrypt and mints fresh tokens.
       - The un-exchanged initial refresh token expires naturally via its 30-day TTL index or is superseded upon first login.

### Why This Decision is Appropriate
- **All-or-Nothing Atomicity**: Guarantees that a user account cannot exist without its corresponding profile metrics, consent record, and initial session token.
- **Unauthenticated Public Access**: Eliminates circular token dependencies during onboarding.
- **Cryptographic & Operational Defense**: Prevents session hijacking and avoids impossible cryptographic decryption claims.

### Alternatives Considered
- **Two-Step Register-Then-Profile Setup**: Rejected because network drops between steps create orphaned "half-initialized" user accounts requiring complex onboarding resume guards.
- **Storing Encrypted Refresh Tokens to Allow Recovery**: Rejected because storing reversible encryption keys on the backend increases server-side compromise blast radius compared to irreversible SHA-256 hashing.

### Trade-offs & Consequences
- **Trade-off**: Requires running a MongoDB replica set across all environments.
- **Consequence**: Handled via containerized replica set initialization in Docker compose for development environments.

### Related Product Requirements
`FR-AUTH-001`, `FR-ONBD-004`, `DEC-004`, `NFR-SEC-001`, `NFR-SEC-003`.

### Open Questions
- Specific managed MongoDB hosting provider and cluster sizing, which will be evaluated during Phase 3.2.

### Decision Status
**PROPOSED** (Awaiting Human Approval).

---

## ADR-007: Offline Workout Logging & Idempotent Synchronization Engine

### Context & Problem
Gyms are frequently located in subterranean basements or shielded structures with zero cellular connectivity. Users must be able to log completed sets, view rest timers, and complete full workouts with high operational reliability offline (`NFR-REL-001`, `FR-WORK-005`). When connectivity is restored, intermittent signals must not cause duplicate sets, inflated tonnage calculations, or silent data loss. However, for workout sessions initiated and completed entirely offline, the server has never seen the session and client device wall clocks cannot be trusted authoritatively.

### Proposed Decision
Implement a **Local-First, Append-Optimistic architecture** with a **Three-State Data Model**, **Per-Session FIFO Sync Ledger**, and **Backend Idempotency Verification**:

1. **Three-State Client Model**:
   - *Local Active Session State*: Live session written synchronously to local device storage. UI reports a mutation as locally saved only after successful local persistence confirmation.
   - *Pending Synchronization Queue*: Ordered FIFO queue of mutations per workout session awaiting backend acknowledgment, tracking retry counts and exponential backoff with jitter. Independent mutation streams (meals, body weight) operate on separate queues and are never blocked.
   - *Confirmed Server State*: Server-acknowledged sessions moved to confirmed history and dequeued from pending sync.
2. **Queue Dependency Ordering & Fault Quarantine**:
   - Mutations within an active workout session form an explicit dependent causal chain:
     $$\text{StartSession} \longrightarrow \text{LogSet}_1 \longrightarrow \text{LogSet}_2 \longrightarrow \dots \longrightarrow \text{CompleteSession}$$
   - FIFO ordering is strictly preserved per session (`sessionClientUuid`).
   - If a prerequisite mutation encounters a permanent failure (e.g. unrecoverable validation error), subsequent dependent mutations for that specific session are **quarantined and halted** (`status: "failed_quarantined"`) to prevent applying sets out of order or corrupting volume metrics.
   - *User Recovery Options*: The user is alerted with options to (1) **Retry All**, (2) **Export Raw Log** to device storage (JSON/text) to avoid workout data loss, or (3) **Discard Session**.
   - Independent queues (meals, body weight) continue normal syncing in parallel without blockage.
3. **Idempotency Logical Contract & Server Verification Boundaries**:
   - *Identifier Scope & Ownership*: Client generates a `UUIDv4` idempotency key, strictly scoped to the authenticated user: `(userId, idempotencyKey)`.
   - *Atomic Duplicate Prevention*: Backend enforces a compound unique database index on `{ userId: 1, idempotencyKey: 1 }` in `processed_idempotency_keys`. Both workout session updates and idempotency records participate in the **same atomic database transaction**.
   - *Conflict Handling*: If an existing key arrives with a mismatched payload hash, the server rejects the request as an idempotency conflict (`409 Conflict`).
   - *Server Verification Capabilities & Limitations for Offline Sessions*:
     - **What the Server CANNOT Verify**: For sessions initiated entirely offline, the server **cannot authoritatively verify the exact historical physical wall-clock start time**. Client clocks can be manipulated or experience drift. The architecture explicitly rejects any false claim of guaranteed server-authoritative start time verification for offline-created sessions.
     - **What the Server CAN Verify**: The server verifies the exact arrival timestamp `receivedAt`, cryptographic authenticity of the submitting user via Bearer JWT, internal sequence and monotonic elapsed duration between sets, and idempotency uniqueness.
     - *Client Monotonic Time Guard*: The mobile client uses monotonic device uptime (`process.uptime` / native uptime ticks) to detect local device clock manipulation or clock resets.
     - *Server Bounded Window Acceptance*: A session is accepted only if its timestamps fall within a defensible bounded window:
       $$[ \text{receivedAt} - \text{MaxSupportedOfflineQueueAge}, \; \text{receivedAt} + \text{ForwardDriftTolerance} ]$$
       where `ForwardDriftTolerance` is bounded to $\le 5$ minutes.
     - *Behavior on Expired Mutations*: If a queued mutation arrives with timestamp older than `MaxSupportedOfflineQueueAge`, the backend **must NEVER silently replay or commit it**. It is rejected with `MUTATION_EXPIRED` / `QUEUE_AGE_EXCEEDED`, quarantined, and user recovery options are surfaced.
   - *Mandatory Retention Compatibility Constraint*:
     $$\text{IdempotencyRetentionTTL} \ge \text{MaxSupportedOfflineQueueAge}$$
     Idempotency key retention duration must be strictly greater than or equal to the maximum supported offline queue age. The exact TTL (7 vs 14 vs 30 days) is preserved as an open architectural decision for Phase 3.2 benchmarking (`ARCH-002`).
4. **Crash Recovery**: App launch inspects local storage for active unclosed workouts, offering one-tap resumption with exact sets and duration preserved (`NFR-REL-002`).
5. **Storage Engine Selection**: Final selection between candidate local storage engines (evaluating React Native MMKV vs. SQLite) is explicitly deferred to Phase 3.2 (`ARCH-001`).

### Why This Decision is Appropriate
- **Zero-Latency Logging**: Gym interactions execute in $< 50\,\text{ms}$ locally regardless of cellular dead zones.
- **Deduplication Guarantee**: Re-transmissions caused by spotty cellular connections do not inflate workout volume or create duplicate database records.
- **Realistic Trust Boundaries**: Acknowledges the limits of server verification for offline-generated data while bounding acceptance windows defensively.

### Alternatives Considered
- **Online-Only Logging**: Strictly rejected as subterranean gyms break online-only apps and violate `NFR-REL-001`.
- **Complex CRDT / Multi-Master Sync**: Rejected as unnecessary over-engineering for a single-user personal logging workflow.

### Trade-offs & Consequences
- **Trade-off**: Requires managing local sync state and backend idempotency tracking records.
- **Consequence**: Idempotency records utilize automated TTL indexes, bounding storage consumption.

### Related Product Requirements
`NFR-REL-001`, `NFR-REL-002`, `FR-WORK-005`.

### Open Questions
- Exact local storage engine evaluation on mobile (benchmarking SQLite vs. MMKV in Phase 3.2, `ARCH-001`).
- Idempotency key retention duration policy (benchmarking 7-day vs. 30-day TTL in Phase 3.2, `ARCH-002`).

### Decision Status
**PROPOSED** (Awaiting Human Approval).

---

## ADR-008: AI Coach Abstraction: Provider-Agnostic Adapter Pattern

### Context & Problem
The AI Coach feature (`Phase E`) requires LLM inference capabilities. However, locking the platform to a single AI vendor (OpenAI, Google Gemini, Anthropic) risks vendor lock-in, pricing changes, or API deprecation. Furthermore, product decision `DEC-003` explicitly requires a provider-agnostic interface with model evaluation deferred per `Q-001`.

### Proposed Decision
Architect the AI Coach integration behind a strict server-side **`AICoachAdapter`** interface. The domain service (`AICoachService`) interacts solely with this interface. Vendor-specific API clients (e.g., `GeminiAdapter`, `OpenAIAdapter`, `ClaudeAdapter`) implement this interface in isolated adapter classes.

```typescript
export interface AICoachAdapter {
  generateReply(request: CoachChatRequest): Promise<CoachChatResponse>;
  streamReply?(request: CoachChatRequest): AsyncIterable<string>;
}
```

### Why This Decision is Appropriate
- **Vendor Independence**: Switching providers or running A/B latency and cost benchmarks (`Q-001`) requires zero modifications to domain services, prompt guardrails, or database models.
- **Server-Side Encapsulation**: Third-party API keys are never exposed to the mobile client or committed to repositories.
- **Testability**: Enables straightforward unit and integration testing via a `MockAICoachAdapter` that outputs deterministic responses without incurring API token costs.

### Alternatives Considered
- **Direct Vendor SDK Integration (e.g. tightly coupled OpenAI client)**: Rejected because it violates `DEC-003` and prevents competitive model evaluation.
- **Client-Side LLM SDK**: Strictly rejected because it exposes API keys to client bundles and bypasses server-side prompt injection and safety guardrails.

### Trade-offs & Consequences
- **Trade-off**: Requires maintaining a unified request/response data model that maps across differing vendor parameter formats.
- **Consequence**: Standard text generation parameters (system prompt, messages array, temperature, max tokens) are universally supported across all major LLM APIs.

### Related Product Requirements
`DEC-003`, `FR-COACH-001`, `Q-001`.

### Open Questions
- Selection of specific LLM provider and model, which remains explicitly deferred to Phase E per approved decision `DEC-003` and open question `Q-001`.

### Decision Status
**PROPOSED** (Awaiting Human Approval).

---

## ADR-009: Multi-Layered AI Safety & Non-Medical Guardrail Pipeline

### Context & Problem
The AI Coach feature (`Phase E`) must provide conversational fitness and nutrition guidance while strictly preventing medical diagnosis, clinical injury evaluation, prescription recommendations, or extreme deficit diets ($< 1,000\,\text{kcal}$), upholding Core Invariant 1 and `NFR-SEC-007`. An AI system that streams unvalidated tokens directly to user devices cannot retract statements if dangerous advice is emitted at the end of a response.

### Proposed Decision
Implement an immutable **8-Step Processing Sequence** with **Complete Server-Side Response Buffering**:

1. **8-Step Safety Sequence**:
   - *Step 1: Ingress Rate Limiting*: Checks authenticated rate limit (20 msgs/hr per user, `FR-COACH-004`). In-memory for single-instance MVP; distributed Redis evaluated for Phase 3.2 (`ARCH-004`).
   - *Step 2: Layer 1 Deterministic Pre-Filter*: Fast regex keyword scan for acute clinical distress, pain, prescription requests, or extreme starvation ($< 1,000\,\text{kcal}$). Flagged queries return an immediate refusal envelope without calling the LLM.
   - *Step 3: Context Assembly (Read-Only)*: Assembles user target goal, experience level, active unit system, today's aggregated calories/macros from NutritionModule, and last 3 workouts from WorkoutsModule. Strict data minimization: zero personal identifiers, zero emails, zero birthdates. Surfaces informational AI Coach disclaimer (`SCR-013`).
   - *Step 4: Layer 2 System Persona Prompt*: Injects non-negotiable informational companion persona and explicit medical refusal boundaries (`DEC-003`).
   - *Step 5: External LLM Inference Dispatch*: Invokes external LLM via `AICoachAdapter` with strict 10-second timeout.
   - *Step 6: Complete Server Response Buffering*: The complete generated model response is buffered in server runtime memory. **Zero tokens are streamed to the mobile client during generation.**
   - *Step 7: Layer 3 Output Safety Validation*: Evaluates the complete buffered text for clinical diagnosis, drug prescriptions, or extreme diet endorsements.
   - *Step 8: Persistence & Delivery*:
     - *If Layer 3 passes*: Validated message is saved to `coach_messages` strictly through `CoachRepository` and delivered to client (HTTP 200).
     - *If Layer 3 flags unsafe content*: Generated text is **immediately discarded by releasing its object references** for garbage collection. It is NEVER saved in `coach_messages` and NEVER delivered to the client. A standard safe refusal envelope is substituted:
       `{ success: true, data: { reply: "I am an AI fitness coach and cannot provide medical advice, diagnosis, or prescription recommendations. Please consult a qualified healthcare professional.", isRefusal: true } }`.
       The safe refusal message is persisted in `coach_messages` with `isRefusal: true` so the user's chat transcript remains continuous. An internal audit telemetry log records the refusal without preserving the hazardous text.
2. **Provider Timeout & Operational Fallback Representation**:
   - On 10-second timeout or 5xx/429 errors from the external provider, returns a graceful fallback envelope:
     `{ success: true, data: { reply: "The AI Coach is currently unavailable. Please try again in a few moments.", isRefusal: false, isFallback: true } }`.
   - Stored in `coach_messages` with `isFallback: true` to preserve chat continuity.
3. **Provider Retention Terms (Open Question Q-001)**:
   - The architecture requires evaluating commercial LLM provider enterprise data privacy commitments during candidate evaluation (`Q-001`).
   - The architecture **does not claim guaranteed zero provider retention** until a specific provider's enterprise zero-retention terms and Business Associate / Data Processing Agreements are verified and contractually executed.
4. **Architectural Write Ban**:
   - Zero write access to external collections (`FR-COACH-005`).

### Evaluation Methodology & Target Validation (Phase E):
> [!IMPORTANT]
> The $\ge 99\%$ refusal benchmark from Phase 2 (`FR-COACH-002`, `NFR-SEC-007`) is a **measurable acceptance target**, not an established result. The architecture establishes the guardrail mechanisms, but achievement of the target must be empirically proven during Phase E through:
> - **Bilingual Coverage**: Testing across Modern Standard Arabic, regional dialects (Egyptian, Gulf, Levantine), Arabizi, and English.
> - **Adversarial Categories**: Acute injury diagnosis, medication/drug prescriptions, extreme starvation ($< 1,000\,\text{kcal}$), prompt injection overrides, and benign fitness questions with medical context.
> - **Metrics**:
>   - *Unsafe Prompt Refusal Recall* = $\frac{\text{True Refusals}}{\text{Total Adversarial Unsafe Prompts}} \times 100\%$ (Target: $\ge 99\%$).
>   - *Over-Refusal Rate (Benign Query Fallout)* = $\frac{\text{False Refusals}}{\text{Total Benign Prompts}} \times 100\%$ (Target: $\le 2\%$).
> - **Professional Review**: Prompt templates, refusal phrasing, and safety rules require review and sign-off by a registered dietitian or licensed medical professional prior to public release (`Q-002`).

### Why This Decision is Appropriate
- **Defense-in-Depth**: If an adversarial user crafts an obfuscated prompt that bypasses Layer 1, Layer 2 anchors the persona, and Layer 3 catches hallucinated medical advice.
- **No Token Retraction Risk**: Buffering complete responses on the server ensures unretractable dangerous tokens never appear on mobile screens.
- **Chat Continuity**: Persisting safe refusal envelopes and provider fallbacks in `coach_messages` maintains coherent chat history without gaps.

### Alternatives Considered
- **Direct Client Token Streaming**: Rejected because tokens once rendered on a mobile screen cannot be retracted if the model hallucinates a dangerous prescription at the end of generation.
- **Relying Solely on System Prompts**: Rejected because LLMs are vulnerable to prompt injections and jailbreaks.

### Trade-offs & Consequences
- **Trade-off**: Complete response buffering means the user experiences time-to-first-token latency equal to full response generation time ($\sim 1.5 - 3.5\,\text{s}$) rather than streaming tokens.
- **Consequence**: Mitigated by rich typing indicators on the mobile client (`SCR-013`) and justified by absolute clinical safety boundaries.

### Related Product Requirements
`NFR-SEC-007`, `FR-COACH-002`, `FR-COACH-003`, `FR-COACH-005`, `DEC-003`, `Q-002`.

### Open Questions
- Empirical benchmark validation against the bilingual adversarial test suite during Phase E (`Q-001`).
- Dietitian / medical professional review sign-off prior to release (`Q-002`).

### Decision Status
**PROPOSED** (Awaiting Human Approval).

---

## ADR-010: Canonical SI Metric Storage with Client-Side Dynamic Conversion

### Context & Problem
FitMate AI serves users across diverse regions requiring both Metric (kg, cm, ml) and Imperial (lbs, in, fl oz) measurement systems (`DEC-009`, `FR-I18N-002`). Storing mixed units in the database creates schema ambiguity, corrupts aggregation analytics, and leads to cumulative floating-point conversion drift. However, binary floating-point representations (IEEE 754) cannot represent all decimal fractions exactly, making claims of "mathematically perfect decimal fidelity" scientifically inaccurate.

### Proposed Decision
Persist all physical metrics in the backend database **strictly in canonical SI units** (body weight in kilograms `weightKg`, height in centimeters `heightCm`, workout tonnage in kilograms, liquids in milliliters) stored as standard IEEE 754 double-precision 64-bit binary floating point numbers (`number`).

To maintain consistent cross-platform presentation and mitigate conversion divergence:
1. **Floating-Point Representation Realities**: The architecture explicitly recognizes that IEEE 754 float64 arithmetic produces representation error in base-10 decimal fractions (`0.1 + 0.2 !== 0.3`). The system does NOT claim mathematically perfect decimal fidelity.
2. **Input Boundary Conversion**: Imperial inputs are converted at the UI boundary before payload dispatch and rounded to 2 decimal places:
   $$\text{weightKg} = \text{round}(lbs / 2.20462, 2)$$
   This bounds precision and prevents arbitrary recurring decimal expansion.
3. **Display Boundary Formatting**: Dynamic display conversion applies deterministic rounding:
   $$\text{weightLbs} = \text{round}(\text{weightKg} \times 2.20462, 1)$$
   $$\text{heightInches} = \text{round}(\text{heightCm} / 2.54, 1)$$
   and whole integers for calories and macro grams.
4. This explicit boundary rule bounds display variance and prevents round-trip conversion jitter across mobile surfaces (`DEC-009`, `FR-I18N-002`).

### Why This Decision is Appropriate
- **Single Source of Truth**: Backend queries, aggregation pipelines (e.g., total volume lifted, 7-day weight moving average), and Mifflin-St Jeor calculations operate exclusively on uniform numbers without unit branching.
- **Minimization of Conversion Drift**: Converting back and forth between units in database records causes rounding degradation over time. Storing canonical SI numbers ensures data consistency.
- **Instant Unit Switching**: When a user switches from Metric to Imperial in settings, zero database migration is required; the UI re-renders immediately.

### Alternatives Considered
- **Storing Values in User's Active Unit with a Unit Flag**: Rejected because database-level aggregations would require complex conditional conversion logic in every MongoDB pipeline.
- **Dual-Field Storage (`weightKg` and `weightLbs`)**: Rejected as schema redundancy prone to synchronization drift.

### Trade-offs & Consequences
- **Trade-off**: Requires standard conversion math at client input and display boundaries.
- **Consequence**: Deterministic boundary rounding rules eliminate perceptible display jitter while preserving database uniformity.

### Related Product Requirements
`FR-I18N-002`, `DEC-009`, `NFR-DATA-001`.

### Open Questions
None.

### Decision Status
**PROPOSED** (Awaiting Human Approval).

---

## ADR-011: Bi-Directional Layout & Typographic Line-Height Scaling Engine

### Context & Problem
Arabic is written right-to-left (RTL) with unique typographic characteristics. Standard mobile LTR layouts break in Arabic, causing reversed icons, backward navigation, and clipped diacritics/tashkeel if Latin line-height metrics are applied (`NFR-I18N-001`, `NFR-I18N-002`). However, font metrics differ substantially across typefaces; assuming a fixed $+25\%$ line-height increase as a universal rule without empirical font benchmarking risks loose, awkward layouts or inconsistent platform rendering.

### Proposed Decision
Implement a systemic **Bi-Directional Ergonomics Engine**:
1. All design system components use logical spacing properties (`paddingStart`, `paddingEnd`, `marginStart`, `marginEnd`, `alignSelf: 'flex-start'`).
2. Layout direction dynamically mirrors based on `I18nManager.isRTL`.
3. Typography components incorporate dynamic line-height expansion as a proposed design specification (tentatively $+20\%$ to $+25\%$ scaling) whenever active locale is Arabic (`locale === 'ar'`).
4. **Empirical Font Benchmarking (Open Decision ARCH-005)**: The proposed 20–25% increase is explicitly documented as a **design proposal, NOT a fixed universal rule**. Line-height ratios must be empirically benchmarked and validated against candidate typefaces (e.g., Cairo, Noto Sans Arabic), font weights, sizes, and device rendering engines during the Phase 3.2 design system validation (`ARCH-005`).

### Why This Decision is Appropriate
- **100% Bilingual Parity**: Guarantees authentic native ergonomics for Arabic speakers from Day 1 without afterthought patches (`DEC-009`).
- **Typographic Protection**: Scaled line-height bounds protect Arabic ascenders, descenders, and diacritical marks from vertical clipping (`NFR-I18N-002`).
- **Maintainability**: Developers write components once using logical properties; layouts adapt automatically to both LTR and RTL.

### Alternatives Considered
- **Separate Layout Files for Arabic and English**: Rejected as a maintenance nightmare that would double UI codebase size and lead to feature drift.
- **Fixed Uniform Line Heights**: Rejected because line heights tall enough for Arabic appear uncomfortably loose and disjointed in English.

### Trade-offs & Consequences
- **Trade-off**: Requires automated visual regression testing to verify that mirrored layouts do not introduce unexpected flex wrapping.
- **Consequence**: Handled during mobile UI testing and design token validation in Phase 3.2.

### Related Product Requirements
`NFR-I18N-001`, `NFR-I18N-002`, `DEC-009`.

### Open Questions
- Benchmarking candidate Arabic typefaces (Cairo vs. Noto Sans Arabic) and line-height ratios during Phase 3.2 (`ARCH-005`).

### Decision Status
**PROPOSED** (Awaiting Human Approval).

---

## ADR-012: Food & Exercise Search Sourcing: Bundled Offline Datasets & Build-Time Integrity

### Context & Problem
Gym and fitness logging requires instant food and exercise lookup ($< 50\,\text{ms}$, `NFR-PERF-001`). Subterranean gyms often have zero cellular connectivity. Searching external APIs (Nutritionix, Edamam) or remote databases introduces high latency, cost, failure modes, and breaks offline functionality. Furthermore, product decisions strictly mandate an initial curated Local Food Library (`DEC-001`), Curated Exercise Catalog (`DEC-002`), Quick Add without custom food CRUD (`DEC-010`), and exclusion of commercial food APIs in MVP (`Q-004`).

### Proposed Decision
Implement a **Bundled Offline Static Dataset Architecture** with **Build-Time Hash Validation**:
1. **Source of Truth**: The authoritative seed datasets reside strictly in the backend repository (`src/modules/nutrition/seed/food_library.seed.json` and `src/modules/workouts/seed/exercise_catalog.seed.json`).
2. **Backend Database Seeding**: MongoDB collections `food_library` (~150–200 items) and `exercise_catalog` (~100 items) are seeded from these authoritative files on database setup, each tagged with `catalogVersion` (e.g. `"1.0.0"`).
3. **Mobile Client Asset Bundling**: Compiled application bundles include identical static JSON assets in `assets/data/`.
4. **Build-Time Integrity Validation**: During mobile build preparation, a documentation-governed validation step computes SHA-256 checksums of the seed files to guarantee that bundled mobile assets match the backend baseline bit-for-bit.
5. **Client-Side In-Memory Search**: On app launch, datasets are indexed in mobile memory. Search on `SCR-011` (Food Search) and `SCR-016` (Exercise Catalog) queries this local index in $< 50\,\text{ms}$ with zero network requests.
6. **Update Strategy**: For MVP, catalog additions and regional food updates (`Q-003`) are deployed via application releases (Expo OTA or app store binary updates). Remote catalog sync scripts or dynamic remote catalog downloads are strictly deferred post-MVP.

### Why This Decision is Appropriate
- **Sub-50ms Search Performance**: Zero network round-trips guarantee instant search response times.
- **Zero-Connectivity Reliability**: Users can search foods and select exercises deep inside subterranean gym basements.
- **Zero Third-Party Costs & Zero Scope Creep**: Respects `DEC-001`, `DEC-002`, `DEC-010`, and `Q-004`.

### Alternatives Considered
- **Remote Database Search via REST**: Rejected because network latency in poor gym environments degrades UX and breaks offline requirements.
- **Third-Party Nutrition APIs in MVP**: Rejected per `DEC-001` and `Q-004` due to licensing costs, rate limits, and lack of regional Middle Eastern food data.

### Trade-offs & Consequences
- **Trade-off**: Adding new foods or exercises requires an application release update.
- **Consequence**: Completely acceptable for MVP's curated baseline scope.

### Related Product Requirements
DEC-001, DEC-002, DEC-010, FR-NUTR-003, FR-WORK-001, NFR-PERF-001, Q-004.

### Open Questions
- Regional food additions based on alpha user feedback (Q-003).

### Decision Status
**PROPOSED** (Awaiting Human Approval).

---

## ADR-013: Data Ownership of Body Weight Records: Authoritative Ledger vs. Operational Profile Snapshot

### Context & Problem
Both `ProgressModule` (responsible for weight trend analytics, 7-day moving averages, and the progress dashboard on `SCR-020`) and `UsersModule` (responsible for user profile management, baseline physical attributes, and Mifflin-St Jeor metabolic formula inputs on `SCR-021`) require body weight information. Allowing two modules to independently create or mutate weight records without unambiguous ownership causes dual-write synchronization drift, database coupling, and race conditions. However, claiming that communication between these modules is "completely unidirectional" is inaccurate: `UsersModule` issues synchronous service commands to `ProgressModule`, while `ProgressModule` publishes asynchronous domain events back to `UsersModule`.

### Proposed Decision
Implement a **Strict Single-Ownership Model** with **Dual Communication Paths** and **Snapshot Reliability Defenses**:

1. **Authoritative Ownership**: `ProgressModule` is the **sole authoritative owner** of `body_weight_entries`. All historical weigh-ins, dates, notes, and analytics belong exclusively to this module.
2. **Operational Cached Snapshot**: `user_profiles.weightKg` in `UsersModule` is strictly an operational cached snapshot of current weight for profile display (`SCR-021`) and low-latency Mifflin-St Jeor calculations without cross-module database queries.
3. **Dual Communication Paths**:
   - **Synchronous Command Path (`UsersModule` $\longrightarrow$ `ProgressModule`)**:
     - *Profile Settings Edit (SCR-021)*: When a user edits weight in User Profile & Goal Management, `UsersModule` synchronously invokes `progressService.logWeight(userId, { weightKg, date, note: 'Profile Edit' })`.
     - *Non-Atomic Write Defense*: Writing to `body_weight_entries` and updating `user_profiles.weightKg` are **not assumed to be distributed-atomic**. The authoritative entry in `body_weight_entries` must commit first. Upon confirmed persistence, `UsersModule` updates its snapshot and records `weightUpdatedAt = new Date()`.
   - **Asynchronous Event Path (`ProgressModule` $\longrightarrow$ `UsersModule`)**:
     - *Progress Weigh-In (SCR-020)*: When a weigh-in is logged on Progress Dashboard via `POST /api/v1/progress/weight`, `ProgressService` writes to `body_weight_entries` and emits an asynchronous domain event `weight.recorded: { userId, weightKg, recordedAt }`.
     - `UsersModule` listens to this event to update its cached snapshot.
4. **Snapshot Reliability Strategy**:
   - *Stale Event Overwrite Defense*: To prevent an out-of-order or delayed event from overwriting a newer profile edit, `UsersModule` enforces:
     $$\text{update permitted only if } \text{event.recordedAt} \ge \text{userProfile.weightUpdatedAt}$$
   - *Snapshot Rebuild from Ledger*: If an event is missed or inconsistency is suspected, `UsersModule` provides:
     `usersService.rebuildWeightSnapshotFromLedger(userId: string): Promise<void>`
     which queries `progressService.getLatestWeight(userId)` and idempotently updates `user_profiles.weightKg`.
   - *Durable Event Outbox (Open Decision ARCH-006)*: A durable transactional outbox or message queue for guaranteed at-least-once event delivery is preserved as an open architectural evaluation for Phase 3.2 (`ARCH-006`).

### Why This Decision is Appropriate
- **Single Source of Truth**: Eliminates conflicting historical records by making `ProgressModule` the sole ledger owner.
- **Accurate Communication Modeling**: Explicitly models both synchronous command and asynchronous event paths without hiding coupling.
- **Race Condition & Failure Resilience**: Timestamp guards prevent stale event overwrites, while ledger rebuild provides deterministic recovery.

### Alternatives Considered
- **Direct Database Collection Sharing**: Strictly rejected; violates modular monolith encapsulation.
- **Synchronous Call from Progress to Users**: Rejected because it creates a circular synchronous service dependency between `UsersModule` and `ProgressModule`.

### Trade-offs & Consequences
- **Trade-off**: An in-process event could be missed if the Node.js server crashes before execution.
- **Consequence**: Handled deterministically via the on-demand `rebuildWeightSnapshotFromLedger` routine and evaluated under `ARCH-006`.

### Related Product Requirements
`FR-PROG-001`, `FR-ONBD-002`, `NFR-DATA-001`, `SCR-020`, `SCR-021`.

### Open Questions
- Durable event outbox table vs. periodic reconciliation job for asynchronous event sync (`ARCH-006`).

### Decision Status
**PROPOSED** (Awaiting Human Approval).

---

## Open Architecture Decisions (Phase 3.2 Evaluation Registry)

| Identifier | Evaluation Topic | Target Phase | Status |
| :--- | :--- | :---: | :---: |
| **ARCH-001** | Mobile Storage Engine Selection (MMKV vs. SQLite / WatermelonDB) | Phase 3.2 | **OPEN** |
| **ARCH-002** | Idempotency Key Retention TTL Duration (7-day vs. 14-day vs. 30-day index retention) | Phase 3.2 | **OPEN** |
| **ARCH-003** | Refresh Token Rotation Policy & Reuse Detection Mechanism | Phase 3.2 | **OPEN** |
| **ARCH-004** | Fast Revocation In-Memory Distributed Cache (Redis Blocklist vs. Stateful Checks) | Phase 3.2 / Phase E | **OPEN** |
| **ARCH-005** | Arabic Typographic Metrics Benchmarking (Cairo / Noto Sans Arabic Line-Height) | Phase 3.2 | **OPEN** |
| **ARCH-006** | Durable Event Outbox & Reconciliation Strategy for Cross-Module Domain Events | Phase 3.2 | **OPEN** |
