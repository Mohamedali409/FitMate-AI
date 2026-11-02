# FitMate AI — Non-Functional Requirements Specification

**Document Version:** 2.0.0  
**Phase:** 2 — Product Discovery and Planning (Revised & Approved)  
**Status:** Approved Product Decisions Incorporated  
**Author:** App Security, Backend & Mobile UI/UX Agent Skills  

---

## 1. Specification Framework & Taxonomy

Non-Functional Requirements (NFRs) define the systemic qualities, architectural constraints, security benchmarks, performance standards, and accessibility criteria that FitMate AI must satisfy across mobile and backend tiers.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    NON-FUNCTIONAL REQUIREMENT TAXONOMY                      │
├─────────────────┬───────────────────────────────────────────────────────────┤
│ Prefix          │ Quality Dimension                                         │
├─────────────────┼───────────────────────────────────────────────────────────┤
│ NFR-SEC-xxx     │ Security, Cryptography, Privacy & OWASP Compliance        │
│ NFR-PERF-xxx    │ Performance, Latency & Frame Rate Benchmarks              │
│ NFR-REL-xxx     │ Reliability, Offline Resilience & Fault Tolerance        │
│ NFR-ACC-xxx     │ Accessibility, Contrast & Touch Ergonomics (WCAG 2.1 AA)  │
│ NFR-I18N-xxx    │ Internationalization, RTL Layouts & Typographic Metrics   │
│ NFR-DATA-xxx    │ Data Architecture, Scalability & Storage Boundaries       │
└─────────────────┴───────────────────────────────────────────────────────────┘
```

---

## 2. Security, Cryptography & Privacy (NFR-SEC)

### NFR-SEC-001: Mobile Token & Session Storage via Hardware Keystore
- **Target Standard**: OWASP Mobile Top 10 (M1: Improper Credential Usage, M2: Inadequate Supply Chain Security).
- **Specification**: All authentication tokens (JWT Access and Refresh tokens), biometric keys, and session secrets must be stored strictly in hardware-backed secure storage on mobile devices using `expo-secure-store` (iOS Keychain and Android Keystore with AES-256-GCM encryption).
- **Strict Prohibition**: Under no circumstances shall tokens or health identifiers be persisted in unencrypted `AsyncStorage` or plain file storage.
- **Verification Method**: Automated static analysis and mobile device file system extraction audits.

### NFR-SEC-002: Transient Pre-Registration Data Storage & Lifecycle
- **Target Standard**: OWASP Mobile Data Protection.
- **Specification**: User onboarding inputs (goal selections, biological sex, age, height, weight, activity level, language, units, and consent) collected during Steps 1–5 must be stored strictly in transient in-memory client application state (active runtime memory only).
- **Storage Restrictions**: Under no circumstances shall pre-registration data be persisted to local disk, SQLite, unencrypted `AsyncStorage`, or persistent guest records in the cloud.
- **Lifecycle & Purge Enforcement**:
  - *App Termination / Background Kill*: Transient in-memory state is discarded immediately by the operating system upon process death; zero unauthenticated data remains on the device.
  - *Onboarding Cancellation*: User navigating back to Welcome or aborting onboarding triggers explicit memory clearance.
  - *Registration Submission*: State is transmitted via the unauthenticated `POST /api/v1/auth/register` payload, committed atomically to MongoDB, and immediately purged from client runtime memory upon access token receipt.
- **No Guest Records**: The server shall not instantiate unauthenticated or temporary guest documents.
- **Verification Method**: Device memory inspection and cache purge verification upon app backgrounding/timeout.

### NFR-SEC-003: Password Hashing Cryptographic Standard
- **Target Standard**: OWASP Password Storage Guidelines.
- **Specification**: All user passwords must be hashed on the backend using Argon2id (recommended parameters: memory cost $64\,\text{MB}$, time cost $3$ iterations, parallelism $4$) or bcrypt with a minimum work factor of $12$ salt rounds.
- **Verification Method**: Code audit of authentication service and verification of hash format strings (`$argon2id$` or `$2b$12$`).

### NFR-SEC-004: Object-Level Authorization (BOLA / IDOR Defense)
- **Target Standard**: OWASP API Security Top 10 (API1:2023 Broken Object Level Authorization).
- **Specification**: Every backend service and repository handling user-scoped records (`WorkoutSession`, `NutritionLog`, `UserProfile`, `WeightLog`) must cryptographically verify that the record's `userId` matches the authenticated `req.user.id` extracted from the verified JWT.
- **Verification Method**: Automated Supertest security test suites attempting to read/update/delete User A's workout session using User B's valid bearer token, asserting HTTP 403 Forbidden.

### NFR-SEC-005: Transport Layer Security & API Hardening
- **Target Standard**: OWASP Transport Layer Protection.
- **Specification**: All client-server communication must occur strictly over TLS 1.3 (with fallback to TLS 1.2 minimum). The backend must configure `helmet()` to enforce:
  - HTTP Strict Transport Security (HSTS) with `max-age=31536000; includeSubDomains`.
  - `X-Content-Type-Options: nosniff`.
  - `X-Frame-Options: DENY`.
  - Strict Content Security Policy (CSP).
- **Verification Method**: Automated SSL Labs API audit and HTTP response header assertion tests.

### NFR-SEC-006: Input Sanitization & NoSQL Injection Immunity
- **Target Standard**: OWASP API Security (API8:2023 Security Misconfiguration, Injection).
- **Specification**: All incoming HTTP query parameters, path variables, and request bodies must be parsed through strict Zod schemas with `.strict()`. Raw user inputs must never be passed directly into Mongoose query objects without sanitization.
- **Verification Method**: Automated penetration tests issuing malicious NoSQL operators (`{ "$gt": "" }`, `{ "$ne": null }`) asserting HTTP 400 rejection.

### NFR-SEC-007: AI Prompt Injection Sanitization & Layered Protection
- **Target Standard**: OWASP Top 10 for Large Language Model Applications (LLM01: Prompt Injection).
- **Layered Protection Architecture**:
  - *Layer 1 (Deterministic Blocklist)*: Pre-prompt regex/rule-based filter scans for acute clinical, medication, injury diagnostic, and system-prompt override keywords.
  - *Layer 2 (System Prompt Role Boundary)*: Immutable system prompt anchors non-medical informational boundaries, disclaims clinical expertise, and prohibits autonomous user data mutations.
  - *Layer 3 (Response Safety Post-Check)*: Post-processing verification scans assistant outputs for clinical diagnosis or prescription advice before rendering.
- **Measurable Safety Benchmark**: Automated adversarial safety suites must achieve $\ge 99\%$ refusal accuracy across curated clinical/medication query benchmarks. Zero autonomous user-profile or workout-routine mutations are permitted.
- **Verification Method**: Red-teaming test harness attempting prompt injection and clinical queries; automated assertions verify assistant maintains safe non-medical persona.

---

## 3. Performance & Latency Benchmarks (NFR-PERF)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          PERFORMANCE BENCHMARK TARGETS                      │
├────────────────────────────────────────┬────────────────────────────────────┤
│ Cold App Launch (Splash to Interactive)│ < 2.0 seconds                      │
│ Warm App Launch                        │ < 500 milliseconds                 │
│ Screen Transition Latency              │ < 100 milliseconds                 │
│ In-Workout Set Checkmark Logging       │ < 50 milliseconds (local UI)       │
│ Local Food & Exercise Search Response  │ < 50 milliseconds                  │
│ List Scrolling Smoothness              │ 60 FPS (Zero dropped frames)       │
│ REST API Response Time (p95)           │ < 200 milliseconds (excl. network) │
│ AI Coach Response Target (p90)         │ < 3.0 seconds (performance target) │
└────────────────────────────────────────┴────────────────────────────────────┘
```

### NFR-PERF-001: Mobile Frame Rate & List Virtualization
- **Specification**: Long scrollable lists (Exercise Catalogue, Food Search Results, History Calendar) must maintain a steady **60 FPS** on mid-tier Android and iOS devices, utilizing `@shopify/flash-list` or properly tuned `FlatList` with `getItemLayout`, `maxToRenderPerBatch`, and `windowSize`.
- **Verification Method**: Automated React Native performance profiler recording JS frame rate and UI thread frame drops during rapid fling-scrolling.

### NFR-PERF-002: In-Workout Interaction Responsiveness
- **Specification**: Tapping the set completion checkmark on `SCR-017` must trigger visual row highlighting, haptic feedback, and rest timer activation in **$\le 50\,\text{ms}$** by decoupling local optimistic UI updates from asynchronous storage writes.
- **Verification Method**: Interaction-to-visual-feedback timestamp profiling on physical devices.

### NFR-PERF-003: Backend REST Latency
- **Specification**: The 95th percentile (p95) execution latency for all standard CRUD operations (`GET /workouts`, `POST /nutrition/meals`, `GET /progress`) must be **$< 200\,\text{ms}$** under a simulated load of 500 concurrent active users.
- **Verification Method**: K6 load testing suite measuring server response time excluding network transmission delays.

### NFR-PERF-004: AI Coach Latency as a Measurable Target
- **Specification**: AI Coach streaming response latency is framed as a **measurable performance target** (target 90th percentile $< 3.0\,\text{s}$ to first token under standard network conditions), rather than an absolute guaranteed pass/fail criteria, acknowledging that third-party LLM inference and cellular network jitter are variable.
- **Verification Method**: Telemetry tracking time-to-first-token across production chat sessions.

---

## 4. Reliability, Fault Tolerance & Offline Capability (NFR-REL)

### NFR-REL-001: Local-First Workout Execution Resilience & Idempotent Sync
- **Specification**: The entire active workout logging flow (`SCR-017`, `SCR-018`, `SCR-019`) must function with **complete operational fidelity in network blackout conditions** (e.g., subterranean gym basements).
- **Behavior**: Every set mutation is committed synchronously to local device storage before network calls. Outgoing network requests are queued in a persistent sync ledger with exponential backoff retry.
- **Idempotent Synchronization & Duplicate Prevention**: Outgoing sync requests must carry client-generated idempotency identifiers (e.g. UUID per workout session and set). The backend must enforce idempotent handling to ensure re-transmissions caused by intermittent connectivity do not result in duplicate workout sets, double-logged calories, or inflated volume analytics. Specific local storage and sync engine implementation choices are reserved for Phase 3 architecture.
- **Verification Method**: Complete an entire 5-exercise workout in Airplane Mode; verify session integrity locally, reconnect to network, and verify seamless idempotent synchronization with zero duplicate records.

### NFR-REL-002: Graceful Session State Recovery
- **Specification**: If the mobile application process is terminated unexpectedly by the OS (due to memory pressure or battery death) during an active workout session, restarting the application must detect the unfinished session and offer one-tap resumption with zero lost sets.
- **Verification Method**: Force-kill app mid-workout (`adb shell am kill` / iOS task switcher); relaunch app and assert exact set restoration.

### NFR-REL-003: Backend Graceful Shutdown & Connection Draining
- **Specification**: On receiving termination signals (`SIGTERM`, `SIGINT`), the backend Express server must stop accepting new HTTP connections, allow ongoing in-flight requests up to 10 seconds to finish, cleanly close MongoDB connection pools, and exit with code 0.
- **Verification Method**: Automated integration test sending `SIGTERM` while requests are in flight, asserting zero aborted connections.

---

## 5. Accessibility, Ergonomics & Design Standards (NFR-ACC)

### NFR-ACC-001: WCAG 2.1 Level AA Compliance
- **Specification**: All user-facing screens must comply strictly with **WCAG 2.1 Level AA**:
  - Color contrast ratio must be **$\ge 4.5:1$** for standard text copy against its surface background.
  - Color contrast ratio must be **$\ge 3.0:1$** for large headings ($\ge 18\text{pt}$ or bold $\ge 14\text{pt}$) and essential graphical UI controls.
- **Verification Method**: Automated accessibility audits using axe-core / Lighthouse, and color contrast analyzer verification across Dark and Light themes.

### NFR-ACC-002: Gym Ergonomic Touch Target Minimums
- **Specification**: All primary interactive elements (buttons, set completion checkmarks, tabs, segmented pills, modal dismissal crosses) must maintain a minimum bounding box of **$48 \times 48\,\text{dp}$** (with recommended $52\,\text{dp}$ height for primary CTAs) to allow effortless operation by sweaty, shaking hands during physical exertion.
- **Verification Method**: Automated component lint rules asserting minimum layout dimensions.

### NFR-ACC-003: Dynamic Type & Font Scaling Support
- **Specification**: All typography, containers, and card layouts must accommodate system font scaling up to **$200\%$** without text truncation, layout collisions, or unreadable overlapping text.
- **Verification Method**: Device accessibility testing with iOS Dynamic Type and Android Font Size configured to maximum setting.

### NFR-ACC-004: Screen Reader Semantic Navigation
- **Specification**: All interactive controls must specify meaningful, localized `accessibilityLabel`, `accessibilityHint`, and `accessibilityRole` attributes in both English and Arabic.
- **Verification Method**: Manual VoiceOver (iOS) and TalkBack (Android) audit of core user journeys (`UJ-001`, `UJ-004`, `UJ-006`).

---

## 6. Internationalization & Bi-Directional Layouts (NFR-I18N)

### NFR-I18N-001: First-Class Bi-Directional Parity (Arabic RTL & English LTR)
- **Specification**: The application must provide 100% visual, functional, and ergonomic parity between English (LTR) and Arabic (RTL) from the first release. Layout mirroring must automatically invert:
  - Navigation headers, back buttons, and dismiss controls.
  - Card horizontal alignments and icon anchors.
  - Progress bar filling directions (Right-to-Left in Arabic).
  - List swipe gestures (Swipe-to-delete mirrors naturally).
- **Strict Prohibition**: No hardcoded left/right CSS paddings or absolute position hacks; all spacing must use logical properties (`marginStart`, `marginEnd`, `paddingStart`, `paddingEnd`).
- **Verification Method**: Visual regression test suite comparing rendered screens across LTR and RTL configurations.

### NFR-I18N-002: Arabic Typographic Metrics & Line Height Protection
- **Specification**: To prevent severe visual defects common in Arabic digital typography (such as clipped diacritical marks/tashkeel, truncated ascenders, or clipped descenders in letters like `ي`, `ج`, `خ`), all Arabic text styles must incorporate an automated **$+25\%$ line-height multiplier** relative to equivalent Latin font sizes.
- **Font Standards**: Primary Arabic typeface: Cairo or Noto Sans Arabic; Primary Latin typeface: Inter or system sans-serif.
- **Verification Method**: Typographic stress testing with heavily diacritized Arabic phrases across all screen densities.

### NFR-I18N-003: Localized Numbering & Cultural Pluralization
- **Specification**: The application must support localized number formatting, dates, and pluralization rules for both English (2 plural forms: singular/plural) and Arabic (6 plural forms: zero, one, two, few, many, other) according to CLDR standards. The architecture must not hard-code single-country currencies or date conventions.
- **Verification Method**: Formatting tests asserting proper Arabic pluralization across numbers.

---

## 7. Data Architecture & Scalability (NFR-DATA)

### NFR-DATA-001: Bounded Document Sizing (16MB BSON Protection)
- **Specification**: In accordance with MongoDB best practices, no single document may accumulate unbounded arrays. Historical workout sessions and daily meal logs must be stored as individual documents referencing `userId` via indexed `ObjectId`, never embedded in the root `User` document.
- **Verification Method**: Schema review and automated load testing simulating 5 years of daily workouts (1,825 sessions), asserting document sizes stay $< 50\,\text{KB}$.

### NFR-DATA-002: Compound Indexing via ESR Rule
- **Specification**: All high-frequency queries must be supported by compound indexes designed according to the **Equality, Sort, Range (ESR)** rule:
  - `WorkoutSession`: `{ userId: 1, startedAt: -1 }`
  - `NutritionLog`: `{ userId: 1, date: -1 }`
  - `BodyWeightEntry`: `{ userId: 1, date: -1 }`
- **Verification Method**: MongoDB query plan analysis (`explain('executionStats')`) asserting index scans (`IXSCAN`) and zero collection scans (`COLLSCAN`).

### NFR-DATA-003: Schema Versioning & Forward Migration
- **Specification**: Every root Mongoose collection must include an explicit `schemaVersion: { type: Number, default: 1 }` field. Structural changes to document models must implement backward-compatible read hooks or automated migration scripts.
- **Verification Method**: Migration test harness validating seamless deserialization of `schemaVersion: 1` documents by `schemaVersion: 2` application logic.
