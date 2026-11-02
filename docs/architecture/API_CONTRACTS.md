# FitMate AI — API Contracts Specification

**Document Version:** 1.0.0  
**Phase:** 3.3 — API Contracts Design  
**Status:** PROPOSED — Awaiting Human Review  
**Last Updated:** 2026-11-02  
**Owning Architecture:** Backend Architecture & Security Engineering  
**References:**  
- Phase 3.1: [SYSTEM_ARCHITECTURE.md](file:///d:/2026/Personal%20Fitness%20&%20AI%20Coach%20Platform/FitMate-AI/docs/architecture/SYSTEM_ARCHITECTURE.md) v1.1.0  
- Phase 3.1: [MODULE_BOUNDARIES.md](file:///d:/2026/Personal%20Fitness%20&%20AI%20Coach%20Platform/FitMate-AI/docs/architecture/MODULE_BOUNDARIES.md) v1.1.0  
- Phase 3.1: [ARCHITECTURE_DECISION_RECORDS.md](file:///d:/2026/Personal%20Fitness%20&%20AI%20Coach%20Platform/FitMate-AI/docs/architecture/ARCHITECTURE_DECISION_RECORDS.md) v1.1.0  
- Phase 3.2: [DATABASE_ISSUES.md](file:///d:/2026/Personal%20Fitness%20&%20AI%20Coach%20Platform/FitMate-AI/docs/architecture/database/DATABASE_ISSUES.md) v1.2.0  
- Phase 3.2: [DATABASE_SCHEMA.md](file:///d:/2026/Personal%20Fitness%20&%20AI%20Coach%20Platform/FitMate-AI/docs/architecture/database/DATABASE_SCHEMA.md) (AuthModule) v1.1.0  
- Phase 3.2: [USERS_SCHEMA.md](file:///d:/2026/Personal%20Fitness%20&%20AI%20Coach%20Platform/FitMate-AI/docs/architecture/database/USERS_SCHEMA.md) v1.2.0  
- Phase 2: [FUNCTIONAL_REQUIREMENTS.md](file:///d:/2026/Personal%20Fitness%20&%20AI%20Coach%20Platform/FitMate-AI/docs/product/FUNCTIONAL_REQUIREMENTS.md) v2.0.0  
- Phase 2: [SCREEN_INVENTORY.md](file:///d:/2026/Personal%20Fitness%20&%20AI%20Coach%20Platform/FitMate-AI/docs/product/SCREEN_INVENTORY.md) v2.0.0  
- Global Agent Rules: [AGENTS.md](file:///d:/2026/Personal%20Fitness%20&%20AI%20Coach%20Platform/FitMate-AI/.agents/AGENTS.md)  

---

## 1. Document Overview & Executive Summary

This document specifies the complete, production-grade REST API contracts for FitMate AI. It serves as the formal boundary contract between mobile client applications (React Native / Expo) and the backend Modular Monolith (Node.js / Express / TypeScript / MongoDB).

### 1.1 Architectural Invariants & Scope Principles
1. **Strict Modular Monolith Encapsulation**: Controllers route requests strictly through domain module public service interfaces. Zero cross-module collection queries or route trespassing.
2. **Explicit Data Transfer Objects (DTOs)**: Every request and response uses strict schemas. Internal MongoDB entities, version keys (`__v`), password hashes, and raw cryptographic secrets are NEVER leaked.
3. **Tenancy & BOLA/IDOR Immunity**: Authenticated endpoints extract user identity exclusively from cryptographically verified access tokens (`req.user.id`). Client-supplied user IDs in URLs or bodies are never trusted as proof of ownership.
4. **Mandatory Estimation Badges**: Every endpoint exposing calculated nutrition metrics, energy budgets, or daily allowances includes `isEstimated: true` ([Core Invariant 2](file:///d:/2026/Personal%20Fitness%20&%20AI%20Coach%20Platform/FitMate-AI/.agents/AGENTS.md#L25-L35), `DB-012`).
5. **Universal Bilingual & Multi-Unit Ergonomics**: APIs support English (`en`) and Arabic (`ar`) localization headers and provide normalized metric values alongside requested unit systems (`metric` | `imperial`) ([ADR-010](file:///d:/2026/Personal%20Fitness%20&%20AI%20Coach%20Platform/FitMate-AI/docs/architecture/ARCHITECTURE_DECISION_RECORDS.md#L450-L498), [ADR-011](file:///d:/2026/Personal%20Fitness%20&%20AI%20Coach%20Platform/FitMate-AI/docs/architecture/ARCHITECTURE_DECISION_RECORDS.md#L499-L519)).

---

## 2. Global API Design Standards

### 2.1 Base Path, Versioning & Deprecation Policy
- **Base URI Prefix**: `/api/v1`
- **Versioning Strategy**: Path-based major versioning (`/api/v1`, `/api/v2`). Minor non-breaking additions (new optional request fields, new response fields) occur within `/api/v1`.
- **Breaking Changes Policy**: Any modification altering field types, removing fields, adding mandatory request parameters, or changing status code semantics requires a new version prefix (`/api/v2`).
- **Deprecation Header Contract**: Deprecated endpoints return RFC 8594 standard headers:
  - `Deprecation: @<timestamp>` (Unix timestamp when deprecation took effect)
  - `Sunset: <HTTP-date>` (Planned shutdown date)
  - `Link: </api/v2/resource>; rel="successor-version"`
- **Unsupported Versions**: Requesting an unsupported or retired API version returns `410 Gone` with machine-readable code `API_VERSION_RETIRED`.

### 2.2 Standard Response Envelopes
All HTTP responses adhere to a consistent JSON envelope to ensure predictable client-side deserialization:

#### A. Success Envelope — Single Resource
```json
{
  "success": true,
  "data": {
    "id": "6725619b0f9488a4e3df5678",
    "createdAt": "2026-11-02T01:30:00.000Z"
  }
}
```

#### B. Success Envelope — Paginated Collection
```json
{
  "success": true,
  "data": [
    { "id": "6725619b0f9488a4e3df5678" }
  ],
  "meta": {
    "pagination": {
      "page": 1,
      "limit": 20,
      "totalItems": 85,
      "totalPages": 5,
      "hasNextPage": true,
      "hasPrevPage": false
    }
  }
}
```

#### C. Error Envelope
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "The submitted payload failed validation constraints.",
    "correlationId": "req-89e4b6c1-5612-4d22-bf02-99ef62c418a0",
    "details": [
      {
        "field": "heightCm",
        "message": "Height must be between 100.0 and 250.0 cm."
      }
    ]
  }
}
```

### 2.3 Date, Time, and Timezone Conventions ([DB-017](file:///d:/2026/Personal%20Fitness%20&%20AI%20Coach%20Platform/FitMate-AI/docs/architecture/database/DATABASE_ISSUES.md#L69))
1. **Point-in-Time Timestamps**: All exact event timestamps (`createdAt`, `updatedAt`, `startedAt`, `completedAt`, `expiresAt`) are serialized strictly as **ISO 8601 UTC strings** with millisecond precision and a `Z` suffix: `YYYY-MM-DDTHH:mm:ss.sssZ`.
2. **Calendar Diary Dates**: Nutrition meal logs and daily summaries represent human calendar dates, not specific instants. They are serialized as **Date-Only strings**: `YYYY-MM-DD`.
3. **Timezone Context**: When querying or creating date-specific entries, clients supply their local UTC offset via the standard header `X-Timezone-Offset-Minutes: -120` (or `+180`) or query parameter to guarantee that midnight boundaries align exactly with the user's physical day.

### 2.4 Multi-Unit Engine & Localization Conventions ([ADR-010](file:///d:/2026/Personal%20Fitness%20&%20AI%20Coach%20Platform/FitMate-AI/docs/architecture/ARCHITECTURE_DECISION_RECORDS.md#L450-L498), [ADR-011](file:///d:/2026/Personal%20Fitness%20&%20AI%20Coach%20Platform/FitMate-AI/docs/architecture/ARCHITECTURE_DECISION_RECORDS.md#L499-L519))
1. **Canonical Metric Storage & Display Normalization**:
   - The database persists all weights strictly in kilograms (`weightKg`, float64, 2 decimals) and heights in centimeters (`heightCm`, float64, 1 decimal).
   - In response DTOs, values are returned canonically in metric, accompanied by explicit unit tags. When requested with `X-Unit-System: imperial` (or `?units=imperial`), the response includes converted presentation helpers (`displayWeight: { value: 176.37, unit: "lbs" }`) without mutating underlying precision.
2. **Language Negotiation & Safe Error Localization**:
   - Clients pass `Accept-Language: ar` or `Accept-Language: en`.
   - The `error.message` is translated to the requested language for safe UI presentation, but `error.code` remains an **immutable, stable English machine-readable token** (e.g. `INVALID_CREDENTIALS`).

---

## 3. Global Security, Authentication & Session Architecture

### 3.1 Token Transport & Lifecycle Contracts
- **Access Tokens**: Short-lived JWTs signed with `RS256` or `EdDSA`. Lifespan is strictly **15 minutes**. Transported in the standard header: `Authorization: Bearer <jwt>`. Kept in transient client RAM; never written to persistent flash.
- **Refresh Tokens**: Long-lived cryptographically random 256-bit strings. Lifespan is **30 days**. Stored on mobile clients in `expo-secure-store` (iOS Keychain / Android EncryptedSharedPreferences). Transported strictly in JSON request bodies (`{ "refreshToken": "..." }`) or HTTP-only secure cookies where applicable.
- **Refresh Token Rotation & Ephemeral Recovery ([DB-022](file:///d:/2026/Personal%20Fitness%20&%20AI%20Coach%20Platform/FitMate-AI/docs/architecture/database/DATABASE_ISSUES.md#L74), [DB-036](file:///d:/2026/Personal%20Fitness%20&%20AI%20Coach%20Platform/FitMate-AI/docs/architecture/database/DATABASE_ISSUES.md#L88), [DB-037](file:///d:/2026/Personal%20Fitness%20&%20AI%20Coach%20Platform/FitMate-AI/docs/architecture/database/DATABASE_ISSUES.md#L89))**:
  - Every call to `POST /api/v1/auth/refresh` revokes the incoming token and issues a new refresh token family member.
  - *30-Second Grace Period*: To survive mobile network flapping and concurrent requests, the immediate predecessor token remains valid for 30 seconds. Successor tokens are encrypted using authenticated `AES-256-GCM` with an external KMS key to permit ephemeral re-replay during the grace window.
  - *Automated Reuse Detection*: If a revoked refresh token is presented outside the 30-second grace period, the entire token family is immediately revoked, and `tokenVersion` on the `User` document is incremented, terminating all user sessions globally.

### 3.2 TokenVersion & Instant Revocation Semantics ([DB-040](file:///d:/2026/Personal%20Fitness%20&%20AI%20Coach%20Platform/FitMate-AI/docs/architecture/database/DATABASE_ISSUES.md#L92))
- The user account maintains an integer `tokenVersion` in the database.
- High-security endpoints (Password changes, account deletion `DELETE /api/v1/users/account`, legal consent withdrawal) execute authoritative validation against `users.tokenVersion`.
- If `tokenVersion` does not match the access JWT claim, the request is rejected immediately with `401 Unauthorized` (`TOKEN_REVOKED`).

### 3.3 Centralized BOLA / IDOR Defense Matrix
| Resource Category | Identifier Location | Verification Mechanism | Failure Status & Code |
| :--- | :--- | :--- | :--- |
| **Profile & Preferences** | Implicit | Scoped to `req.user.id` extracted from validated JWT. | `401 UNAUTHORIZED` |
| **Nutrition Logs** | Path: `:logId`, `:itemId` | Repository queries `{ _id: logId, userId: req.user.id }`. | `404 NOT_FOUND` |
| **Workout Sessions** | Path: `:sessionId` | Repository queries `{ _id: sessionId, userId: req.user.id }`. | `404 NOT_FOUND` |
| **Weight Entries** | Path: `:id` | Repository queries `{ _id: id, userId: req.user.id }`. | `404 NOT_FOUND` |
| **Coach History** | Implicit | Scoped strictly to `req.user.id`. | `401 UNAUTHORIZED` |

*Security Rule*: To prevent resource enumeration, if an authenticated user attempts to access a resource ID belonging to another user, the API responds with `404 NOT_FOUND` rather than `403 FORBIDDEN`.

### 3.4 OWASP API Security Top 10 Mitigation Matrix
- **API1:2023 Broken Object Level Authorization (BOLA)**: Strict query scoping via `req.user.id`. Zero multi-tenant leaks.
- **API2:2023 Broken Authentication**: Argon2id password hashing, 15-minute access JWTs, rotating refresh tokens with automatic reuse detection, constant-time comparisons.
- **API3:2023 Broken Object Property Level Authorization**: Strict Zod schema allowlists (`.strict()`). Mass assignment of internal flags (`isEmailVerified`, `status`, `tokenVersion`) is structurally impossible.
- **API4:2023 Unrestricted Resource Consumption**: Centralized Redis sliding-window rate limiting on auth, AI Coach (20 req/hr), and search endpoints. Pagination bounded at `limit <= 100`.
- **API5:2023 Broken Function Level Authorization**: Admin/support endpoints strictly segregated and gated behind role guards.
- **API6:2023 Unrestricted Access to Sensitive Business Flows**: Account deletion and password resets require multi-step verification and idempotent locks.
- **API7:2023 Server Side Request Forgery (SSRF)**: FitMate AI makes zero outbound webhook or user-supplied URL fetching calls in MVP.
- **API8:2023 Security Misconfiguration**: CORS strictly locked to authorized mobile bundle IDs and web domains; `X-Content-Type-Options: nosniff`, `Strict-Transport-Security` enforced.
- **API9:2023 Improper Inventory Management**: Strictly maintained endpoint inventory; retired endpoints return `410 Gone`.
- **API10:2023 Unsafe Consumption of APIs**: AI Coach LLM inputs and outputs pass through three-layer safety guardrails with pre-validation buffering.

---

## 4. Centralized Rate Limiting & Abuse Protection

| Rate-Limit Category | Scope Key | Max Requests | Window | Headers Returned | Action on Breach |
| :--- | :--- | :---: | :---: | :--- | :--- |
| **Auth Strict (Login/Register)**| Client IP | 5 | 15 minutes | `RateLimit-Limit`, `RateLimit-Remaining`, `RateLimit-Reset` | `429 RATE_LIMIT_EXCEEDED` + `Retry-After` |
| **Password Reset Request** | Client IP + Email | 3 | 1 hour | Standard RateLimit headers | `429 RATE_LIMIT_EXCEEDED` (Generic message returned) |
| **Silent Refresh** | User ID | 30 | 1 minute | Standard RateLimit headers | `429 RATE_LIMIT_EXCEEDED` |
| **AI Coach Chat** | User ID | 20 | 1 hour | Standard RateLimit headers | `429 COACH_RATE_LIMIT_EXCEEDED` |
| **Food & Exercise Search** | User ID / IP | 60 | 1 minute | Standard RateLimit headers | `429 RATE_LIMIT_EXCEEDED` |
| **Standard Mutation / Writes**| User ID | 120 | 1 minute | Standard RateLimit headers | `429 RATE_LIMIT_EXCEEDED` |
| **General Read Endpoints** | User ID | 300 | 1 minute | Standard RateLimit headers | `429 RATE_LIMIT_EXCEEDED` |

---

## 5. Master Endpoint Inventory

The following 33 endpoints constitute the complete approved client-facing REST API surface for FitMate AI Phase 3:

| Endpoint ID | Module | Method | Route Path | Purpose | Auth | Ownership / Guard | Idempotent | Rate Limit | Status |
| :--- | :--- | :---: | :--- | :--- | :---: | :--- | :---: | :---: | :---: |
| **EP-AUTH-001** | Auth | `POST` | `/api/v1/auth/register` | Atomic user registration with onboarding metrics | None | Public / Duplicate Check | No | Auth Strict | Proposed |
| **EP-AUTH-002** | Auth | `POST` | `/api/v1/auth/login` | Local credentials authentication | None | Public | No | Auth Strict | Proposed |
| **EP-AUTH-003** | Auth | `POST` | `/api/v1/auth/oauth` | Third-party Google OAuth login / account creation | None | Public | No | Auth Strict | Proposed |
| **EP-AUTH-004** | Auth | `POST` | `/api/v1/auth/refresh` | Silent access token refresh & rotation | None | Public (Valid Token) | Yes (Grace) | Silent Refresh | Proposed |
| **EP-AUTH-005** | Auth | `POST` | `/api/v1/auth/logout` | Revoke active refresh token session | Bearer | Authenticated User | Yes | Standard Writes | Proposed |
| **EP-AUTH-006** | Auth | `POST` | `/api/v1/auth/forgot-password`| Request password reset email | None | Public (Anti-Enum) | Yes | Password Reset | Proposed |
| **EP-AUTH-007** | Auth | `POST` | `/api/v1/auth/reset-password` | Consume reset token and set new password | None | Single-Use Token | Yes | Auth Strict | Proposed |
| **EP-AUTH-008** | Auth | `POST` | `/api/v1/auth/change-password`| Change password for logged-in user | Bearer | Resource Owner | No | Auth Strict | Proposed |
| **EP-AUTH-009** | Auth | `GET` | `/api/v1/auth/me` | Fetch active authentication identity | Bearer | Resource Owner | Yes | General Reads | Proposed |
| **EP-USER-001** | Users | `GET` | `/api/v1/users/profile` | Retrieve physical profile, metrics, and targets | Bearer | Resource Owner | Yes | General Reads | Proposed |
| **EP-USER-002** | Users | `PATCH` | `/api/v1/users/profile` | Update profile traits, goal, or custom targets | Bearer | Resource Owner | Yes | Standard Writes | Proposed |
| **EP-USER-003** | Users | `POST` | `/api/v1/users/onboarding/complete` | Complete onboarding for Google OAuth skeleton | Bearer | Incomplete Onboarding | Yes | Standard Writes | Proposed |
| **EP-USER-004** | Users | `PATCH` | `/api/v1/users/preferences` | Update language and unit system preferences | Bearer | Resource Owner | Yes | Standard Writes | Proposed |
| **EP-USER-005** | Users | `DELETE` | `/api/v1/users/account` | Initiate permanent account deletion saga | Bearer | Resource Owner + Pass | Yes (Key) | Auth Strict | Proposed |
| **EP-USER-006** | Users | `GET` | `/api/v1/users/account/deletion-status` | Check operational status of deletion saga | Bearer | Resource Owner | Yes | General Reads | Proposed |
| **EP-USER-007** | Users | `GET` | `/api/v1/users/consents` | List active legal disclaimers and consents | Bearer | Resource Owner | Yes | General Reads | Proposed |
| **EP-USER-008** | Users | `POST` | `/api/v1/users/consents` | Record affirmative consent or withdrawal action | Bearer | Resource Owner | Yes | Standard Writes | Proposed |
| **EP-NUTR-001** | Nutrition | `GET` | `/api/v1/nutrition/diary` | Fetch 4-slot daily nutrition diary and totals | Bearer | Resource Owner | Yes | General Reads | Proposed |
| **EP-NUTR-002** | Nutrition | `POST` | `/api/v1/nutrition/meals/quick-add`| Log manual calorie & macro entry to meal slot | Bearer | Resource Owner | No | Standard Writes | Proposed |
| **EP-NUTR-003** | Nutrition | `POST` | `/api/v1/nutrition/meals/item` | Log curated food item scaled by portion | Bearer | Resource Owner | No | Standard Writes | Proposed |
| **EP-NUTR-004** | Nutrition | `DELETE` | `/api/v1/nutrition/meals/:logId/items/:itemId` | Remove individual logged food entry | Bearer | Resource Owner | Yes | Standard Writes | Proposed |
| **EP-NUTR-005** | Nutrition | `GET` | `/api/v1/nutrition/foods/search` | Search curated local food catalog (bilingual) | Bearer | Resource Owner | Yes | Search Cache | Proposed |
| **EP-NUTR-006** | Nutrition | `GET` | `/api/v1/nutrition/foods/:id` | Retrieve detailed nutrient profile of single food | Bearer | Resource Owner | Yes | General Reads | Proposed |
| **EP-WORK-001** | Workouts | `GET` | `/api/v1/workouts/exercises` | Browse & filter curated ~100 exercise library | Bearer | Resource Owner | Yes | Search Cache | Proposed |
| **EP-WORK-002** | Workouts | `GET` | `/api/v1/workouts/exercises/:id` | Fetch exercise instructions, cues, and muscle tags| Bearer | Resource Owner | Yes | General Reads | Proposed |
| **EP-WORK-003** | Workouts | `POST` | `/api/v1/workouts/sessions` | Commit completed workout session & volume | Bearer | Resource Owner | Yes (Key) | Standard Writes | Proposed |
| **EP-WORK-004** | Workouts | `GET` | `/api/v1/workouts/sessions/:id` | Retrieve completed workout session details | Bearer | Resource Owner | Yes | General Reads | Proposed |
| **EP-WORK-005** | Workouts | `POST` | `/api/v1/workouts/sync` | Batch synchronization for offline workout sessions| Bearer | Resource Owner | Yes (Key) | Standard Writes | Proposed |
| **EP-PROG-001** | Progress | `GET` | `/api/v1/progress/weight` | Fetch weight history with honest 7-day trend | Bearer | Resource Owner | Yes | General Reads | Proposed |
| **EP-PROG-002** | Progress | `POST` | `/api/v1/progress/weight` | Log body weight measurement for date | Bearer | Resource Owner | Yes (Key) | Standard Writes | Proposed |
| **EP-PROG-003** | Progress | `DELETE` | `/api/v1/progress/weight/:id` | Delete accidental or erroneous weigh-in entry | Bearer | Resource Owner | Yes | Standard Writes | Proposed |
| **EP-PROG-004** | Progress | `GET` | `/api/v1/progress/calendar` | Retrieve active workout dates for calendar dots | Bearer | Resource Owner | Yes | General Reads | Proposed |
| **EP-COACH-001** | Coach | `POST` | `/api/v1/coach/chat` | AI Coach conversational chat with 3-tier safety | Bearer | Resource Owner | No | Coach Quota | Proposed |
| **EP-COACH-002** | Coach | `GET` | `/api/v1/coach/history` | Retrieve paginated chat conversation transcript | Bearer | Resource Owner | Yes | General Reads | Proposed |
| **EP-COACH-003** | Coach | `DELETE` | `/api/v1/coach/history` | Clear entire AI Coach conversation history | Bearer | Resource Owner | Yes | Standard Writes | Proposed |
| **EP-SYS-001** | System | `GET` | `/api/v1/health` | Service and infrastructure dependency health | None | Public | Yes | General Reads | Proposed |

---

## 6. Module 1: AuthModule Endpoint Contracts

---

### Endpoint: EP-AUTH-001 — Atomic User Registration
- **Module**: `AuthModule`
- **Method**: `POST`
- **Route**: `/api/v1/auth/register`
- **Purpose**: Atomically creates a user account, credentials identity, initial profile, baseline consent, baseline weigh-in, and initial refresh token in a single MongoDB `ClientSession` transaction ([ADR-006](file:///d:/2026/Personal%20Fitness%20&%20AI%20Coach%20Platform/FitMate-AI/docs/architecture/ARCHITECTURE_DECISION_RECORDS.md#L23), [USERS_SCHEMA.md §6.1](file:///d:/2026/Personal%20Fitness%20&%20AI%20Coach%20Platform/FitMate-AI/docs/architecture/database/USERS_SCHEMA.md#L450-L480)).
- **Authentication**: None (Public unauthenticated gate, `SCR-004`).
- **Authorization**: Public.
- **Rate-limit Category**: `Auth Strict` (5 attempts / 15 minutes per IP).
- **Idempotency**: Non-idempotent. Retrying with identical email returns `409 Conflict` with duplicate-account recovery UX ([MODULE_BOUNDARIES.md §3.1](file:///d:/2026/Personal%20Fitness%20&%20AI%20Coach%20Platform/FitMate-AI/docs/architecture/MODULE_BOUNDARIES.md#L459-L466)).
- **Side Effects**: Inserts across 6 collections (`users`, `user_identities`, `refresh_tokens`, `user_profiles`, `consent_records`, `body_weight_entries`).
- **Related Workflows**: `UJ-001` (Onboarding & Registration).

#### Request
- **Headers**: `Content-Type: application/json`, `Accept-Language: en` (or `ar`)
- **Body Schema (Zod / JSON Schema)**:
```typescript
{
  email: string;                       // Valid RFC 5322 email, trimmed, lowercase, max 254 chars
  password: string;                    // Min 8, max 128 chars, >=1 uppercase, >=1 digit, >=1 special char
  displayName?: string;                // Optional trimmed string, 1-100 chars
  onboarding: {
    goal: 'fat_loss' | 'muscle_gain' | 'recomposition' | 'maintenance' | 'general_fitness' | 'undecided';
    biologicalSex: 'male' | 'female' | 'prefer_not_to_say';
    birthDate: string;                 // ISO 8601 date string (YYYY-MM-DD), age between 13 and 100
    heightCm: number;                  // 100.0 to 250.0, rounded to 1 decimal place
    weightKg: number;                  // 30.00 to 300.00, rounded to 2 decimal places
    activityMultiplier: 1.2 | 1.375 | 1.55 | 1.725 | 1.9;
    trainingExperience: 'beginner' | 'intermediate' | 'advanced';
    dietaryPreference?: 'none' | 'vegetarian' | 'vegan' | 'pescatarian' | 'halal' | 'keto' | 'custom';
    unitSystem: 'metric' | 'imperial';
    preferredLanguage: 'en' | 'ar';
    hasAcceptedHealthDisclaimer: true; // Must be explicitly true (FR-ONBD-003)
    hasAcceptedTerms: true;            // Must be explicitly true
  }
}
```

#### Success Response
- **HTTP Status**: `201 Created`
- **Response DTO**:
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "6725619b0f9488a4e3df5678",
      "email": "sarah.walker@example.com",
      "displayName": "Sarah",
      "isEmailVerified": false,
      "isOnboardingCompleted": true
    },
    "tokens": {
      "accessToken": "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...",
      "tokenType": "Bearer",
      "expiresIn": 900,
      "refreshToken": "fm_rt_8f1a0e3c847b2c9a1e05d..."
    },
    "profile": {
      "goal": "fat_loss",
      "dailyCalorieTarget": 1850,
      "proteinTargetGrams": 140.0,
      "carbsTargetGrams": 180.0,
      "fatTargetGrams": 62.0,
      "isEstimated": true,
      "unitSystem": "metric",
      "preferredLanguage": "en"
    }
  }
}
```

#### Error Responses
- `400 Bad Request` (`VALIDATION_ERROR`): Payload fails schema constraints (e.g. password too weak, height out of range).
- `409 Conflict` (`EMAIL_ALREADY_EXISTS`): Email already registered. Client renders duplicate-account login redirect modal.
- `429 Too Many Requests` (`RATE_LIMIT_EXCEEDED`): Registration rate limit exceeded.

---

### Endpoint: EP-AUTH-002 — Credentials Login
- **Module**: `AuthModule`
- **Method**: `POST`
- **Route**: `/api/v1/auth/login`
- **Purpose**: Authenticates local email/password users, verifies password hash with Argon2id, and mints fresh session tokens.
- **Authentication**: None.
- **Rate-limit Category**: `Auth Strict` (5 attempts / 15 min per IP).
- **Idempotency**: Non-idempotent.

#### Request
```typescript
{
  email: string;     // Trimmed, lowercase
  password: string;  // Plaintext credentials
}
```

#### Success Response
- **HTTP Status**: `200 OK`
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "6725619b0f9488a4e3df5678",
      "email": "sarah.walker@example.com",
      "displayName": "Sarah",
      "isOnboardingCompleted": true
    },
    "tokens": {
      "accessToken": "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...",
      "tokenType": "Bearer",
      "expiresIn": 900,
      "refreshToken": "fm_rt_99c3a0e1b..."
    }
  }
}
```

#### Error Responses
- `401 Unauthorized` (`INVALID_CREDENTIALS`): Constant-time check fails. Generic message returned.
- `403 Forbidden` (`ACCOUNT_PENDING_DELETION` | `ACCOUNT_SUSPENDED`): Account locked.

---

### Endpoint: EP-AUTH-003 — Third-Party OAuth Authentication (Google)
- **Module**: `AuthModule`
- **Method**: `POST`
- **Route**: `/api/v1/auth/oauth`
- **Purpose**: Validates Google ID token cryptographically. If new user, creates user and skeletal profile (`isOnboardingCompleted: false`) ([USERS_SCHEMA.md §6.2](file:///d:/2026/Personal%20Fitness%20&%20AI%20Coach%20Platform/FitMate-AI/docs/architecture/database/USERS_SCHEMA.md#L482-L515)).
- **Authentication**: None.
- **Rate-limit Category**: `Auth Strict`.

#### Request
```typescript
{
  provider: 'google';
  idToken: string;                 // Google OAuth2 ID Token from client SDK
  preferredLanguage?: 'en' | 'ar';
}
```

#### Success Response
- **HTTP Status**: `200 OK` (Existing User) | `201 Created` (New User)
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "6725619b0f9488a4e3df5678",
      "email": "user@gmail.com",
      "displayName": "Ahmed",
      "isEmailVerified": true,
      "isOnboardingCompleted": false
    },
    "tokens": {
      "accessToken": "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...",
      "tokenType": "Bearer",
      "expiresIn": 900,
      "refreshToken": "fm_rt_google_77a..."
    }
  }
}
```

#### Error Responses
- `401 Unauthorized` (`INVALID_OAUTH_TOKEN`): Google signature, audience, or issuer verification failed.

---

### Endpoint: EP-AUTH-004 — Silent Token Refresh & Rotation
- **Module**: `AuthModule`
- **Method**: `POST`
- **Route**: `/api/v1/auth/refresh`
- **Purpose**: Exchanges a valid refresh token for a fresh 15-minute access JWT and rotated refresh token ([DB-036](file:///d:/2026/Personal%20Fitness%20&%20AI%20Coach%20Platform/FitMate-AI/docs/architecture/database/DATABASE_ISSUES.md#L88), [DB-037](file:///d:/2026/Personal%20Fitness%20&%20AI%20Coach%20Platform/FitMate-AI/docs/architecture/database/DATABASE_ISSUES.md#L89)).
- **Authentication**: Valid unrevoked refresh token.
- **Rate-limit Category**: `Silent Refresh` (30 req / 1 min).
- **Idempotency**: Idempotent within 30-second grace period via AES-256-GCM encrypted successor recovery.

#### Request
```typescript
{
  refreshToken: string; // The active refresh token string
}
```

#### Success Response
- **HTTP Status**: `200 OK`
```json
{
  "success": true,
  "data": {
    "accessToken": "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...",
    "tokenType": "Bearer",
    "expiresIn": 900,
    "refreshToken": "fm_rt_rotated_55b1..."
  }
}
```

#### Error Responses
- `401 Unauthorized` (`TOKEN_EXPIRED` | `TOKEN_REVOKED` | `TOKEN_REUSE_DETECTED`): Token invalid. Client immediately flushes storage and routes to Login (`SCR-002`).

---

### Endpoint: EP-AUTH-005 — Session Revocation (Logout)
- **Module**: `AuthModule`
- **Method**: `POST`
- **Route**: `/api/v1/auth/logout`
- **Purpose**: Revokes the active refresh token and invalidates current device session.
- **Authentication**: Bearer JWT.

#### Request
```typescript
{
  refreshToken: string; // Token to be explicitly revoked
}
```

#### Success Response
- **HTTP Status**: `200 OK`
```json
{
  "success": true,
  "data": {
    "message": "Session successfully terminated."
  }
}
```

---

### Endpoint: EP-AUTH-006 — Password Reset Request
- **Module**: `AuthModule`
- **Method**: `POST`
- **Route**: `/api/v1/auth/forgot-password`
- **Purpose**: Issues a single-use 1-hour cryptographic password reset token and dispatches email. Anti-enumeration: returns identical success message whether email exists or not.
- **Authentication**: None.
- **Rate-limit Category**: `Password Reset` (3 req / 1 hour per IP/Email).

#### Request
```typescript
{
  email: string;
}
```

#### Success Response
- **HTTP Status**: `200 OK`
```json
{
  "success": true,
  "data": {
    "message": "If an account matches this email, reset instructions have been dispatched."
  }
}
```

---

### Endpoint: EP-AUTH-007 — Password Reset Consumption
- **Module**: `AuthModule`
- **Method**: `POST`
- **Route**: `/api/v1/auth/reset-password`
- **Purpose**: Atomically consumes a valid password reset token, updates password hash, increments `tokenVersion`, and revokes all active sessions ([DB-039](file:///d:/2026/Personal%20Fitness%20&%20AI%20Coach%20Platform/FitMate-AI/docs/architecture/database/DATABASE_ISSUES.md#L91)).
- **Authentication**: None.

#### Request
```typescript
{
  token: string;       // 64-char hex reset token
  newPassword: string; // Complexity-checked password
}
```

#### Success Response
- **HTTP Status**: `200 OK`
```json
{
  "success": true,
  "data": {
    "message": "Password updated successfully. Please log in with your new credentials."
  }
}
```

#### Error Responses
- `400 Bad Request` (`INVALID_RESET_TOKEN` | `RESET_TOKEN_EXPIRED` | `RESET_TOKEN_CONSUMED`).

---

### Endpoint: EP-AUTH-008 — Authenticated Password Change
- **Module**: `AuthModule`
- **Method**: `POST`
- **Route**: `/api/v1/auth/change-password`
- **Purpose**: Allows logged-in users to update their password. Requires current password verification, updates hash, increments `tokenVersion`, and revokes other sessions.
- **Authentication**: Bearer JWT.

#### Request
```typescript
{
  currentPassword: string;
  newPassword: string;
}
```

#### Success Response
- **HTTP Status**: `200 OK`
```json
{
  "success": true,
  "data": {
    "message": "Password changed successfully. All other active sessions have been terminated."
  }
}
```

---

### Endpoint: EP-AUTH-009 — Current User Identity
- **Module**: `AuthModule`
- **Method**: `GET`
- **Route**: `/api/v1/auth/me`
- **Purpose**: Verifies token validity and returns active identity state.
- **Authentication**: Bearer JWT.

#### Success Response
- **HTTP Status**: `200 OK`
```json
{
  "success": true,
  "data": {
    "id": "6725619b0f9488a4e3df5678",
    "email": "sarah.walker@example.com",
    "isEmailVerified": true,
    "provider": "local",
    "tokenVersion": 1,
    "status": "active"
  }
}
```

---

## 7. Module 2: UsersModule Endpoint Contracts

---

### Endpoint: EP-USER-001 — Retrieve User Profile & Targets
- **Module**: `UsersModule`
- **Method**: `GET`
- **Route**: `/api/v1/users/profile`
- **Purpose**: Retrieves physical traits, goals, active calorie/macro targets, units, and operational weight snapshot (`SCR-021`).
- **Authentication**: Bearer JWT.
- **Authorization**: Resource Owner (`req.user.id`).

#### Success Response
- **HTTP Status**: `200 OK`
```json
{
  "success": true,
  "data": {
    "userId": "6725619b0f9488a4e3df5678",
    "displayName": "Sarah",
    "goal": "fat_loss",
    "biologicalSex": "female",
    "birthDate": "1996-05-14",
    "heightCm": 168.0,
    "weightKg": 64.50,
    "weightRecordedAt": "2026-11-01T08:30:00.000Z",
    "activityMultiplier": 1.375,
    "trainingExperience": "intermediate",
    "dietaryPreference": "none",
    "unitSystem": "metric",
    "preferredLanguage": "en",
    "isOnboardingCompleted": true,
    "nutritionTargets": {
      "dailyCalorieTarget": 1720,
      "proteinTargetGrams": 130.0,
      "carbsTargetGrams": 170.0,
      "fatTargetGrams": 58.0,
      "isTargetsCustomized": false,
      "isEstimated": true,
      "targetsCalculatedAt": "2026-11-01T08:30:00.000Z"
    }
  }
}
```

---

### Endpoint: EP-USER-002 — Update Profile Traits & Goals
- **Module**: `UsersModule`
- **Method**: `PATCH`
- **Route**: `/api/v1/users/profile`
- **Purpose**: Updates anthropometrics, goal, activity level, or manual custom targets. Re-runs pure Mifflin-St Jeor calculation while respecting custom target protections ([USERS_SCHEMA.md §2.5](file:///d:/2026/Personal%20Fitness%20&%20AI%20Coach%20Platform/FitMate-AI/docs/architecture/database/USERS_SCHEMA.md#L140-L160)).
- **Authentication**: Bearer JWT.
- **Side Effects**: If `weightKg` is updated, synchronously appends an authoritative weigh-in to `body_weight_entries` via `ProgressModule`.

#### Request Body
```typescript
{
  displayName?: string;
  goal?: 'fat_loss' | 'muscle_gain' | 'recomposition' | 'maintenance' | 'general_fitness' | 'undecided';
  heightCm?: number;
  weightKg?: number;
  activityMultiplier?: 1.2 | 1.375 | 1.55 | 1.725 | 1.9;
  trainingExperience?: 'beginner' | 'intermediate' | 'advanced';
  dietaryPreference?: 'none' | 'vegetarian' | 'vegan' | 'pescatarian' | 'halal' | 'keto' | 'custom';
  customTargets?: {
    dailyCalorieTarget: number;   // 500 to 10000
    proteinTargetGrams: number;
    carbsTargetGrams: number;
    fatTargetGrams: number;
  };
  applyRecalculatedTargets?: boolean; // If true, clears custom targets and applies recalculated formula
}
```

#### Success Response
- **HTTP Status**: `200 OK`
```json
{
  "success": true,
  "data": {
    "userId": "6725619b0f9488a4e3df5678",
    "heightCm": 168.0,
    "weightKg": 63.80,
    "nutritionTargets": {
      "dailyCalorieTarget": 1705,
      "proteinTargetGrams": 128.0,
      "carbsTargetGrams": 170.0,
      "fatTargetGrams": 57.0,
      "isTargetsCustomized": false,
      "isEstimated": true,
      "targetsCalculatedAt": "2026-11-02T10:00:00.000Z"
    }
  }
}
```

---

### Endpoint: EP-USER-003 — Complete Google OAuth Onboarding
- **Module**: `UsersModule`
- **Method**: `POST`
- **Route**: `/api/v1/users/onboarding/complete`
- **Purpose**: Finalizes questionnaire inputs for a Google OAuth user with an incomplete profile (`isOnboardingCompleted: false`), sets targets, logs baseline weight in `ProgressModule`, records health disclaimer, and unlocks dashboard access.
- **Authentication**: Bearer JWT.

#### Request Body
```typescript
{
  goal: 'fat_loss' | 'muscle_gain' | 'recomposition' | 'maintenance' | 'general_fitness' | 'undecided';
  biologicalSex: 'male' | 'female' | 'prefer_not_to_say';
  birthDate: string;                  // YYYY-MM-DD
  heightCm: number;
  weightKg: number;
  activityMultiplier: 1.2 | 1.375 | 1.55 | 1.725 | 1.9;
  trainingExperience: 'beginner' | 'intermediate' | 'advanced';
  hasAcceptedHealthDisclaimer: true;  // Mandatory explicit agreement
}
```

#### Success Response
- **HTTP Status**: `200 OK`
```json
{
  "success": true,
  "data": {
    "isOnboardingCompleted": true,
    "dailyCalorieTarget": 1950,
    "isEstimated": true
  }
}
```

---

### Endpoint: EP-USER-004 — Update Preferences (Language & Units)
- **Module**: `UsersModule`
- **Method**: `PATCH`
- **Route**: `/api/v1/users/preferences`
- **Purpose**: Toggles unit system (`metric` | `imperial`) or language (`en` | `ar`) (`SCR-022`).
- **Authentication**: Bearer JWT.

#### Request Body
```typescript
{
  unitSystem?: 'metric' | 'imperial';
  preferredLanguage?: 'en' | 'ar';
}
```

#### Success Response
- **HTTP Status**: `200 OK`
```json
{
  "success": true,
  "data": {
    "unitSystem": "imperial",
    "preferredLanguage": "ar"
  }
}
```

---

### Endpoint: EP-USER-005 — Initiate Account Deletion Saga
- **Module**: `UsersModule`
- **Method**: `DELETE`
- **Route**: `/api/v1/users/account`
- **Purpose**: Initiates permanent account deletion saga. Enforces reliable initiation protocol: persists operational saga job in `deletion_saga_jobs`, locks account, revokes sessions, and triggers asynchronous cross-module purge ([USERS_SCHEMA.md §6.5](file:///d:/2026/Personal%20Fitness%20&%20AI%20Coach%20Platform/FitMate-AI/docs/architecture/database/USERS_SCHEMA.md#L530-L570)).
- **Authentication**: Bearer JWT.
- **Headers**: `X-Idempotency-Key: <uuid>`

#### Request Body
```typescript
{
  currentPassword?: string; // Required for local email/password accounts
}
```

#### Success Response
- **HTTP Status**: `202 Accepted`
```json
{
  "success": true,
  "data": {
    "sagaId": "c8b4a2e1-4567-4e89-b123-abcdef012345",
    "status": "pending_deletion",
    "message": "Account deletion successfully initiated. All active sessions have been terminated."
  }
}
```

---

### Endpoint: EP-USER-006 — Check Account Deletion Status
- **Module**: `UsersModule`
- **Method**: `GET`
- **Route**: `/api/v1/users/account/deletion-status`
- **Purpose**: Allows client or support tooling to verify deletion progress.
- **Authentication**: Bearer JWT.

#### Success Response
- **HTTP Status**: `200 OK`
```json
{
  "success": true,
  "data": {
    "sagaId": "c8b4a2e1-4567-4e89-b123-abcdef012345",
    "status": "in_progress",
    "completedSteps": ["lock_account", "purge_workouts", "purge_nutrition"],
    "currentStep": "purge_progress"
  }
}
```

---

### Endpoint: EP-USER-007 — List Legal Consents
- **Module**: `UsersModule`
- **Method**: `GET`
- **Route**: `/api/v1/users/consents`
- **Purpose**: Retrieves all active legal agreements and disclaimer acceptances.
- **Authentication**: Bearer JWT.

#### Success Response
- **HTTP Status**: `200 OK`
```json
{
  "success": true,
  "data": [
    {
      "consentType": "health_disclaimer",
      "hasAccepted": true,
      "disclaimerVersion": "1.0.0",
      "recordedAt": "2026-11-01T08:30:00.000Z"
    },
    {
      "consentType": "terms_of_service",
      "hasAccepted": true,
      "disclaimerVersion": "1.0.0",
      "recordedAt": "2026-11-01T08:30:00.000Z"
    }
  ]
}
```

---

### Endpoint: EP-USER-008 — Record Legal Consent Action
- **Module**: `UsersModule`
- **Method**: `POST`
- **Route**: `/api/v1/users/consents`
- **Purpose**: Records affirmative acceptance or withdrawal of legal agreements. Withdrawing terms of service triggers account deletion.
- **Authentication**: Bearer JWT.

#### Request Body
```typescript
{
  consentType: 'health_disclaimer' | 'terms_of_service' | 'privacy_policy';
  action: 'accepted' | 'withdrawn';
  disclaimerVersion: string;
}
```

#### Success Response
- **HTTP Status**: `200 OK`
```json
{
  "success": true,
  "data": {
    "consentType": "health_disclaimer",
    "action": "withdrawn",
    "recordedAt": "2026-11-02T12:00:00.000Z"
  }
}
```

---

## 8. Module 3: NutritionModule Endpoint Contracts

---

### Endpoint: EP-NUTR-001 — Daily Nutrition Diary & Totals
- **Module**: `NutritionModule`
- **Method**: `GET`
- **Route**: `/api/v1/nutrition/diary`
- **Purpose**: Retrieves the 4-slot meal diary (`breakfast`, `lunch`, `dinner`, `snack`), calorie/macro subtotals, active daily targets snapshot, and remaining budget for a specified calendar date (`SCR-009`).
- **Authentication**: Bearer JWT.
- **Query Parameters**:
  - `date`: `YYYY-MM-DD` (Required)
- **Headers**: `X-Timezone-Offset-Minutes: -120`

#### Success Response
- **HTTP Status**: `200 OK`
```json
{
  "success": true,
  "data": {
    "date": "2026-11-02",
    "dailyTargets": {
      "calories": 2000,
      "proteinGrams": 150.0,
      "carbsGrams": 200.0,
      "fatGrams": 65.0,
      "isEstimated": true
    },
    "consumedTotals": {
      "calories": 1450,
      "proteinGrams": 115.5,
      "carbsGrams": 140.0,
      "fatGrams": 42.0,
      "isEstimated": true
    },
    "remainingBudget": {
      "calories": 550,
      "proteinGrams": 34.5,
      "carbsGrams": 60.0,
      "fatGrams": 23.0
    },
    "slots": {
      "breakfast": {
        "slotTotalCalories": 450,
        "items": [
          {
            "itemId": "item_01ha",
            "name": "Oatmeal with Honey",
            "portionGrams": 150.0,
            "calories": 280,
            "proteinGrams": 10.0,
            "carbsGrams": 48.0,
            "fatGrams": 5.0,
            "isQuickAdd": false
          }
        ]
      },
      "lunch": { "slotTotalCalories": 600, "items": [] },
      "dinner": { "slotTotalCalories": 400, "items": [] },
      "snack": { "slotTotalCalories": 0, "items": [] }
    }
  }
}
```

---

### Endpoint: EP-NUTR-002 — Quick-Add Manual Meal Entry
- **Module**: `NutritionModule`
- **Method**: `POST`
- **Route**: `/api/v1/nutrition/meals/quick-add`
- **Purpose**: Logs an uncatalogued manual calorie and macro entry directly into a meal slot (`SCR-012`).
- **Authentication**: Bearer JWT.

#### Request Body
```typescript
{
  date: string;                       // YYYY-MM-DD
  slot: 'breakfast' | 'lunch' | 'dinner' | 'snack';
  name?: string;                      // Optional label, defaults to "Quick Add"
  calories: number;                   // >= 0, integer
  proteinGrams?: number;              // >= 0, float, 1 decimal
  carbsGrams?: number;                // >= 0, float, 1 decimal
  fatGrams?: number;                  // >= 0, float, 1 decimal
}
```

#### Success Response
- **HTTP Status**: `201 Created`
```json
{
  "success": true,
  "data": {
    "logId": "6725619b0f9488a4e3df7788",
    "itemId": "item_quick_99f",
    "slot": "lunch",
    "name": "Homemade Chicken Sandwich",
    "calories": 520,
    "proteinGrams": 38.0,
    "carbsGrams": 45.0,
    "fatGrams": 14.0,
    "isEstimated": true
  }
}
```

---

### Endpoint: EP-NUTR-003 — Log Food Item from Catalog
- **Module**: `NutritionModule`
- **Method**: `POST`
- **Route**: `/api/v1/nutrition/meals/item`
- **Purpose**: Logs a curated food item scaled dynamically by portion grams (`SCR-011`).
- **Authentication**: Bearer JWT.

#### Request Body
```typescript
{
  date: string;                       // YYYY-MM-DD
  slot: 'breakfast' | 'lunch' | 'dinner' | 'snack';
  foodId: string;                     // ID from food_library
  servingSizeGrams: number;           // e.g. 150.0
}
```

#### Success Response
- **HTTP Status**: `201 Created`
```json
{
  "success": true,
  "data": {
    "logId": "6725619b0f9488a4e3df7788",
    "itemId": "item_cat_44a",
    "nameEn": "Grilled Chicken Breast",
    "nameAr": "صدور دجاج مشوية",
    "servingSizeGrams": 150.0,
    "calories": 247,
    "proteinGrams": 46.5,
    "carbsGrams": 0.0,
    "fatGrams": 5.4,
    "isEstimated": true
  }
}
```

---

### Endpoint: EP-NUTR-004 — Remove Logged Meal Item
- **Module**: `NutritionModule`
- **Method**: `DELETE`
- **Route**: `/api/v1/nutrition/meals/:logId/items/:itemId`
- **Purpose**: Removes a specific logged item from a daily meal log.
- **Authentication**: Bearer JWT.

#### Success Response
- **HTTP Status**: `200 OK`
```json
{
  "success": true,
  "data": {
    "message": "Meal item removed successfully."
  }
}
```

---

### Endpoint: EP-NUTR-005 — Search Curated Food Catalog
- **Module**: `NutritionModule`
- **Method**: `GET`
- **Route**: `/api/v1/nutrition/foods/search`
- **Purpose**: Substring and keyword search across Egyptian regional and international staples (`SCR-010`).
- **Authentication**: Bearer JWT.
- **Query Parameters**:
  - `q`: string (Search query, min 2 chars, e.g. "foul" or "فول")
  - `category`: string (optional, e.g. "poultry", "legumes", "dairy")
  - `page`: integer (default: 1)
  - `limit`: integer (default: 20, max: 50)

#### Success Response
- **HTTP Status**: `200 OK`
```json
{
  "success": true,
  "data": [
    {
      "id": "food_foul_01",
      "nameEn": "Foul Mudammas (Plain)",
      "nameAr": "فول مدمس سادة",
      "category": "legumes",
      "baseServingGrams": 100.0,
      "caloriesPer100g": 110,
      "proteinPer100g": 7.5,
      "carbsPer100g": 18.0,
      "fatPer100g": 0.8,
      "isEstimated": true
    }
  ],
  "meta": {
    "pagination": { "page": 1, "limit": 20, "totalItems": 1, "totalPages": 1, "hasNextPage": false, "hasPrevPage": false }
  }
}
```

---

### Endpoint: EP-NUTR-006 — Get Food Item Details
- **Module**: `NutritionModule`
- **Method**: `GET`
- **Route**: `/api/v1/nutrition/foods/:id`
- **Purpose**: Retrieves full macronutrient breakdown and standard portion units for a catalog item.
- **Authentication**: Bearer JWT.

#### Success Response
- **HTTP Status**: `200 OK`
```json
{
  "success": true,
  "data": {
    "id": "food_koshari_01",
    "nameEn": "Egyptian Koshari",
    "nameAr": "كشري مصري",
    "caloriesPer100g": 165,
    "proteinPer100g": 5.2,
    "carbsPer100g": 31.0,
    "fatPer100g": 2.5,
    "standardPortions": [
      { "unitNameEn": "Small Plate", "unitNameAr": "طبق صغير", "grams": 250.0 },
      { "unitNameEn": "Medium Plate", "unitNameAr": "طبق وسط", "grams": 400.0 }
    ],
    "isEstimated": true
  }
}
```

---

## 9. Module 4: WorkoutsModule Endpoint Contracts

---

### Endpoint: EP-WORK-001 — Browse Exercise Catalog
- **Module**: `WorkoutsModule`
- **Method**: `GET`
- **Route**: `/api/v1/workouts/exercises`
- **Purpose**: Browses and filters the curated ~100 exercise library by muscle group, equipment, and movement pattern (`SCR-015`).
- **Authentication**: Bearer JWT.
- **Query Parameters**:
  - `muscle`: string (optional: `chest`, `back`, `legs`, `shoulders`, `arms`, `core`)
  - `equipment`: string (optional: `barbell`, `dumbbell`, `machine`, `cable`, `bodyweight`)
  - `page`: integer (default: 1)
  - `limit`: integer (default: 20, max: 100)

#### Success Response
- **HTTP Status**: `200 OK`
```json
{
  "success": true,
  "data": [
    {
      "id": "ex_bench_press",
      "nameEn": "Barbell Bench Press",
      "nameAr": "بنش برس بالبار",
      "targetMuscleGroup": "chest",
      "secondaryMuscles": ["triceps", "front_delts"],
      "equipment": "barbell",
      "movementPattern": "horizontal_push"
    }
  ],
  "meta": {
    "pagination": { "page": 1, "limit": 20, "totalItems": 105, "totalPages": 6, "hasNextPage": true, "hasPrevPage": false }
  }
}
```

---

### Endpoint: EP-WORK-002 — Get Exercise Details & Cues
- **Module**: `WorkoutsModule`
- **Method**: `GET`
- **Route**: `/api/v1/workouts/exercises/:id`
- **Purpose**: Retrieves step-by-step bilingual execution instructions and anatomical cues (`SCR-016`).
- **Authentication**: Bearer JWT.

#### Success Response
- **HTTP Status**: `200 OK`
```json
{
  "success": true,
  "data": {
    "id": "ex_bench_press",
    "nameEn": "Barbell Bench Press",
    "nameAr": "بنش برس بالبار",
    "instructionsEn": "Lie on bench, retract scapula, grip bar slightly wider than shoulder width...",
    "instructionsAr": "استلق على المقعد، ضم لوحي الكتف للخلف، امسك البار بقبضة أعرض قليلاً من الكتفين..."
  }
}
```

---

### Endpoint: EP-WORK-003 — Save Completed Workout Session
- **Module**: `WorkoutsModule`
- **Method**: `POST`
- **Route**: `/api/v1/workouts/sessions`
- **Purpose**: Commits a completed workout session with exercise logs, set-by-set checkmarks, and volume calculations (`SCR-017`, `SCR-019`).
- **Authentication**: Bearer JWT.
- **Headers**: `X-Idempotency-Key: <client-uuid>`

#### Request Body
```typescript
{
  clientSessionUuid: string;           // UUIDv4 generated on mobile client
  name: string;                        // e.g. "Push Day A"
  startedAt: string;                   // ISO 8601 UTC
  completedAt: string;                 // ISO 8601 UTC
  durationSeconds: number;
  exercises: Array<{
    exerciseId: string;
    exerciseName: string;
    sets: Array<{
      setNumber: number;
      weightKg: number;
      reps: number;
      isCompleted: boolean;
      rpe?: number;
    }>;
  }>;
}
```

#### Success Response
- **HTTP Status**: `201 Created`
```json
{
  "success": true,
  "data": {
    "id": "6725619b0f9488a4e3df8899",
    "clientSessionUuid": "9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d",
    "name": "Push Day A",
    "durationSeconds": 3420,
    "totalVolumeKg": 6450.0,
    "totalSetsCompleted": 12,
    "completedAt": "2026-11-02T11:30:00.000Z"
  }
}
```

---

### Endpoint: EP-WORK-004 — Get Workout Session Details
- **Module**: `WorkoutsModule`
- **Method**: `GET`
- **Route**: `/api/v1/workouts/sessions/:id`
- **Purpose**: Retrieves full historical workout session logs for review modals (`SCR-020`).
- **Authentication**: Bearer JWT.

#### Success Response
- **HTTP Status**: `200 OK`
```json
{
  "success": true,
  "data": {
    "id": "6725619b0f9488a4e3df8899",
    "name": "Push Day A",
    "totalVolumeKg": 6450.0,
    "exercises": [
      {
        "exerciseName": "Barbell Bench Press",
        "sets": [
          { "setNumber": 1, "weightKg": 80.0, "reps": 8, "isCompleted": true }
        ]
      }
    ]
  }
}
```

---

### Endpoint: EP-WORK-005 — Idempotent Batch Offline Workout Sync
- **Module**: `WorkoutsModule`
- **Method**: `POST`
- **Route**: `/api/v1/workouts/sync`
- **Purpose**: Idempotently commits an array of offline workout sessions with duplicate detection via `processed_idempotency_keys` ([DB-024](file:///d:/2026/Personal%20Fitness%20&%20AI%20Coach%20Platform/FitMate-AI/docs/architecture/database/DATABASE_ISSUES.md#L76)).
- **Authentication**: Bearer JWT.

#### Request Body
```typescript
{
  sessions: Array<SaveWorkoutSessionDto>; // Array of session payloads
}
```

#### Success Response
- **HTTP Status**: `200 OK`
```json
{
  "success": true,
  "data": {
    "syncedSessions": 2,
    "duplicateSessionsIgnored": 0
  }
}
```

---

## 10. Module 5: ProgressModule Endpoint Contracts

---

### Endpoint: EP-PROG-001 — Retrieve Weight History & Trends
- **Module**: `ProgressModule`
- **Method**: `GET`
- **Route**: `/api/v1/progress/weight`
- **Purpose**: Retrieves authoritative weigh-in records and smoothed 7-day moving averages with honest empty gaps for unmeasured days (`SCR-020`).
- **Authentication**: Bearer JWT.
- **Query Parameters**:
  - `startDate`: `YYYY-MM-DD` (Required)
  - `endDate`: `YYYY-MM-DD` (Required)

#### Success Response
- **HTTP Status**: `200 OK`
```json
{
  "success": true,
  "data": {
    "measurements": [
      { "id": "w_entry_01", "date": "2026-10-26", "weightKg": 75.50, "movingAverageKg": null },
      { "id": "w_entry_02", "date": "2026-10-27", "weightKg": 75.30, "movingAverageKg": null },
      { "id": "w_entry_03", "date": "2026-10-28", "weightKg": 75.10, "movingAverageKg": 75.30 }
    ],
    "summary": {
      "startWeightKg": 75.50,
      "latestWeightKg": 75.10,
      "netChangeKg": -0.40
    }
  }
}
```

---

### Endpoint: EP-PROG-002 — Log Body Weight Measurement
- **Module**: `ProgressModule`
- **Method**: `POST`
- **Route**: `/api/v1/progress/weight`
- **Purpose**: Appends an entry to the authoritative `body_weight_entries` ledger and emits `weight.recorded` domain event to update the cached profile snapshot ([ADR-013](file:///d:/2026/Personal%20Fitness%20&%20AI%20Coach%20Platform/FitMate-AI/docs/architecture/ARCHITECTURE_DECISION_RECORDS.md#L559-L605)).
- **Authentication**: Bearer JWT.

#### Request Body
```typescript
{
  date: string;       // YYYY-MM-DD
  weightKg: number;   // 30.00 to 300.00, float, 2 decimals
  note?: string;      // Max 200 chars
}
```

#### Success Response
- **HTTP Status**: `201 Created`
```json
{
  "success": true,
  "data": {
    "id": "6725619b0f9488a4e3df9901",
    "date": "2026-11-02",
    "weightKg": 74.80,
    "createdAt": "2026-11-02T07:15:00.000Z"
  }
}
```

---

### Endpoint: EP-PROG-003 — Delete Weigh-In Entry
- **Module**: `ProgressModule`
- **Method**: `DELETE`
- **Route**: `/api/v1/progress/weight/:id`
- **Purpose**: Removes an accidental or erroneous weigh-in entry. Triggers profile snapshot recalculation if latest entry was removed.
- **Authentication**: Bearer JWT.

#### Success Response
- **HTTP Status**: `200 OK`
```json
{
  "success": true,
  "data": {
    "message": "Weigh-in entry deleted successfully."
  }
}
```

---

### Endpoint: EP-PROG-004 — Workout History Calendar Markers
- **Module**: `ProgressModule`
- **Method**: `GET`
- **Route**: `/api/v1/progress/calendar`
- **Purpose**: Retrieves days in a month containing completed workouts for calendar marker dots (`SCR-020`).
- **Authentication**: Bearer JWT.
- **Query Parameters**:
  - `month`: integer (`1` to `12`)
  - `year`: integer (e.g. `2026`)

#### Success Response
- **HTTP Status**: `200 OK`
```json
{
  "success": true,
  "data": {
    "month": 11,
    "year": 2026,
    "activeWorkoutDates": ["2026-11-01", "2026-11-02", "2026-11-04"]
  }
}
```

---

## 11. Module 6: CoachModule Endpoint Contracts

---

### Endpoint: EP-COACH-001 — AI Coach Conversational Chat
- **Module**: `CoachModule`
- **Method**: `POST`
- **Route**: `/api/v1/coach/chat`
- **Purpose**: Dispatches user chat messages through three-tier safety guardrails (regex clinical filter $\rightarrow$ system prompt role boundary $\rightarrow$ post-generation safety scan), buffering assistant output before transmission (`SCR-023`).
- **Authentication**: Bearer JWT.
- **Rate-limit Category**: `AI Coach Chat` (20 msgs / hour per user, `FR-COACH-004`, `DB-030`).
- **Invariants**: Strict medical diagnosis and extreme crash diet refusal ([Core Invariant 1](file:///d:/2026/Personal%20Fitness%20&%20AI%20Coach%20Platform/FitMate-AI/.agents/AGENTS.md#L20-L24)). Zero write access to user profile or workout plans (`FR-COACH-005`).

#### Request Body
```typescript
{
  message: string; // Max 1000 characters, trimmed
}
```

#### Success Response (Normal Advice)
- **HTTP Status**: `200 OK`
```json
{
  "success": true,
  "data": {
    "reply": "Since your goal is fat loss, focus on maintaining your protein intake around 130g and aim for progressive overload on your bench press today.",
    "isRefusal": false,
    "disclaimer": "The AI Coach provides informational wellness suggestions only and is not a medical professional."
  }
}
```

#### Success Response (Safety Refusal Interception)
- **HTTP Status**: `200 OK`
```json
{
  "success": true,
  "data": {
    "reply": "I cannot diagnose injuries or recommend medication for your shoulder pain. Please consult a qualified medical professional or physiotherapist for an evaluation.",
    "isRefusal": true,
    "disclaimer": "Standard Medical Disclaimer: FitMate AI is strictly a fitness companion and never provides clinical diagnosis."
  }
}
```

#### Error Responses
- `429 Too Many Requests` (`COACH_RATE_LIMIT_EXCEEDED`): Hourly quota of 20 messages exhausted. Returns `Retry-After: 1800`.
- `503 Service Unavailable` (`AI_PROVIDER_UNAVAILABLE`): External LLM gateway timeout or failure. Returns safe fallback advice.

---

### Endpoint: EP-COACH-002 — Get Conversation History
- **Module**: `CoachModule`
- **Method**: `GET`
- **Route**: `/api/v1/coach/history`
- **Purpose**: Fetches paginated chat message history.
- **Authentication**: Bearer JWT.
- **Query Parameters**:
  - `limit`: integer (default: 50, max: 100)
  - `before`: string (optional cursor timestamp)

#### Success Response
- **HTTP Status**: `200 OK`
```json
{
  "success": true,
  "data": [
    {
      "id": "msg_01",
      "sender": "user",
      "content": "Can I replace bench press with dumbbell press?",
      "createdAt": "2026-11-02T10:14:00.000Z"
    },
    {
      "id": "msg_02",
      "sender": "assistant",
      "content": "Yes! Dumbbell presses are a great substitute that allow a freer range of motion.",
      "isRefusal": false,
      "createdAt": "2026-11-02T10:14:02.000Z"
    }
  ]
}
```

---

### Endpoint: EP-COACH-003 — Clear Conversation History
- **Module**: `CoachModule`
- **Method**: `DELETE`
- **Route**: `/api/v1/coach/history`
- **Purpose**: Clears all previous chat transcript messages for the user.
- **Authentication**: Bearer JWT.

#### Success Response
- **HTTP Status**: `200 OK`
```json
{
  "success": true,
  "data": {
    "message": "Chat conversation history cleared successfully."
  }
}
```

---

## 12. Module 7: System & Operational Endpoints

---

### Endpoint: EP-SYS-001 — Service Health & Readiness
- **Module**: `System`
- **Method**: `GET`
- **Route**: `/api/v1/health`
- **Purpose**: Liveness and readiness inspection probe for load balancers and orchestrators. Checks MongoDB replica set and Redis availability.
- **Authentication**: None (Public).

#### Success Response
- **HTTP Status**: `200 OK` (Healthy) | `503 Service Unavailable` (Degraded)
```json
{
  "success": true,
  "data": {
    "status": "healthy",
    "timestamp": "2026-11-02T01:45:00.000Z",
    "version": "1.0.0",
    "services": {
      "database": "connected",
      "cache": "connected"
    }
  }
}
```

---

## 13. Cross-Module Workflows & Transaction Boundaries

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                   CROSS-MODULE INTERACTION FLOW MATRIX                      │
├──────────────────────────┬───────────────────┬──────────────────────────────┤
│ Workflow Initiator       │ Collaborating     │ Contract Type & Boundary     │
│ Endpoint                 │ Modules           │                              │
├──────────────────────────┼───────────────────┼──────────────────────────────┤
│ EP-AUTH-001 (Register)   │ Auth, Users,      │ Synchronous ACID Transaction │
│                          │ Progress          │ passing ClientSession        │
├──────────────────────────┼───────────────────┼──────────────────────────────┤
│ EP-USER-002 (Profile)    │ Users, Nutrition  │ Pure in-process calculation  │
│                          │                   │ (calculateEnergyTargets)     │
├──────────────────────────┼───────────────────┼──────────────────────────────┤
│ EP-USER-002 (Weight Edit)│ Users, Progress   │ Synchronous command          │
│                          │                   │ (logWeight -> body_weight)   │
├──────────────────────────┼───────────────────┼──────────────────────────────┤
│ EP-PROG-002 (Weight Log) │ Progress, Users   │ In-process decoupled domain  │
│                          │                   │ event (weight.recorded)      │
├──────────────────────────┼───────────────────┼──────────────────────────────┤
│ EP-USER-005 (Account Del)│ Users, All Domain │ Orchestrated Multi-Stage     │
│                          │ Modules           │ Saga (deletion_saga_jobs)    │
├──────────────────────────┼───────────────────┼──────────────────────────────┤
│ EP-COACH-001 (Coach Chat)│ Coach, Users,     │ Synchronous read-only        │
│                          │ Nutrition, Workout│ context assembly snapshots   │
└──────────────────────────┴───────────────────┴──────────────────────────────┘
```

---

## 14. Standard Error Codes Catalog

| HTTP Status | Stable Machine-Readable Code | Safe English Message | Safe Arabic Message | Trigger Condition |
| :--- | :--- | :--- | :--- | :--- |
| `400` | `VALIDATION_ERROR` | Invalid input payload. | المدخلات غير صحيحة. | Zod schema validation fails. |
| `400` | `INVALID_ID_FORMAT` | Resource identifier format is invalid. | صيغة المعرف غير صالحة. | Malformed MongoDB ObjectId string. |
| `401` | `INVALID_CREDENTIALS` | Invalid email or password. | البريد الإلكتروني أو كلمة المرور غير صحيحة. | Failed login authentication check. |
| `401` | `TOKEN_EXPIRED` | Access token has expired. | انتهت صلاحية رمز الدخول. | JWT `exp` timestamp in past. |
| `401` | `TOKEN_REVOKED` | Session has been terminated. | تم إنهاء الجلسة. | TokenVersion mismatch or refresh revoked. |
| `401` | `UNAUTHORIZED` | Authentication required. | يتطلب تسجيل الدخول للمتابعة. | Missing Bearer token. |
| `403` | `FORBIDDEN` | Access denied. | ليس لديك صلاحية للوصول. | Account suspended or unauthorized role. |
| `403` | `ONBOARDING_INCOMPLETE` | Profile onboarding must be completed. | يجب إكمال بيانات الملف الشخصي أولاً. | Google OAuth user accessing gated feature. |
| `404` | `NOT_FOUND` | Requested resource was not found. | العنصر المطلوب غير موجود. | Resource missing or belongs to another user. |
| `409` | `EMAIL_ALREADY_EXISTS` | An account with this email already exists. | يوجد حساب مسجل بهذا البريد الإلكتروني بالفعل. | Duplicate registration attempt. |
| `409` | `CONFLICT` | Resource state conflict. | تعارض في حالة العنصر. | State transition conflict. |
| `422` | `UNPROCESSABLE_ENTITY` | Business rule invariant violation. | لا يمكن إتمام العملية لمخالفة قواعد النظام. | Violating minimum caloric safety floors. |
| `429` | `RATE_LIMIT_EXCEEDED` | Too many requests. Please slow down. | تم تجاوز الحد المسموح من الطلبات. يرجى الانتظار. | Exceeding rate limiting threshold. |
| `429` | `COACH_RATE_LIMIT_EXCEEDED`| Hourly AI Coach message quota exhausted. | تم استنفاد الحد المتاح لرسائل المدرب الذكي هذه الساعة. | Exceeding 20 messages/hour quota. |
| `500` | `INTERNAL_SERVER_ERROR` | An unexpected error occurred. | حدث خطأ غير متوقع. يرجى المحاولة لاحقاً. | Unhandled backend server exception. |
| `503` | `SERVICE_UNAVAILABLE` | Service temporarily unavailable. | الخدمة غير متاحة حالياً. يرجى المحاولة لاحقاً. | Database down or external LLM failure. |

---

## 15. API Contracts Testing Matrix & Verification Readiness

Every endpoint specified must satisfy 10 mandatory contract testing suites prior to release:

1. **Happy Path Acceptance**: Valid payload returns expected 200/201/204 status and DTO structure.
2. **Schema & Boundary Validation**: Submitting out-of-range numbers, malformed emails, or unallowed fields triggers `400 VALIDATION_ERROR`.
3. **Unauthenticated Access**: Missing or malformed `Authorization` header triggers `401 UNAUTHORIZED`.
4. **BOLA / IDOR Verification**: Attempting to query, update, or delete a resource owned by another user returns `404 NOT_FOUND`.
5. **Token Revocation & Expiration**: Using an expired JWT or an incremented `tokenVersion` triggers `401 TOKEN_EXPIRED` or `401 TOKEN_REVOKED`.
6. **Idempotency Verification**: Repeating identical requests with the same `X-Idempotency-Key` returns cached success without duplicating data.
7. **Rate Limiting Enforcement**: Exceeding request limits triggers `429 RATE_LIMIT_EXCEEDED` and returns valid `Retry-After` headers.
8. **Nutrition Estimation Badge Audit**: Every response containing caloric or macronutrient metrics contains `isEstimated: true`.
9. **Multi-Unit Precision Audit**: Output values verify consistent decimal precision tiers ([DB-016](file:///d:/2026/Personal%20Fitness%20&%20AI%20Coach%20Platform/FitMate-AI/docs/architecture/database/DATABASE_ISSUES.md#L68)) and round-trip conversion invariance.
10. **Asynchronous Deletion Recovery**: Simulating worker termination during account deletion confirms resumption via the background saga sweeper.

---

## 16. Dedicated API Design Issues Register

| Issue ID | Affected Endpoints | Summary of Issue / Edge Case | Impact | Proposed Architectural Resolution | Status |
| :--- | :--- | :--- | :--- | :--- | :---: |
| **API-001** | `EP-AUTH-004` | Refresh Token Rotation Flapping over Lossy Mobile Networks | Concurrent refresh requests cause token revocation false positives. | Ephemeral AES-256-GCM recovery encryption with 30s grace window ([DB-036](file:///d:/2026/Personal%20Fitness%20&%20AI%20Coach%20Platform/FitMate-AI/docs/architecture/database/DATABASE_ISSUES.md#L88)). | **PROPOSED** |
| **API-002** | `EP-NUTR-001` | Midnight Timezone Drift on Food Diaries | User crossing midnight or daylight savings logs food into wrong day. | Client passes canonical `date=YYYY-MM-DD` + `X-Timezone-Offset-Minutes` ([DB-017](file:///d:/2026/Personal%20Fitness%20&%20AI%20Coach%20Platform/FitMate-AI/docs/architecture/database/DATABASE_ISSUES.md#L69)). | **OPEN** |
| **API-003** | `EP-COACH-001` | Atomic Rate Limiting during Concurrent Bursts | High concurrency allows user to exceed 20 msgs/hr quota. | Redis atomic `INCR` with 3600s sliding window expiry ([DB-030](file:///d:/2026/Personal%20Fitness%20&%20AI%20Coach%20Platform/FitMate-AI/docs/architecture/database/DATABASE_ISSUES.md#L82)). | **OPEN** |
| **API-004** | `EP-WORK-003`, `005` | Long-Offline Workout Sync Queue Exceeding Idempotency TTL | Stale offline queues (>24h) risk duplicate logging if key TTL expires. | Idempotency record TTL dynamically constrained: $\text{TTL} \ge \text{MaxOfflineQueueAge}$ ([DB-024](file:///d:/2026/Personal%20Fitness%20&%20AI%20Coach%20Platform/FitMate-AI/docs/architecture/database/DATABASE_ISSUES.md#L76)). | **OPEN** |
| **API-005** | `EP-USER-002` | Silent Overwrite of Custom Calorie/Macro Targets | Updating body weight recalculates formula and wipes custom splits. | Recomputed baseline returned in metadata; custom targets preserved until explicit user confirmation ([DB-019](file:///d:/2026/Personal%20Fitness%20&%20AI%20Coach%20Platform/FitMate-AI/docs/architecture/database/DATABASE_ISSUES.md#L71)). | **RESOLVED** |
| **API-006** | `EP-USER-005` | Orphaned Pending Deletion Accounts on Process Crash | Server crashes between account lockout and saga persistence. | Reliable initiation protocol: persists saga job *before* initiating auth lockout ([USERS_SCHEMA.md §6.5](file:///d:/2026/Personal%20Fitness%20&%20AI%20Coach%20Platform/FitMate-AI/docs/architecture/database/USERS_SCHEMA.md#L530-L570)). | **PROPOSED** |
| **API-007** | `EP-AUTH-001` | Lost Session Tokens on Registration Network Disconnect | DB commits but client loses response; unauthenticated retry cannot issue tokens. | Reject retry with `409 EMAIL_ALREADY_EXISTS` and guide user to Login screen with pre-filled email. | **RESOLVED** |
| **API-008** | `EP-PROG-002` | Equal Timestamp Weigh-in Snapshot Overwrite Races | Multiple weigh-ins on same day overwrite newer entries out of order. | Atomic conditional update checking `$or: [{ weightRecordedAt: { $lt: date } }, { weightRecordedAt: date, weightEntryId: { $lt: id } }]`. | **OPEN** |
| **API-009** | `EP-USER-008` | Inability to Record Consent Withdrawal under Strict True Schema | Schema constrained `hasAccepted: true` making withdrawal unrecordable. | Added `action: 'accepted' \| 'withdrawn'` and `hasAccepted: boolean` ([USERS_SCHEMA.md §3.4](file:///d:/2026/Personal%20Fitness%20&%20AI%20Coach%20Platform/FitMate-AI/docs/architecture/database/USERS_SCHEMA.md#L206-L230)). | **PROPOSED** |
| **API-010** | `EP-AUTH-008` | Active JWTs Surviving Password Change under Stateless Verification | Stolen access tokens valid for remaining 15 minutes after password reset. | High-security endpoints verify `users.tokenVersion`; Redis fast revocation cache evaluated ([DB-040](file:///d:/2026/Personal%20Fitness%20&%20AI%20Coach%20Platform/FitMate-AI/docs/architecture/database/DATABASE_ISSUES.md#L92)). | **OPEN** |

---

## 17. Unresolved Architectural & Product Decisions

1. **DB-017 (Nutrition Timezone Strategy)**: Whether daily nutrition logs should support automatic day shifting when users travel across timezones or strictly anchor to the date string when logged remains **OPEN**.
2. **DB-018 (Durable Deletion Saga Store)**: Choice between MongoDB collection `deletion_saga_jobs` versus Redis / BullMQ remains an **OPEN infrastructure decision**.
3. **DB-030 (AI Coach Rate Limiting Technology)**: Distributed Redis token bucket vs MongoDB sliding window counter remains **OPEN**.
4. **DB-040 (Fast Token Revocation Cache)**: Introducing Redis for sub-millisecond global token revocation across all routine endpoints remains **OPEN** for evaluation.
5. **ARCH-006 (Transactional Outbox Pattern)**: Implementing a persistent MongoDB outbox table vs in-process event emitter for domain events (`weight.recorded`) remains **OPEN**.
6. **ProgressModule Event Metadata**: Adding `entryId: Types.ObjectId` and `createdAt: Date` to the `weight.recorded` event payload remains an **OPEN dependency on ProgressModule**.

