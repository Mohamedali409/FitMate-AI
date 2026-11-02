# FitMate AI — Security & Testing Strategy

**Document Version:** 1.0.0  
**Phase:** 3.4 — Security & Testing Strategy  
**Status:** PROPOSED — Awaiting Human Review  
**Last Updated:** 2026-11-02  
**Owning Architecture:** Security Architecture, Test Engineering & DevSecOps  
**References:**  
- Phase 3.1: [SYSTEM_ARCHITECTURE.md](file:///d:/2026/Personal%20Fitness%20&%20AI%20Coach%20Platform/FitMate-AI/docs/architecture/SYSTEM_ARCHITECTURE.md) v1.1.0  
- Phase 3.1: [MODULE_BOUNDARIES.md](file:///d:/2026/Personal%20Fitness%20&%20AI%20Coach%20Platform/FitMate-AI/docs/architecture/MODULE_BOUNDARIES.md) v1.1.0  
- Phase 3.1: [ARCHITECTURE_DECISION_RECORDS.md](file:///d:/2026/Personal%20Fitness%20&%20AI%20Coach%20Platform/FitMate-AI/docs/architecture/ARCHITECTURE_DECISION_RECORDS.md) v1.1.0  
- Phase 3.2: [DATABASE_ISSUES.md](file:///d:/2026/Personal%20Fitness%20&%20AI%20Coach%20Platform/FitMate-AI/docs/architecture/database/DATABASE_ISSUES.md) v1.2.0  
- Phase 3.2: [DATABASE_SCHEMA.md](file:///d:/2026/Personal%20Fitness%20&%20AI%20Coach%20Platform/FitMate-AI/docs/architecture/database/DATABASE_SCHEMA.md) (AuthModule) v1.1.0  
- Phase 3.2: [USERS_SCHEMA.md](file:///d:/2026/Personal%20Fitness%20&%20AI%20Coach%20Platform/FitMate-AI/docs/architecture/database/USERS_SCHEMA.md) v1.2.0  
- Phase 3.3: [API_CONTRACTS.md](file:///d:/2026/Personal%20Fitness%20&%20AI%20Coach%20Platform/FitMate-AI/docs/architecture/API_CONTRACTS.md) v1.0.0 (Proposed)  
- Phase 2: [FUNCTIONAL_REQUIREMENTS.md](file:///d:/2026/Personal%20Fitness%20&%20AI%20Coach%20Platform/FitMate-AI/docs/product/FUNCTIONAL_REQUIREMENTS.md) v2.0.0  
- Phase 2: [NON_FUNCTIONAL_REQUIREMENTS.md](file:///d:/2026/Personal%20Fitness%20&%20AI%20Coach%20Platform/FitMate-AI/docs/product/NON_FUNCTIONAL_REQUIREMENTS.md) v2.0.0  
- Project Agent Rules: [AGENTS.md](file:///d:/2026/Personal%20Fitness%20&%20AI%20Coach%20Platform/FitMate-AI/.agents/AGENTS.md)  

---

## 1. Executive Summary & Strategy Purpose

FitMate AI is a mobile-first personal fitness and nutrition companion managing sensitive personal health indicators, anthropometric data, dietary habits, workout history, and conversational AI interactions. Protecting this ecosystem requires an integrated, defense-in-depth security architecture coupled with an automated, multi-tiered testing strategy.

This document establishes the official **Security and Testing Strategy** for FitMate AI. It defines the threat landscape, cryptographic controls, authorization invariants, privacy safeguards, testing pyramids, automated CI/CD quality gates, and observability runbooks required to deliver a hardened, production-ready system.

### 1.1 Core Strategic Invariants
1. **Zero Trust Tenancy Isolation**: Resource ownership is verified cryptographically at the data layer for 100% of user-scoped operations. Cross-user data leakage (BOLA/IDOR) is structurally prevented and verified via negative automated test suites.
2. **Estimation & Non-Medical Guardrails**: All calculated nutrition outputs carry explicit estimation flags (`isEstimated: true`), and the AI Coach is technically constrained from providing clinical diagnoses or medical advice ([Core Invariant 1 & 2](file:///d:/2026/Personal%20Fitness%20&%20AI%20Coach%20Platform/FitMate-AI/.agents/AGENTS.md#L20-L35)).
3. **Shift-Left Quality & Security**: Testing and vulnerability scanning occur continuously throughout development. No code merges into main without 100% passing automated unit, integration, and security regression gates.
4. **Execution Integrity**: Test results are never fabricated or assumed. Quality gates require verified CLI execution outputs from deterministic test runners.

---

## 2. Scope, System Boundaries & Architecture References

### 2.1 Architectural Boundaries
The security and testing perimeter encompasses the following boundaries defined in [SYSTEM_ARCHITECTURE.md](file:///d:/2026/Personal%20Fitness%20&%20AI%20Coach%20Platform/FitMate-AI/docs/architecture/SYSTEM_ARCHITECTURE.md):
- **Client Boundary**: React Native / Expo mobile application running on iOS and Android. Evaluated as an untrusted client environment.
- **Network & Transport Boundary**: Ingress reverse proxy, Cloudflare edge, TLS 1.3 termination, CORS, and Helmet HTTP security headers.
- **Application Boundary**: Node.js / Express Modular Monolith with encapsulated domain modules (`AuthModule`, `UsersModule`, `NutritionModule`, `WorkoutsModule`, `ProgressModule`, `CoachModule`).
- **Data Persistence Boundary**: MongoDB Replica Set (wiredTiger storage engine, TLS encrypted transport, multi-document transactions) and Redis (in-memory caching, rate limiting, and session state).
- **External Integration Boundaries**: Google Identity Services (OAuth 2.0 ID token verification) and External LLM Provider Gateway (OpenAI / Gemini via `AICoachAdapter`).

---

## 3. Security Architecture & Threat Modeling (STRIDE)

### 3.1 Security Architecture Diagram
```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           FITMATE AI TRUST BOUNDARIES                       │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  [ UNTRUSTED ZONE: MOBILE CLIENT ]                                          │
│  React Native / Expo (iOS / Android)                                        │
│  ├── Access Token: In-Memory RAM Only (Never persisted to disk)            │
│  └── Refresh Token: Platform Secure Storage (expo-secure-store)             │
│                                │                                            │
│                        TLS 1.3 │ (HTTPS / WSS)                              │
│                                ▼                                            │
│  [ TRUST BOUNDARY 1: INGRESS & REVERSE PROXY ]                              │
│  Cloudflare / NGINX / Helmet                                                │
│  ├── Rate Limiting (IP-based)                                               │
│  ├── CORS & Security Headers (HSTS, CSP, X-Frame-Options)                   │
│  └── Payload Body Size Limiting (<= 100KB)                                  │
│                                │                                            │
│                                ▼                                            │
│  [ TRUST BOUNDARY 2: EXPRESS API & AUTH GUARD ]                             │
│  ├── JWT Signature & Expiration Verification (RS256 / EdDSA)                │
│  ├── TokenVersion Check for Sensitive Operations                            │
│  └── Strict Input Validation (Zod .strict() - Anti-Injection)               │
│                                │                                            │
│                                ▼                                            │
│  [ TRUST BOUNDARY 3: MODULAR MONOLITH APPLICATION CORE ]                    │
│  ├── In-Process Module Isolation (No direct DB cross-queries)               │
│  ├── Domain Authorization (Ownership Verification: userId === req.user.id) │
│  └── 3-Tier AI Coach Safety Pipeline (Regex -> Prompt Boundary -> Scan)     │
│             │                                           │                   │
│             ▼                                           ▼                   │
│  [ TRUST BOUNDARY 4: DATA TIER ]          [ TRUST BOUNDARY 5: EXTERNAL ]    │
│  ├── MongoDB Replica Set (Encrypted TLS)  ├── Google OAuth (JWKS Certs)     │
│  └── Redis Cache (Rate Limits & Sessions) └── External AI LLM Provider     │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 3.2 STRIDE Threat Model Matrix

| Threat ID | Category | Affected Component | Attack Scenario | Impact | Severity | Existing / Planned Mitigation | Verification Method |
| :--- | :--- | :--- | :--- | :--- | :---: | :--- | :--- |
| **THREAT-01** | Spoofing | `AuthModule` (`POST /api/v1/auth/login`) | Credential stuffing and automated brute-force attacks against user passwords. | Account takeover, identity theft. | High | Rate-limiting (5 attempts / 15 min per IP), Argon2id hashing, slow hash execution. | Automated Supertest rate-limit verification suite. |
| **THREAT-02** | Spoofing | `AuthModule` (`POST /api/v1/auth/oauth`) | Attacker submits forged or expired Google OAuth ID token to impersonate user. | Unauthorized account creation / access. | Critical | Cryptographic ID token signature verification against Google's public JWKS keys ([DB-021](file:///d:/2026/Personal%20Fitness%20&%20AI%20Coach%20Platform/FitMate-AI/docs/architecture/database/DATABASE_ISSUES.md#L73)). | Negative unit & integration tests with tampered/expired tokens. |
| **THREAT-03** | Spoofing | `AuthModule` (`POST /api/v1/auth/refresh`) | Attacker steals and replays a discarded refresh token. | Persistent session hijacking. | High | Single-use refresh token rotation, 30s grace recovery encryption ([DB-036](file:///d:/2026/Personal%20Fitness%20&%20AI%20Coach%20Platform/FitMate-AI/docs/architecture/database/DATABASE_ISSUES.md#L88)), automated reuse detection revoking family globally. | Automated token reuse simulation test. |
| **THREAT-04** | Tampering | `UsersModule`, `NutritionModule` | Malicious payload injects NoSQL query operators (`$gt`, `$where`) to alter targets or bypass validation. | Data corruption, target tampering. | High | Strict Zod schemas with `.strict()`, typed Mongoose models, prohibiting raw object inputs in queries. | NoSQL injection fuzzing test suite. |
| **THREAT-05** | Tampering | `WorkoutsModule` (`POST /api/v1/workouts/sync`) | Tampering with offline workout sync payloads to forge historical volume or duplicate sessions. | Metrics corruption, inflated volume. | Medium | Client-side idempotency keys, canonical payload hashing, `processed_idempotency_keys` deduplication ([DB-024](file:///d:/2026/Personal%20Fitness%20&%20AI%20Coach%20Platform/FitMate-AI/docs/architecture/database/DATABASE_ISSUES.md#L76)). | Idempotent replay integration tests. |
| **THREAT-06** | Repudiation | `UsersModule` (`consent_records`) | User claims they never consented to health disclaimer or terms of service prior to an injury. | Legal liability, compliance failure. | High | Immutable audit logging of consent with timestamp, SemVer version, IP hash, and truncated user agent ([DB-029](file:///d:/2026/Personal%20Fitness%20&%20AI%20Coach%20Platform/FitMate-AI/docs/architecture/database/DATABASE_ISSUES.md#L81)). | Audit log immutability and schema verification tests. |
| **THREAT-07** | Information Disclosure | All Modules (BOLA / IDOR) | Attacker modifies resource ID in URL (e.g. `GET /api/v1/workouts/sessions/:id`) to read another user's session. | Privacy breach, personal data exposure. | Critical | Strict resource ownership assertion (`record.userId === req.user.id`). Responds with `404 NOT_FOUND` to prevent enumeration. | Exhaustive BOLA cross-user negative test matrix. |
| **THREAT-08** | Information Disclosure | Logging Infrastructure | Server exception logs print request payloads containing cleartext passwords, JWTs, or health metrics. | Credential compromise via log aggregation. | High | Custom logger interceptor redacting sensitive keys (`password`, `token`, `refreshToken`, `authorization`) ([FR-SAFE-002](file:///d:/2026/Personal%20Fitness%20&%20AI%20Coach%20Platform/FitMate-AI/docs/product/FUNCTIONAL_REQUIREMENTS.md#L312-L318)). | Automated log inspection tests during error handling. |
| **THREAT-09** | Denial of Service | `AuthModule` (`POST /api/v1/auth/register`) | Mass registration requests with heavy Argon2id parameters saturating server CPU/RAM. | Service unavailability, API starvation. | High | Strict IP rate limiting (5 req/15 min), CAPTCHA evaluation for repeated failures, reverse-proxy connection limits. | Load testing using k6 spike tests. |
| **THREAT-10** | Denial of Service | `CoachModule` (`POST /api/v1/coach/chat`) | Rapid automated messaging exhausting external LLM API budget and quotas. | Financial cost explosion, DoS for legitimate users. | High | User-scoped rate limit of strictly 20 messages per hour ([FR-COACH-004](file:///d:/2026/Personal%20Fitness%20&%20AI%20Coach%20Platform/FitMate-AI/docs/product/FUNCTIONAL_REQUIREMENTS.md#L269-L275), `DB-030`). | Rate-limiting boundary tests with mock timer. |
| **THREAT-11** | Elevation of Privilege | `AuthModule`, `UsersModule` | Attacker includes `tokenVersion` or `isEmailVerified: true` in `PATCH /api/v1/users/profile`. | Privilege escalation, session persistence. | High | Strict DTO allowlists rejecting unknown properties (`strip` or `.strict()` in Zod). | Mass assignment penetration test. |
| **THREAT-12** | Elevation of Privilege | `CoachModule` | Prompt injection attacks coercing the AI Coach to modify user fitness targets or diagnose medical conditions. | Harmful medical advice, invariant breach. | Critical | 3-tier safety guardrails, prompt boundary framing, zero write access to DB collections ([FR-COACH-005](file:///d:/2026/Personal%20Fitness%20&%20AI%20Coach%20Platform/FitMate-AI/docs/product/FUNCTIONAL_REQUIREMENTS.md#L276-L282)). | Adversarial prompt benchmark test suite. |

---

## 4. OWASP Top 10 & API Security Assessment

### 4.1 OWASP API Security Top 10 (2023) Assessment & Controls

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                 OWASP API SECURITY TOP 10 DEFENSE PROFILE                   │
├───────────────────────────────────┬─────────────────────────────────────────┤
│ OWASP API Security Risk           │ FitMate AI Architectural Control        │
├───────────────────────────────────┼─────────────────────────────────────────┤
│ API1:2023 Broken Object Level     │ Centralized assertResourceOwnership();  │
│ Authorization (BOLA / IDOR)       │ Queries scoped to req.user.id; 404 resp │
├───────────────────────────────────┼─────────────────────────────────────────┤
│ API2:2023 Broken Authentication   │ Argon2id / bcrypt >= 12 rounds; 15m JWT;│
│                                   │ Rotating refresh tokens + reuse detect  │
├───────────────────────────────────┼─────────────────────────────────────────┤
│ API3:2023 Broken Object Property  │ Zod .strict() schemas; DTO projection;  │
│ Level Authorization               │ MongoDB __v and passwordHash stripped   │
├───────────────────────────────────┼─────────────────────────────────────────┤
│ API4:2023 Unrestricted Resource   │ Redis sliding-window rate limiting;     │
│ Consumption                       │ Bounded pagination (max limit: 100)     │
├───────────────────────────────────┼─────────────────────────────────────────┤
│ API5:2023 Broken Function Level   │ Explicit role guards; admin operations  │
│ Authorization                     │ isolated from regular user routes       │
├───────────────────────────────────┼─────────────────────────────────────────┤
│ API6:2023 Unrestricted Access to  │ Deletion saga multi-step confirmation;  │
│ Sensitive Business Flows          │ Password reset anti-enumeration timing  │
├───────────────────────────────────┼─────────────────────────────────────────┤
│ API7:2023 Server Side Request     │ Zero outbound webhook/URL fetching in   │
│ Forgery (SSRF)                    │ MVP; strictly static provider endpoints │
├───────────────────────────────────┼─────────────────────────────────────────┤
│ API8:2023 Security                │ Helmet secure headers; strict CORS;     │
│ Misconfiguration                  │ Production error sanitization           │
├───────────────────────────────────┼─────────────────────────────────────────┤
│ API9:2023 Improper Inventory      │ Explicit /api/v1 pathing; retired       │
│ Management                        │ endpoints return 410 Gone               │
├───────────────────────────────────┼─────────────────────────────────────────┤
│ API10:2023 Unsafe Consumption of  │ Provider-agnostic AICoachAdapter;       │
│ APIs                              │ Response buffering & Tier 3 safety scan │
└───────────────────────────────────┴─────────────────────────────────────────┘
```

---

## 5. Authentication, Session Security & Credential Protection

### 5.1 Credential Storage & Hashing Policy
- **Password Hashing Algorithm**: Argon2id (memory: 64MB, iterations: 3, parallelism: 4) as primary, with bcrypt work factor $\ge 12$ as fallback ([NFR-SEC-003](file:///d:/2026/Personal%20Fitness%20&%20AI%20Coach%20Platform/FitMate-AI/docs/architecture/MODULE_BOUNDARIES.md#L118)).
- **Password Complexity Rules**: Minimum 8 characters, maximum 128 characters, at least 1 uppercase letter, at least 1 digit, and at least 1 special character (`FR-AUTH-001`).
- **Timing Attack Defense**: Password hash comparisons execute using constant-time comparison routines (`crypto.timingSafeEqual` or native driver equivalents).

### 5.2 Token Lifecycle & Session Management
- **Access JWT Specifications**:
  - Expiration: Strictly 15 minutes.
  - Signature Algorithm: Asymmetric `RS256` or `EdDSA`.
  - Claims: `{ sub: userId, tokenVersion: number, iat: number, exp: number }`.
  - Storage: In-memory client RAM only; strictly prohibited from persistent device storage.
- **Refresh Token Rotation & Ephemeral Recovery ([DB-022](file:///d:/2026/Personal%20Fitness%20&%20AI%20Coach%20Platform/FitMate-AI/docs/architecture/database/DATABASE_ISSUES.md#L74), [DB-036](file:///d:/2026/Personal%20Fitness%20&%20AI%20Coach%20Platform/FitMate-AI/docs/architecture/database/DATABASE_ISSUES.md#L88), [DB-037](file:///d:/2026/Personal%20Fitness%20&%20AI%20Coach%20Platform/FitMate-AI/docs/architecture/database/DATABASE_ISSUES.md#L89))**:
  - Expiration: 30 days (`TTL` index on `refresh_tokens.expiresAt`).
  - Storage in Database: Stored strictly as a one-way `SHA-256` hash (`hashedToken`).
  - Mobile Storage: `expo-secure-store` (iOS Keychain / Android EncryptedSharedPreferences).
  - Rotation Grace Window: 30 seconds. Successor tokens are encrypted with `AES-256-GCM` using an external KMS key (`REFRESH_RECOVERY_KEY`).
  - Automatic Reuse Invalidation: If a revoked token is used outside the grace period, all tokens for the user family are immediately revoked, and `tokenVersion` is incremented.

### 5.3 Global Session Invalidation (`tokenVersion` Semantics, [DB-040](file:///d:/2026/Personal%20Fitness%20&%20AI%20Coach%20Platform/FitMate-AI/docs/architecture/database/DATABASE_ISSUES.md#L92))
- When a user changes their password, executes account deletion, or requests "Log out from all devices", `users.tokenVersion` is atomically incremented.
- Sensitive endpoints (Password modification, account deletion, consent changes) verify `tokenVersion` against the database or low-latency Redis cache on every request.

---

## 6. Authorization, Data Isolation & BOLA/IDOR Defense

### 6.1 Centralized Tenancy Enforcement Pattern
All service methods enforce object ownership via an architectural guard:
```typescript
export function assertResourceOwnership(resourceUserId: string, authenticatedUserId: string): void {
  if (resourceUserId !== authenticatedUserId) {
    // Return 404 NOT_FOUND instead of 403 to prevent resource existence enumeration
    throw new AppError('Resource not found', 404, 'NOT_FOUND');
  }
}
```

### 6.2 BOLA / IDOR Verification Matrix
| Target Module | Endpoint Category | Verification Query Pattern | Security Test Case |
| :--- | :--- | :--- | :--- |
| `UsersModule` | Profile & Settings | Scoped strictly to `req.user.id` | User B attempts `PATCH /api/v1/users/profile` with User A's token $\rightarrow$ Rejects. |
| `NutritionModule` | Daily Meal Logs | `{ _id: logId, userId: req.user.id }` | User B attempts `DELETE /api/v1/nutrition/meals/:logId/items/:itemId` on User A's log $\rightarrow$ `404 NOT_FOUND`. |
| `WorkoutsModule` | Workout Sessions | `{ _id: sessionId, userId: req.user.id }` | User B attempts `GET /api/v1/workouts/sessions/:sessionId` on User A's session $\rightarrow$ `404 NOT_FOUND`. |
| `ProgressModule` | Body Weight Entries | `{ _id: id, userId: req.user.id }` | User B attempts `DELETE /api/v1/progress/weight/:id` on User A's weigh-in $\rightarrow$ `404 NOT_FOUND`. |
| `CoachModule` | Chat Conversations | Scoped strictly to `req.user.id` | User B attempts `GET /api/v1/coach/history` $\rightarrow$ Returns only User B's messages. |

---

## 7. Data Protection, Privacy & Cryptographic Key Management

### 7.1 Data Minimization & Sensitive Fields ([FR-SAFE-001](file:///d:/2026/Personal%20Fitness%20&%20AI%20Coach%20Platform/FitMate-AI/docs/product/FUNCTIONAL_REQUIREMENTS.md#L305-L311))
- FitMate AI collects only the anthropometric and workout metrics strictly necessary for calculation (Age, Sex, Height, Weight, Activity Multiplier, Exercise Sets, Food Logs).
- The system never requests, processes, or stores contact address books, precise GPS locations, or unneeded device telemetry.

### 7.2 Cryptographic Key Inventory & Purpose Separation
| Key Identifier | Cryptographic Algorithm | Storage Location | Rotation Period | Purpose |
| :--- | :--- | :--- | :---: | :--- |
| `JWT_SIGNING_KEY` | RS256 / Ed25519 (Private Key) | AWS KMS / HashiCorp Vault | 90 days | Signs short-lived 15-minute access tokens. |
| `REFRESH_RECOVERY_KEY` | AES-256-GCM (256-bit symmetric) | AWS KMS / KMS Secret Store | 90 days | Encrypts successor refresh tokens during 30s grace period ([DB-036](file:///d:/2026/Personal%20Fitness%20&%20AI%20Coach%20Platform/FitMate-AI/docs/architecture/database/DATABASE_ISSUES.md#L88)). |
| `PSEUDONYMIZATION_HMAC_KEY` | HMAC-SHA256 (256-bit secret) | AWS KMS / Environment Variable | 180 days | Pseudonymizes user IDs in `consent_records` & `deletion_audit_logs` ([DB-013](file:///d:/2026/Personal%20Fitness%20&%20AI%20Coach%20Platform/FitMate-AI/docs/architecture/database/DATABASE_ISSUES.md#L65)). |
| `IP_SALT_SECRET` | HMAC-SHA256 (256-bit secret) | AWS KMS / Environment Variable | 180 days | Keyed salt for hashing client IP addresses in consent logs ([USERS_SCHEMA.md §3.6](file:///d:/2026/Personal%20Fitness%20&%20AI%20Coach%20Platform/FitMate-AI/docs/architecture/database/USERS_SCHEMA.md#L220-L225)). |

### 7.3 GDPR Recital 26 & Pseudonymization Realities
- Keyed cryptographic hashes (`HMAC-SHA256(userId, key)`) represent **pseudonymous data**, not legally anonymous data.
- Holder of the KMS key can re-identify subjects; therefore, pseudonymized records in `consent_records` and `deletion_audit_logs` remain subject to strict operational access controls and least-privilege security clearance.

---

## 8. Input Validation, Sanitization & Application Hardening

### 8.1 Schema Validation Standards (Zod Strict)
- 100% of incoming HTTP request bodies, path parameters, and query parameters are validated using Zod schemas configured with `.strict()`.
- Any unapproved or extraneous fields trigger immediate `400 Bad Request` with code `VALIDATION_ERROR`, mitigating prototype pollution and mass-assignment vulnerabilities.

### 8.2 NoSQL Query Injection Defense
- Raw user objects are strictly prohibited from being passed directly into Mongoose filter expressions.
- Primitive types are explicitly cast and validated before database invocation:
  ```typescript
  // SECURE PATTERN: Explicit primitive assignment
  const query = {
    _id: new Types.ObjectId(validatedParams.id),
    userId: new Types.ObjectId(authenticatedUserId),
  };
  await WorkoutSessionModel.findOne(query);
  ```

---

## 9. Infrastructure, Network & Runtime Security

### 9.1 Network Boundaries & Runtime Configuration
- **Transport Encryption**: TLS 1.3 enforced across all ingress points. Insecure HTTP connections are redirected to HTTPS with HSTS headers (`Strict-Transport-Security: max-age=31536000; includeSubDomains; preload`).
- **HTTP Security Headers (Helmet)**:
  - `Content-Security-Policy`: Default `'self'`; restricting script execution.
  - `X-Frame-Options`: `DENY` (clickjacking prevention).
  - `X-Content-Type-Options`: `nosniff` (MIME sniffing prevention).
  - `Referrer-Policy`: `strict-origin-when-cross-origin`.
- **Database Network Isolation**: MongoDB and Redis instances run in private VPC subnets with zero public internet exposure. Access is restricted via security groups to backend application containers.

---

## 10. External Integrations & Trust Boundaries

### 10.1 Google Identity OAuth 2.0 Integration
- **Trust Boundary**: Incoming ID tokens from client SDKs are verified cryptographically on the backend using Google's official public certificate keys (`https://www.googleapis.com/oauth2/v3/certs`).
- **Validation Invariants ([DB-021](file:///d:/2026/Personal%20Fitness%20&%20AI%20Coach%20Platform/FitMate-AI/docs/architecture/database/DATABASE_ISSUES.md#L73))**:
  - `iss` must match `accounts.google.com` or `https://accounts.google.com`.
  - `aud` must match the registered FitMate AI client ID.
  - `exp` must be in the future.
  - Immutable subject ID (`sub`) is used as `providerUserId` (never mutable email).

---

## 11. AI Coach Security, Prompt Injection & Clinical Guardrails

### 11.1 Three-Layer Prompt Safety Pipeline ([MODULE_BOUNDARIES.md §2.6](file:///d:/2026/Personal%20Fitness%20&%20AI%20Coach%20Platform/FitMate-AI/docs/architecture/MODULE_BOUNDARIES.md#L380-L395))
```
┌─────────────────────────────────────────────────────────────────────────────┐
│                   AI COACH 3-LAYER SAFETY PIPELINE                          │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  [ Incoming User Message ]                                                  │
│         │                                                                   │
│         ▼                                                                   │
│  [ TIER 1: Preliminary Deterministic Regex & Pattern Filter ]               │
│  - Scans for acute clinical queries, injuries, prescription drugs,          │
│    extreme starvation dieting (<1000 kcal), or self-harm markers.           │
│  - If matched -> Short-circuits immediately. Returns static refusal envelope│
│    without dispatching to external LLM.                                     │
│         │ (Passes Tier 1)                                                   │
│         ▼                                                                   │
│  [ TIER 2: Context Assembly & System Prompt Role Boundary ]                 │
│  - Context injected via explicit delimiter tags: <user_context>...</>       │
│  - System Role Boundary: "You are FitMate AI, an informational fitness      │
│    companion. You are NOT a doctor. You must refuse diagnosis..."           │
│         │                                                                   │
│         ▼                                                                   │
│  [ External LLM Adapter Call (AICoachAdapter) ]                             │
│  - Full response buffered in server memory (zero streaming to client).      │
│         │                                                                   │
│         ▼                                                                   │
│  [ TIER 3: Post-Generation Safety Validation ]                              │
│  - Scans complete buffered text for clinical prescription or diagnostic     │
│    language. If unsafe -> Discards text, logs alert, returns safe refusal.  │
│         │ (Passes Tier 3)                                                   │
│         ▼                                                                   │
│  [ Client Delivery with Medical Disclaimer Badge ]                          │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 11.2 Invariant Constraints & Permissions Enforcement
- **Prohibition of Medical Claims ([Core Invariant 1](file:///d:/2026/Personal%20Fitness%20&%20AI%20Coach%20Platform/FitMate-AI/.agents/AGENTS.md#L20-L24))**: Standard medical disclaimer is attached to every coaching response.
- **Zero Autonomous Write Permissions ([FR-COACH-005](file:///d:/2026/Personal%20Fitness%20&%20AI%20Coach%20Platform/FitMate-AI/docs/product/FUNCTIONAL_REQUIREMENTS.md#L276-L282))**: `CoachModule` possesses zero write access to `user_profiles`, `nutrition_logs`, or `workout_sessions`. All suggestions require manual user confirmation in the UI.

---

## 12. Testing Strategy & Modular Monolith Testing Pyramid

FitMate AI adopts a balanced, deterministic testing pyramid:

```
                      / \
                     /   \
                    / E2E \       E2E Critical Journeys (5%)
                   /───────\      Playwright / Detox
                  /  Integ  \     API & Module Integration (25%)
                 /   & API   \    Vitest + Supertest + MongoDB Memory
                /─────────────\
               /     Unit      \  Unit Tests (70%)
              /   Domain Logic  \ Vitest (Math, Calculations, Zod, State)
             /───────────────────\
```

- **Unit Tests (70%)**: Focus on pure arithmetic, Mifflin-St Jeor calculations, macronutrient scaling, 1RM Brzycki/Epley estimations, volume aggregation, unit converters, Zod schema validation rules, and state machine transitions. Zero network or database I/O; sub-millisecond execution.
- **Integration & API Tests (25%)**: Test Express route handlers, controllers, service boundaries, repository queries, MongoDB replica set transactions, and Redis rate limiters using Vitest, Supertest, and `mongodb-memory-server`.
- **End-to-End Tests (5%)**: Automated critical path journeys (Registration $\rightarrow$ Onboarding $\rightarrow$ Diary Log $\rightarrow$ Workout Completion $\rightarrow$ Account Deletion).

---

## 13. Test Frameworks, Tooling & Environment Isolation

### 13.1 Recommended Tooling Stack
- **Primary Test Runner**: **Vitest** (Native TypeScript support, ESM compatibility, blazing-fast multi-threaded execution, Jest-compatible API).
- **API Integration Testing**: **Supertest** + **`mongodb-memory-server`** (configured as a single-node replica set to test multi-document transactions).
- **Mobile Component & Hook Testing**: **`@testing-library/react-native`**.
- **Static Security Analysis (SAST)**: **ESLint Security Plugin** (`eslint-plugin-security`) + **Semgrep**.
- **Secret Scanning**: **Gitleaks** (enforced via pre-commit Husky hooks and CI pull request gates).
- **Dependency Vulnerability Scanning**: **`npm audit`** + **Snyk / Dependabot**.
- **Load & Performance Testing**: **k6** (scriptable JavaScript performance suites).

### 13.2 Test Environment Isolation
- **No Production Data in Tests**: Live production credentials, real user identities, and production database dumps are strictly banned from development and test environments.
- **Deterministic Fixtures**: Tests utilize isolated factory fixtures (e.g. `buildUserProfileFixture()`, `buildWorkoutSessionFixture()`) with automated cleanup between tests.

---

## 14. Test Coverage Matrix by Module

| Module Name | Critical Test Scenarios | Positive Test Cases | Negative & Boundary Cases | Security & Tenancy Cases | Target Code Coverage |
| :--- | :--- | :--- | :--- | :--- | :---: |
| **`AuthModule`** | Registration, Login, OAuth, Refresh Rotation, Password Reset. | Valid registration returns 201 + tokens; valid login succeeds. | Weak passwords rejected; duplicate email returns 409; expired tokens rejected. | Refresh token reuse detection triggers global revocation; BOLA on session tokens. | $\ge 90\%$ |
| **`UsersModule`** | Profile creation, Anthropometric updates, Target recalculation, Deletion saga. | Updating metrics updates profile and logs weight in Progress. | Height $<100$ cm or $>250$ cm rejected; weight $<30$ kg rejected. | Custom targets protected from silent overwrite; BOLA on profile reads/writes. | $\ge 85\%$ |
| **`NutritionModule`** | Diary retrieval, Quick-Add logging, Catalog search, Macro scaling. | Logging food scales macros accurately; returns `isEstimated: true`. | Negative calories rejected; invalid date strings rejected; unknown food IDs return 404. | Cross-user meal deletion blocked (404); search query sanitization. | $\ge 85\%$ |
| **`WorkoutsModule`** | Exercise search, Session completion, Volume accumulation, Offline sync. | Completing sets calculates total volume; idempotency key prevents duplicate sessions. | Sets with 0 reps rejected; duplicate offline sync returns cached 200 without duplicate metrics. | Cross-user session access blocked (404); invalid exercise IDs rejected. | $\ge 85\%$ |
| **`ProgressModule`** | Weight logging, 7-day moving average, Calendar markers. | Logging weight appends to ledger; $\ge 3$ weigh-ins plots honest moving average. | Missing days show honest gaps (no interpolation); negative weights rejected. | Cross-user weigh-in deletion blocked (404); date range validation. | $\ge 85\%$ |
| **`CoachModule`** | 3-tier safety guardrails, Context injection, Hourly rate limiting. | General fitness question returns safe advice with medical disclaimer. | Clinical queries (injuries, pills) trigger Tier 1/Tier 3 refusals; rate limit $>20$ msgs/hr returns 429. | Prompt injection neutralized; zero DB write operations confirmed by audit. | $\ge 90\%$ |

---

## 15. Critical End-to-End Workflow Test Plans

### Workflow 1: Atomic User Registration & Baseline Weigh-In (`POST /api/v1/auth/register`)
- **Preconditions**: Client has completed in-memory onboarding questionnaire.
- **Action**: Dispatches registration payload with credentials, anthropometrics, and consent.
- **Expected Results**:
  1. Transaction commits across `users`, `user_identities`, `refresh_tokens`, `user_profiles`, `consent_records`, and `body_weight_entries`.
  2. 15-minute access JWT and 30-day refresh token returned.
  3. Authoritative baseline weigh-in is present in `body_weight_entries`.
- **Negative / Failure Test**: Inject a unique constraint failure on `users.email`. Assert transaction cleanly aborts with zero orphaned records in `user_profiles` or `body_weight_entries`.

### Workflow 2: Refresh Token Rotation & Grace Recovery Race Condition
- **Preconditions**: User holds active access token and refresh token $R_1$.
- **Action**: Client issues concurrent refresh requests ($Req_A$ and $Req_B$) within 50ms using $R_1$.
- **Expected Results**:
  1. $Req_A$ succeeds, rotates token to $R_2$, and stores AES-256-GCM encrypted recovery payload.
  2. $Req_B$ arrives within 30s grace window, successfully decrypts and returns successor token $R_2$ without triggering false-positive reuse revocation.
  3. A subsequent request using $R_1$ after 30s triggers reuse detection, invalidating $R_2$ and incrementing `tokenVersion`.

### Workflow 3: Multi-Module Account Deletion Saga (`DELETE /api/v1/users/account`)
- **Preconditions**: User has active account, profile, 5 workout sessions, 10 nutrition logs, 15 weigh-ins, and 3 coach chats.
- **Action**: User confirms deletion with password.
- **Expected Results**:
  1. Operational saga job is persisted in `deletion_saga_jobs` with status `pending`.
  2. Account status updates to `pending_deletion` and sessions are revoked.
  3. Worker sequentially purges `workout_sessions`, `nutrition_logs`, `body_weight_entries`, `coach_conversations`, `user_profiles`, and `user_identities`.
  4. `consent_records` are pseudonymized (`userId = null`, `pseudonymizedUserId = HMAC`).
  5. Terminal audit record is created in `deletion_audit_logs`.
  6. Subsequent API requests with old tokens return `401 Unauthorized`.
- **Failure Recovery Test**: Simulate worker SIGKILL during Step 3. Background reconciliation sweeper reclaims expired lease after 60s and completes remaining steps to terminal success.

---

## 16. Database Integrity & Transactional Testing (Replica Set)

- **Replica Set Prerequisite ([DB-032](file:///d:/2026/Personal%20Fitness%20&%20AI%20Coach%20Platform/FitMate-AI/docs/architecture/database/DATABASE_ISSUES.md#L84))**: Multi-document transactions require a replica set. Integration tests run against an ephemeral single-node replica set configured in `vitest.setup.ts`.
- **Index Optimization & ESR Verification**: Integration tests execute `.explain('executionStats')` on high-traffic queries to assert that `totalDocsExamined === nReturned` and `stage !== 'COLLSCAN'`.
- **TTL Index Verification ([DB-023](file:///d:/2026/Personal%20Fitness%20&%20AI%20Coach%20Platform/FitMate-AI/docs/architecture/database/DATABASE_ISSUES.md#L75))**: Verify that query filters explicitly enforce `expiresAt > new Date()` to prevent relying on background TTL thread latency.

---

## 17. Performance, Concurrency & Load Testing

### 17.1 Measurable Performance Objectives
In alignment with [NON_FUNCTIONAL_REQUIREMENTS.md](file:///d:/2026/Personal%20Fitness%20&%20AI%20Coach%20Platform/FitMate-AI/docs/product/NON_FUNCTIONAL_REQUIREMENTS.md) and [NFR-PERF-001 to 004](file:///d:/2026/Personal%20Fitness%20&%20AI%20Coach%20Platform/FitMate-AI/docs/architecture/MODULE_BOUNDARIES.md):

| Target Endpoint Category | Target Concurrency | Target p95 Latency | Target Throughput | Failure Criteria |
| :--- | :---: | :---: | :---: | :--- |
| **Authentication (`/login`, `/refresh`)** | 50 virtual users | $< 150\,\text{ms}$ | 200 req/sec | Error rate $> 0.1\%$ |
| **Local Food Catalog Search** | 100 virtual users | $< 50\,\text{ms}$ | 500 req/sec | Error rate $> 0.05\%$ |
| **Nutrition Diary Retrieval** | 100 virtual users | $< 100\,\text{ms}$ | 400 req/sec | Error rate $> 0.1\%$ |
| **Workout Session Commit** | 50 virtual users | $< 200\,\text{ms}$ | 150 req/sec | Error rate $> 0.1\%$ |
| **AI Coach Chat Dispatch** | 20 virtual users | $< 3.0\,\text{s}$ (p90) | 20 req/sec | Error rate $> 1.0\%$ |

### 17.2 Load Test Suite Configurations (k6)
- **Smoke Test**: 1 VU, 1 minute duration to verify zero script regressions.
- **Load Test**: Ramp-up to 100 VUs over 5 minutes, sustain for 15 minutes, ramp-down over 2 minutes.
- **Stress Test**: Ramp-up to 300 VUs over 10 minutes to locate system breaking points and memory leaks.
- **Spike Test**: Surge from 10 to 200 VUs in 10 seconds to evaluate rate-limiter and connection-pool resilience.

---

## 18. Reliability, Chaos & Failure Recovery Testing

- **Database Disconnection Handling**: Tests simulate MongoDB failover by disconnecting the driver connection. Assert that the API responds with `503 Service Unavailable` (`SERVICE_UNAVAILABLE`) with appropriate retry headers, avoiding hung sockets or unhandled process crashes.
- **Redis Cache Outage Resilience**: Tests simulate Redis node death. Assert that routine authenticated read operations degrade gracefully while rate-limiting falls back to fail-safe database counting or safe operational boundaries.
- **External AI LLM Gateway Outage**: Tests mock HTTP 504 timeouts and 500 server errors from external LLM providers. Assert that `AICoachAdapter` catches the error, records failure in chat history, and returns safe fallback advice without crashing Express.

---

## 19. CI/CD Quality Gates & DevSecOps Pipeline

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    AUTOMATED CI/CD QUALITY GATES PIPELINE                   │
├───────────────┬──────────────────────────────┬──────────────────────────────┤
│ Pipeline Stage│ Tooling / Checks Enforced    │ Gate Policy & Threshold      │
├───────────────┼──────────────────────────────┼──────────────────────────────┤
│ 1. Pre-Commit │ Husky, lint-staged, Gitleaks │ BLOCKING: Zero cleartext     │
│    (Local)    │                              │ secrets committed.           │
├───────────────┼──────────────────────────────┼──────────────────────────────┤
│ 2. Lint & Type│ ESLint, Prettier,            │ BLOCKING: Zero lint errors,  │
│    Check      │ TypeScript (tsc --noEmit)    │ zero TypeScript errors.      │
├───────────────┼──────────────────────────────┼──────────────────────────────┤
│ 3. Unit Tests │ Vitest (Unit Suites)         │ BLOCKING: 100% pass rate;    │
│               │                              │ coverage >= 85% core domain. │
├───────────────┼──────────────────────────────┼──────────────────────────────┤
│ 4. Integration│ Vitest, Supertest,           │ BLOCKING: 100% pass rate on  │
│    & API Gate │ mongodb-memory-server        │ all BOLA and auth suites.    │
├───────────────┼──────────────────────────────┼──────────────────────────────┤
│ 5. Security & │ npm audit, Snyk, Semgrep     │ BLOCKING: 0 Critical, 0 High │
│    SCA Scan   │                              │ vulnerabilities allowed.     │
├───────────────┼──────────────────────────────┼──────────────────────────────┤
│ 6. Build Gate │ Next.js / Node.js build      │ BLOCKING: Zero build warnings│
│               │                              │ or compilation failures.     │
├───────────────┼──────────────────────────────┼──────────────────────────────┤
│ 7. Staging    │ k6 Load Tests, Smoke Suites  │ ADVISORY / GATED: p95 latency│
│    Verification                              │ within approved thresholds.  │
└───────────────┴──────────────────────────────┴──────────────────────────────┘
```

---

## 20. Security Monitoring, Audit Logging & Incident Response

### 20.1 Structured Security Event Logging
All security-relevant events are emitted as structured JSON logs tagged with a correlation ID (`X-Correlation-ID`):
- `AUTH_LOGIN_FAILED`: Records IP hash, timestamp, user agent snippet.
- `AUTH_TOKEN_REUSE_DETECTED`: Records user ID, token family ID, client IP hash. Triggers high-priority security alert.
- `BOLA_ACCESS_ATTEMPT`: Records authenticated user ID, attempted foreign resource ID, endpoint path.
- `ACCOUNT_DELETION_INITIATED`: Records saga ID, user ID, requested timestamp.

### 20.2 Incident Severity Classification & Runbooks
- **SEV-1 (Critical)**: Active data breach, confirmed BOLA exploit in production, or compromise of KMS signing keys.
  - *Action*: Emergency hotfix deployment, immediate revocation of all sessions via `tokenVersion` increment, rotation of KMS keys.
- **SEV-2 (High)**: Bypass of rate-limiting, intermittent transaction rollback failures, or prompt injection extracting private context.
  - *Action*: Mitigation within 4 hours; patch deployment within 12 hours.
- **SEV-3 (Medium/Low)**: Flaky integration test, minor UI estimation badge omission.
  - *Action*: Scheduled sprint bug fix.

---

## 21. Release Acceptance Criteria & Quality Gates

An engineering release candidate is designated **Production-Ready** if and only if all of the following criteria are satisfied:
1. **Zero High/Critical Vulnerabilities**: Static analysis (Semgrep) and dependency scans (`npm audit`) report zero open Critical or High severity findings.
2. **100% Passing Test Suites**: Unit, integration, BOLA negative tests, and E2E critical path suites execute with zero failures.
3. **Code Coverage Met**: Minimum 85% overall backend coverage, with $\ge 90\%$ coverage on `AuthModule` and `CoachModule` guardrails.
4. **BOLA Verification Complete**: All 36 endpoints verified against cross-user access attempts.
5. **Nutrition Estimation Badge Audit**: 100% of nutrition and diary endpoints assert `isEstimated: true` in response payloads.
6. **Performance Objectives Met**: k6 load tests confirm p95 response times under target thresholds under 100 concurrent virtual users.

---

## 22. Consolidated Security & Testing Risk Register

| Risk ID | Category | Description | Severity | Likelihood | Impact | Proposed Mitigation | Verification Method | Associated Issues |
| :--- | :--- | :--- | :---: | :---: | :---: | :--- | :--- | :--- |
| **SEC-001** | Auth | Refresh token race condition causing false-positive user lockout during network flapping. | High | High | High | 30s grace window with AES-256-GCM recovery encryption. | Concurrent refresh automated test suite. | `DB-022`, `DB-036`, `API-001` |
| **SEC-002** | Auth | Incomplete onboarding Google users bypassing profile gates to access coaching. | High | Medium | High | `isOnboardingCompleted: false` route guards returning 403. | Negative API integration test on Google skeleton accounts. | `DB-026`, `API-003` |
| **SEC-003** | Privacy | Statutory retention duration for deletion audit logs not yet finalized by legal counsel. | Medium | High | Medium | Configurable TTL index on `deletion_audit_logs`; pseudonymous HMAC storage. | Schema validation test on TTL expiration field. | `DB-018`, `DB-029` |
| **SEC-004** | DoS | Redis cache outage causing in-process Coach hourly rate limiter bypass. | Medium | Low | High | Fallback atomic counter or fail-closed policy when Redis is unreachable. | Chaos simulation test disconnecting Redis client. | `DB-030`, `API-003` |
| **SEC-005** | Integrity | Stale offline workout queue (>24h) submitting expired idempotency keys causing double session logging. | Medium | Medium | Medium | Constrain `TTL >= MaxSupportedOfflineQueueAge`. | Stale queue replay integration test. | `DB-024`, `API-004` |
| **SEC-006** | AI Safety | Adversarial prompt engineering coaxing LLM into recommending clinical injury rehab exercises. | High | Medium | Critical | 3-tier safety pipeline with Tier 3 server-side response scanning. | Adversarial prompt benchmark test suite. | `FR-COACH-002` |

---

## 23. Open Architectural Decisions & Assumptions

1. **DB-018 (Durable Saga Queue Engine)**: Whether `deletion_saga_jobs` executes via MongoDB collection or Redis / BullMQ remains an **OPEN decision**. Testing strategy defines test cases applicable to both backends.
2. **DB-040 (Fast Token Revocation via Redis)**: Evaluating a distributed Redis cache for instant sub-millisecond global `tokenVersion` checks remains **OPEN**.
3. **ARCH-006 (Transactional Outbox vs In-Process Event Bus)**: Evaluating an outbox collection for `weight.recorded` events remains **OPEN**. Testing strategy includes on-demand snapshot rebuild tests.
4. **Statutory Retention Duration**: The exact retention window for `deletion_audit_logs` remains **OPEN** pending legal counsel review.

---

## 24. Document Metadata & Change History

- **v1.0.0 (2026-11-02)**: Initial complete baseline Security & Testing Strategy specification covering STRIDE threat modeling, OWASP Top 10/API assessments, authentication/authorization verification, 3-tier AI Coach guardrails, testing pyramid, k6 load testing, CI/CD quality gates, and consolidated risk register. Status: **PROPOSED — Awaiting Human Review**.

