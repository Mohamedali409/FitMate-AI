# FitMate AI — Phase 3.1 Architecture Review Report

**Date:** 2026-11-01  
**Author:** Antigravity Senior Software Architect  
**Review Target:** Phase 3.1 System Architecture Design Suite  
**Scope:** Complete MVP System Architecture for FitMate AI  
**Status:** Complete — Ready for Stakeholder Review  

---

## 1. Executive Summary

This report documents the systematic architecture review and quality audit of the FitMate AI **Phase 3.1: System Architecture Design** deliverables.

The architecture establishes a robust, highly maintainable, and ethically grounded foundation for FitMate AI, structured as a **React Native (Expo)** mobile client communicating over TLS 1.3 with a **Node.js (TypeScript) Modular Monolith** REST API backed by **MongoDB**. 

All architectural decisions, module boundaries, data flows, and diagrams have been verified for strict, line-by-line consistency with the nine canonical Phase 2 product specifications, `.agents/AGENTS.md` persistent rules, and domain agent skills. Zero application source code was written, zero packages were installed, and zero database schemas or migrations were generated.

---

## 2. Deliverables Created in Phase 3.1

The following four primary architectural specifications and one review report were created in `docs/architecture/`:

| Document Path | Document Purpose | Status | Lines / Size |
| :--- | :--- | :---: | :---: |
| [`docs/architecture/SYSTEM_ARCHITECTURE.md`](./SYSTEM_ARCHITECTURE.md) | Comprehensive system architecture specification detailing mobile client, backend modular monolith, database tier, request lifecycle, auth flows, onboarding, offline sync, AI coach safety, i18n, and error handling. | **Complete / Proposed** | ~380 lines / ~22 KB |
| [`docs/architecture/ARCHITECTURE_DECISION_RECORDS.md`](./ARCHITECTURE_DECISION_RECORDS.md) | Formal ADR registry documenting 12 major architectural decisions (`ADR-001` through `ADR-012`), including context, alternatives, trade-offs, and requirement traceability. | **Complete / Proposed** | ~390 lines / ~20 KB |
| [`docs/architecture/MODULE_BOUNDARIES.md`](./MODULE_BOUNDARIES.md) | Strict encapsulation contracts for the six backend domain modules (`Auth`, `Users`, `Nutrition`, `Workouts`, `Progress`, `Coach`), defining data ownership, exposed interfaces, forbidden accesses, and coupling governance. | **Complete / Proposed** | ~370 lines / ~19 KB |
| [`docs/architecture/architecture-diagram.mmd`](./architecture-diagram.mmd) | Validated Mermaid architecture diagram capturing the client layers, API gateway pipeline, modular monolith domain modules, MongoDB collections, and external boundaries. | **Complete / Proposed** | ~110 lines / ~5 KB |
| [`docs/architecture/PHASE_3_1_ARCHITECTURE_REVIEW_REPORT.md`](./PHASE_3_1_ARCHITECTURE_REVIEW_REPORT.md) | Formal architecture quality gate, requirement traceability audit, contradiction analysis, open questions status, and approval recommendation. | **Complete** | This document |

---

## 3. Architecture Summary & Highlights

### 3.1 Mobile Client Architecture
- **Framework**: React Native with Expo (TypeScript) and Expo Router file-based navigation (`ADR-002`).
- **Server State Management**: TanStack Query with central Query Key Factory and optimistic mutations for sub-50ms visual feedback (`ADR-003`, `NFR-PERF-002`).
- **Credential Storage**: Hardware-backed Keystore/Keychain via `expo-secure-store` (`ADR-004`, `NFR-SEC-001`).
- **Pre-Registration Lifecycle**: Onboarding state (Steps 1–5) held strictly in transient in-memory React state. Zero disk writes, zero SQLite writes, zero cloud guest records; operating system memory reclamation upon process termination guarantees zero residual data (`ADR-005`, `NFR-SEC-002`, `DEC-004`).
- **Offline Workout Engine**: Local-first append-optimistic queue; every set mutation commits synchronously to local storage with client-generated idempotency UUIDs before background synchronization (`ADR-007`, `NFR-REL-001`, `FR-WORK-005`).

### 3.2 Backend Modular Monolith
- **Pattern**: Modular Monolith partitioned into six cohesive domain modules: `Auth`, `Users`, `Nutrition`, `Workouts`, `Progress`, `Coach` (`ADR-001`).
- **Module Boundaries**: Single data ownership per collection. Cross-module database access is strictly prohibited; inter-module communication occurs via typed, in-process service interfaces (`MODULE_BOUNDARIES.md`).
- **Authentication & Registration**: `POST /api/v1/auth/register` is an unauthenticated public endpoint. Onboarding metrics and user credentials commit atomically in a single multi-document MongoDB ACID transaction before session tokens are issued (`ADR-006`, `FR-AUTH-001`).
- **Security & BOLA Defense**: Object-Level Authorization (`assertResourceOwnership`) enforced on every user-scoped query and mutation (`NFR-SEC-004`). Input parsing strictly uses Zod `.strict()` schemas (`NFR-SEC-006`). Centralized `AppError` masks internal 500 errors and scrubs PII from logs (`FR-SAFE-002`).

### 3.3 AI Coach Companion & Safety Guardrails
- **Provider-Agnostic Abstraction**: Architected behind the `AICoachAdapter` server-side interface, completely decoupling the platform from specific LLM providers (`ADR-008`, `DEC-003`). Model selection remains deferred per `Q-001`.
- **Three-Layer Safety Pipeline**: 
  - *Layer 1*: Deterministic pre-inference regex filter intercepts acute clinical, medication, injury, and starvation queries in $< 5\,\text{ms}$, returning immediate standard refusals (`ADR-009`, `FR-COACH-002`, `FR-COACH-003`).
  - *Layer 2*: Immutable system prompt role boundary.
  - *Layer 3*: Post-generation safety validation scans assistant output before rendering.
- **Zero Autonomous Mutations**: The `CoachModule` has read-only snapshot access to user profile, nutrition, and workout summaries. It has **zero write operations** to mutate user goals, calorie targets, or routines (`FR-COACH-005`). Rate-limited to 20 msgs/hour per user (`FR-COACH-004`).

### 3.4 Data Integrity, Internationalization & Units
- **Single Source of Truth Persistence**: All physical measurements (weight in kg, height in cm, volume in ml) are stored strictly in canonical SI units in MongoDB (`ADR-010`). The client dynamically formats units (Metric vs. Imperial) using standard physical constants without floating-point conversion drift (`FR-I18N-002`, `DEC-009`).
- **BiDi Parity**: 100% Arabic (RTL) and English (LTR) layout parity utilizing logical spacing (`paddingStart`/`paddingEnd`). Automated $+25\%$ typographic line-height scaling for Arabic (Cairo) prevents diacritical clipping (`ADR-011`, `NFR-I18N-001`, `NFR-I18N-002`).
- **Curated Datasets**: Food Library (~150–200 items) and Exercise Catalog (~100 items) are bundled offline. Manual logging for unlisted foods is handled via Quick Add. Reusable custom food collections are deferred to v1.1 (`ADR-012`, `DEC-001`, `DEC-010`).

---

## 4. Requirement Traceability Matrix

Every major architectural decision in Phase 3.1 traces directly to confirmed Phase 2 requirements and approved product decisions:

| Architecture Decision | Primary Product Requirement(s) | Approved Decision Ref | Verification & Compliance Detail |
| :--- | :--- | :---: | :--- |
| **ADR-001** (Modular Monolith) | `NFR-DATA-001`, `NFR-PERF-003` | `DEC-008` | Single-artifact deployment, in-process service boundaries, p95 $< 200\,\text{ms}$ REST latency target. |
| **ADR-002** (React Native & Expo) | `NFR-PERF-001`, `NFR-I18N-001` | `DEC-009` | 60 FPS list virtualization, native RTL layout mirroring, unified TypeScript core. |
| **ADR-003** (TanStack Query) | `NFR-PERF-002`, `FR-NUTR-005` | `DEC-001` | Sub-50ms optimistic UI updates for meal and set logging; central Query Key factory. |
| **ADR-004** (Hardware Keystore) | `NFR-SEC-001`, `FR-AUTH-003` | — | Cryptographic token storage via `expo-secure-store`; unencrypted `AsyncStorage` strictly banned. |
| **ADR-005** (Transient Onboarding State) | `NFR-SEC-002`, `FR-ONBD-004` | `DEC-004` | Onboarding state strictly in-memory; zero disk writes, zero SQLite writes, zero cloud guest records. |
| **ADR-006** (Atomic Registration) | `FR-AUTH-001`, `FR-ONBD-004` | `DEC-004` | Public unauthenticated endpoint; multi-document transaction creates user, profile, consent atomically. |
| **ADR-007** (Offline Workout Sync) | `NFR-REL-001`, `FR-WORK-005` | `DEC-002` | Local-first synchronous set commits; client UUID idempotency keys; duplicate prevention on reconnect. |
| **ADR-008** (AI Coach Adapter) | `FR-COACH-001`, `Q-001` | `DEC-003` | Decoupled server-side interface; zero vendor lock-in; candidate evaluation deferred per `Q-001`. |
| **ADR-009** (AI Safety Pipeline) | `NFR-SEC-007`, `FR-COACH-002` | `DEC-003` | Three-layer guardrail pipeline; deterministic refusal for medical queries; zero autonomous mutations. |
| **ADR-010** (Canonical SI Storage) | `FR-I18N-002`, `NFR-DATA-001` | `DEC-009` | Backend stores kg/cm/ml; client dynamically formats Metric/Imperial; zero conversion drift. |
| **ADR-011** (BiDi & Arabic Typography) | `NFR-I18N-001`, `NFR-I18N-002` | `DEC-009` | Logical properties (`marginStart`); $+25\%$ line height for Cairo prevents tashkeel clipping. |
| **ADR-012** (Bundled Datasets) | `DEC-001`, `DEC-002`, `FR-NUTR-003` | `DEC-010` | 100% offline search in $< 50\,\text{ms}$; Quick Add fallback; `CustomFood` collection excluded from MVP. |

---

## 5. Scope Boundary Audit: MVP vs. Future Horizons

A rigorous audit was performed across all four architecture documents to ensure zero out-of-scope features were accidentally introduced into the MVP architecture:

| Capability / Feature | Target Release Horizon | Status in Phase 3.1 Architecture | Audit Finding |
| :--- | :---: | :---: | :---: |
| **Commercial Food APIs (Nutritionix/Edamam)** | Post-MVP (v1.2) | Strictly Excluded (`DEC-001`, `Q-004`) | **PASS** — Zero external food API clients designed. Local Food Library + Quick Add only. |
| **Barcode Scanner** | Post-MVP (v1.2) | Strictly Excluded (`DEC-006`) | **PASS** — Zero barcode scanner libraries or schemas included. |
| **Camera & Computer Vision** | Post-MVP (v2.0) | Strictly Excluded (`DEC-006`) | **PASS** — Zero camera permissions, hardware APIs, or vision models present. |
| **Reusable Custom Food Collection (`CustomFood`)**| Post-MVP (v1.1) | Strictly Excluded (`DEC-010`) | **PASS** — Zero `custom_foods` collection in database tier. Quick Add handles manual logging. |
| **Monetization & Paywalls** | Post-MVP (v1.2) | Strictly Excluded (`DEC-007`) | **PASS** — 100% Free Core MVP. Zero payment gateways or paywall schemas introduced. |
| **Push Notifications & Quiet Hours Scheduler** | Post-MVP (v1.1) | Strictly Excluded (`FR-NOTIF-001`) | **PASS** — Local in-app rest timer chimes only (`FR-WORK-004`). OS push scheduler deferred. |
| **Autonomous AI Plan Mutations** | Never (Strict Prohibition) | Strictly Prohibited (`FR-COACH-005`)| **PASS** — `CoachModule` granted zero write access to external collections. |

---

## 6. Contradiction & Ambiguity Analysis

During the Phase 3.1 design process, the five technical ambiguities highlighted in the Phase 2 verification report were addressed and reconciled architecturally:

1. **A1: AI Safety Benchmark Criteria**:
   - *Resolution*: Architecture establishes a concrete Three-Layer Guardrail Pipeline (`ADR-009`). Layer 1 provides deterministic regex/keyword interception for acute medical and drug terms as a low-latency pre-filter, while Layer 2 and 3 provide defense-in-depth against nuanced adversarial queries. The $\ge 99\%$ refusal benchmark is formalized as a measurable acceptance target for Phase E validation, acknowledging regex limitations and specifying bilingual adversarial test coverage and human review requirements.
2. **A2: Registration Transaction Failure & Rollback Behavior**:
   - *Resolution*: Explicitly documented in `SYSTEM_ARCHITECTURE.md` Section 5 and `ADR-006`. Registration uses a native MongoDB multi-document ACID transaction. If user creation, profile metrics persistence, or consent recording encounters an error (e.g. `EMAIL_EXISTS`), the transaction aborts and all written documents roll back immediately. Tokens are issued only after transaction commit.
3. **A3: Offline Workout Sync Conflict Resolution Policy**:
   - *Resolution*: Documented in `SYSTEM_ARCHITECTURE.md` Section 6 and `ADR-007`. Workouts are logged on a single user's personal device, so multi-device concurrent editing is unsupported in MVP. Mutations are append-only. Each set carries a permanent `setClientUuid`. If re-transmitted, the backend idempotency engine recognizes existing sets and performs a no-op, preventing duplicate volume accumulation.
4. **A4: Onboarding Backward Navigation & Transient State**:
   - *Resolution*: Documented in `ADR-005`. Transient state is held in a top-level React wizard context during the active onboarding session. Navigating backward (e.g., from Step 3 to Step 2) preserves user-entered values in memory for seamless editing, while cancelling onboarding or terminating the app immediately purges all state from memory.
5. **A5: Local Food Search Architecture**:
   - *Resolution*: Documented in `ADR-012`. Search operates locally on the mobile client over the bundled JSON dataset of ~150–200 items using normalized substring matching across English and Arabic names, satisfying the sub-50ms latency benchmark (`FR-NUTR-003`).

---

## 7. Open Technical Decisions & Phase 3.2 Handoff

The following items are designated for resolution in subsequent design phases:

| Item ID | Topic | Target Phase | Context & Next Steps |
| :--- | :--- | :---: | :--- |
| **Q-001** | LLM Provider Evaluation for Phase E | Phase E (AI Coach) | Provider selection remains deferred behind `AICoachAdapter` (`ADR-008`). Evaluation will test Gemini Flash, GPT-4o-mini, and Claude 3.5 Haiku against Arabic fluency, response latency, and cost before Phase E. |
| **Q-002** | Qualified Professional Review of Nutritional Rules | Pre-Release Audit | Registered dietitian review of Mifflin-St Jeor formula boundaries, safety floor copy, and regional food calorie values prior to public launch. |
| **Q-003** | Additional Regional Food Additions | Phase B (Nutrition) | Expansion of Middle Eastern / North African local food items based on alpha tester feedback. |
| **Q-004** | Commercial Food API Evaluation for v1.2 | Phase v1.2 (Post-MVP) | Evaluation of Nutritionix, Edamam, or FatSecret for branded barcode scanning. |
| **ARCH-001**| Mobile Offline Storage Engine Choice | Phase 3.2 (Tech Stack) | Final benchmarking between React Native MMKV and SQLite for the offline mutation queue and local cached catalog storage. |

---

## 8. Quality Review Checklist & Gate Results

| # | Quality Gate Criterion | Result | Evidence & Location |
| :---: | :--- | :---: | :--- |
| 1 | Consistency with all nine canonical Phase 2 documents | **PASS** | Fully traced in Section 4. Zero contradictions with approved specifications. |
| 2 | Agreement across all four architecture deliverables | **PASS** | `SYSTEM_ARCHITECTURE.md`, `ADR.md`, `MODULE_BOUNDARIES.md`, and `.mmd` diagram are 100% harmonized. |
| 3 | Identification of contradictions and technical ambiguities | **PASS** | All 5 Phase 2 ambiguities resolved with explicit architectural mechanisms (Section 6). |
| 4 | Requirement traceability documented for major decisions | **PASS** | Complete Traceability Matrix provided in Section 4. |
| 5 | Strict exclusion of future-version features from MVP | **PASS** | Zero commercial food APIs, barcode scanners, camera tools, or custom food collections in MVP (Section 5). |
| 6 | Zero application source code or npm packages introduced | **PASS** | Verified: purely Markdown and Mermaid architecture documentation created. |
| 7 | All architectural decisions marked as PROPOSED | **PASS** | All 12 ADRs explicitly marked `PROPOSED`, awaiting human approval. |

---

## 9. Recommendation & Stop Condition

### Recommendation
**APPROVE** Phase 3.1: System Architecture Design.

The architecture is robust, strictly aligned with all persistent agent rules and product invariants, and provides an authoritative blueprint for subsequent technical phases.

### Stop Condition Enforcement
In strict compliance with user instructions:
- Phase 3.1 is **COMPLETE**.
- Phase 3.2 (Technology Stack Selection & Validation), database schema implementation, API contract writing, and code generation have **NOT** been started.
- The system is now stopped, awaiting explicit human review and approval.

