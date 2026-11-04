# FitMate AI — Phase FE 2 Independent Security & Integration Audit

**Auditor:** Senior Application Security Engineer, Frontend Architect & Backend Integration Auditor  
**Date:** November 2, 2026  
**Subject:** Frontend Phase FE 2 (Authentication & Onboarding Integration)  
**Primary Reference Report:** `docs/implementation/FRONTEND_FE_2_REPORT.md`  
**Authoritative Contracts:** `docs/architecture/API_CONTRACTS.md`, `src/modules/auth/`, `src/modules/users/`  
**Audit Mode:** STRICT READ-ONLY AUDIT  

---

## 1. Executive Verdict

### **VERDICT: APPROVED WITH CONDITIONS**

The implementation of Phase FE 2 successfully establishes the frontend authentication foundation, client-side onboarding validation, in-memory token safety, and production mock safety (remediating `AUD-FE-001`). All 10 Vitest test suites (38 tests) pass, TypeScript compilation completes with zero errors, and Next.js 14 compiles 11 static routes without error.

However, this audit has uncovered **1 High Severity**, **3 Medium Severity**, and **2 Low/Architectural Findings** that must be resolved prior to beginning Phase FE 3. Most critically, a contract payload mismatch in `POST /api/v1/auth/refresh` will cause silent token refresh to throw an unhandled `TypeError` against the real backend, unexpectedly logging out real users.

---

## 2. Verified Architecture & Mock Safety Verification

### 2.1 AUD-FE-001 Verification Matrix
We inspected `frontend/src/lib/config/env.ts` and evaluated `shouldUseMocks(nodeEnv, envUseMocks)` across all five required environment permutations:

| Test Scenario | `NODE_ENV` | `NEXT_PUBLIC_USE_MOCKS` | Verified Result | Assessment |
| :--- | :--- | :--- | :---: | :--- |
| **Dev Default** | `'development'` | `undefined` (omitted) | `true` | ✅ PASS — Developer preview mode active |
| **Dev Real API** | `'development'` | `'false'` | `false` | ✅ PASS — Developer connects to real backend |
| **Prod Default** | `'production'` | `undefined` (omitted) | `false` | ✅ PASS — **AUD-FE-001 Resolved: Defaults strictly to Real API** |
| **Prod Explicit Opt-in** | `'production'` | `'true'` | `true` | ✅ PASS — Explicit preview override permitted |
| **Prod Disabled** | `'production'` | `'false'` | `false` | ✅ PASS — Explicitly disabled |

### 2.2 Absence of Silent Fallback
In `frontend/src/lib/api/auth.adapter.ts`:
- `RealAuthAdapter` delegates directly to `apiClient`.
- In the event of 401 Unauthorized, 409 Conflict, 429 Rate Limit, or network disconnection (`ECONNREFUSED`), `ApiClientError` is raised directly to the caller.
- There is **no catch-and-switch** logic falling back to `MockAuthAdapter`.

### 2.3 Production Demo Login Isolation
In `frontend/src/features/auth/LoginForm.tsx`:
- When `isMock === false` (Real API mode), the "Quick Demo Login" button is **completely removed from the DOM**.
- In the handler `handleDemoLogin()`, `if (!isMock)` strictly aborts execution with an alert and never invokes `login()`.
- No demo credentials can be submitted to production accounts accidentally.

---

## 3. Backend Authentication Contract Compatibility Matrix

We audited the real backend implementation (`src/modules/auth/auth.controller.ts`, `auth.service.ts`, `auth.routes.ts`, and `docs/architecture/API_CONTRACTS.md`) against the frontend types (`frontend/src/types/auth.types.ts`) and adapters.

### Contract Comparison Table

| Operation | Approved Backend Contract | Actual Backend Implementation (`auth.service.ts`) | Frontend Implementation (`auth.adapter.ts` / `types`) | Status & Compatibility |
| :--- | :--- | :--- | :--- | :---: |
| **EP-AUTH-001 (Register)** | `201 Created`<br>`{ user, tokens, profile }` | Line 188:<br>`{ user, tokens, profile }` | `AuthResponseData`<br>`{ user, tokens, profile }` | ✅ **COMPATIBLE** |
| **EP-AUTH-002 (Login)** | `200 OK`<br>`{ user, tokens }`<br>*(No `profile`)* | Line 271:<br>`{ user, tokens }`<br>*(No `profile`)* | `AuthResponseData`<br>`{ user, tokens, profile }`<br>*(Expects `profile`)* | ⚠️ **MISMATCH (SEC-FE-002)**<br>`res.profile` is `undefined` on real login |
| **EP-AUTH-004 (Refresh)** | `200 OK`<br>`{ accessToken, tokenType, expiresIn, refreshToken }` | Line 530:<br>`{ accessToken, tokenType, expiresIn, refreshToken }` | `RefreshResponseData`<br>`{ user, tokens: { ... } }`<br>*(Expects nested `tokens` & `user`)* | 🔴 **CRITICAL MISMATCH (SEC-FE-001)**<br>Runtime crash on real refresh |
| **EP-AUTH-005 (Logout)** | `200 OK`<br>`{ message: string }` | Line 541:<br>`{ message: string }` | `LogoutResponseData`<br>`{ message: string }` | ✅ **COMPATIBLE** |
| **EP-AUTH-009 (Get Me)** | `200 OK`<br>`{ user: UserIdentityDto }` | Line 164 / `authController.getMe`<br>`{ user: { id, email, role, ... } }` | `RealAuthAdapter.getMe`<br>`apiClient.get<UserSummary>('/auth/me')` | ⚠️ **PARTIAL**<br>`UserIdentityDto` has `role`, `UserSummary` has `isOnboardingCompleted` |
| **Error Format** | `{ success: false, error: { code, message, details }, timestamp, path }` | `errorHandler.ts` envelope | `ApiClientError`<br>Extracts `code`, `message`, `details` | ✅ **COMPATIBLE** |

---

## 4. Security Findings with Severity

### 🔴 SEC-FE-001 [HIGH SEVERITY]: Silent Token Refresh Contract Mismatch Causes Runtime Crash and User Lockout
- **Location**: `frontend/src/types/auth.types.ts` (lines 62–65), `frontend/src/features/auth/AuthContext.tsx` (lines 52, 125).
- **Vulnerability**:
  The real backend `POST /api/v1/auth/refresh` returns tokens at the root of `data`:
  ```json
  { "success": true, "data": { "accessToken": "...", "tokenType": "Bearer", "expiresIn": 900, "refreshToken": "..." } }
  ```
  However, frontend `RefreshResponseData` specifies `{ user: UserSummary, tokens: AuthTokens }`.
  When `AuthContext.tsx` executes:
  ```typescript
  const refreshed = await adapter.refresh(refreshToken);
  setToken(refreshed.tokens.accessToken); // TypeError: Cannot read properties of undefined
  ```
  `refreshed.tokens` is `undefined`. This raises an unhandled `TypeError` caught by the error handler, which invokes `setUser(null); setToken(null); setRefreshToken(null);`.
- **Impact**: In real API mode, any silent refresh (automatic after 14 minutes or manual via `refreshSession()`) immediately logs the user out.
- **Root Cause in FE 2**: `MockAuthAdapter.refresh()` returned a fake nested structure `{ user: ..., tokens: { ... } }` which satisfied frontend unit tests but diverged from the approved backend contract.
- **Remediation**:
  Update `RefreshResponseData` to `{ accessToken: string; tokenType: string; expiresIn: number; refreshToken: string; }` and update `AuthContext.tsx` to read `refreshed.accessToken` directly.

---

### 🟡 SEC-FE-002 [MEDIUM SEVERITY]: Login Response Lacks `profile` Payload Leading to Incomplete Auth State
- **Location**: `frontend/src/types/auth.types.ts` (line 59), `frontend/src/features/auth/AuthContext.tsx` (line 74).
- **Vulnerability**:
  `POST /api/v1/auth/login` (`EP-AUTH-002`) does not return the user's `profile` (calorie budget, macronutrient targets). Only `POST /api/v1/auth/register` returns `profile`.
  In `AuthContext.tsx`, `res.profile` is `undefined` on login.
- **Impact**:
  In real mode, after logging in, `profile` in `useAuth()` remains `null`. Any dashboard or nutrition component assuming `profile` exists immediately after login will render empty/skeleton targets until `GET /api/v1/users/profile` is fetched.
- **Remediation**:
  1. Make `profile` optional in `AuthResponseData` (`profile?: UserProfileSnapshot | null`).
  2. In `AuthContext.login()`, if `res.profile` is missing, trigger an asynchronous fetch of `GET /api/v1/users/profile` (`EP-USER-001`) to hydrate targets.

---

### 🟡 SEC-FE-003 [MEDIUM SEVERITY]: Open Redirect Risk on Login Redirect Parameter
- **Location**: `frontend/src/features/auth/LoginForm.tsx` (lines 19, 57).
- **Vulnerability**:
  `const redirectPath = searchParams?.get('redirect') || '/dashboard';`
  `router.push(redirectPath);`
  The `redirect` URL parameter is consumed directly without validation. An attacker can construct a phishing link:
  `https://fitmate.ai/auth/login?redirect=https://evil-phishing-domain.com` or `//evil-phishing-domain.com`.
- **Impact**:
  Users completing legitimate login can be silently redirected to an external credential-harvesting or malicious destination.
- **Remediation**:
  Sanitize the redirect path before passing to `router.push`:
  ```typescript
  const rawRedirect = searchParams?.get('redirect') || '/dashboard';
  const isSafeRedirect = rawRedirect.startsWith('/') && !rawRedirect.startsWith('//') && !rawRedirect.includes('://');
  const redirectPath = isSafeRedirect ? rawRedirect : '/dashboard';
  ```

---

### 🟡 SEC-FE-004 [MEDIUM SEVERITY]: Unprotected Authenticated Shell Routes (`/workouts`, `/progress`, `/coach`)
- **Location**: `frontend/src/app/workouts/page.tsx`, `frontend/src/app/progress/page.tsx`, `frontend/src/app/coach/page.tsx`.
- **Vulnerability**:
  While `/dashboard` and `/nutrition` are guarded with `<ProtectedRoute>`, the routes `/workouts`, `/progress`, and `/coach` render the authenticated layout (`AppHeader`, `Sidebar`, `MobileNav`) without `<ProtectedRoute>`.
- **Impact**:
  Unauthenticated visitors can access internal placeholders and application chrome without being prompted to log in.
- **Remediation**:
  Wrap the contents of all internal application pages with `<ProtectedRoute>`.

---

### 🔵 SEC-FE-005 [LOW SEVERITY]: Over-Exposure of `refreshToken` on `useAuth()` Interface
- **Location**: `frontend/src/features/auth/AuthContext.tsx` (lines 16, 147).
- **Vulnerability**:
  `refreshToken` is exposed in `AuthContextType` and returned by `useAuth()`.
- **Impact**:
  UI components throughout the application can access the raw refresh token string. This unnecessarily enlarges the credential blast radius in the event of component logging, third-party component inspection, or devtools exposure.
- **Remediation**:
  Keep `refreshToken` internal to `AuthProvider`. Components should only consume `token`, `user`, `profile`, `isAuthenticated`, and action methods (`login`, `register`, `logout`).

---

### 🔵 SEC-FE-006 [LOW SEVERITY]: Missing 401 Interceptor and In-Flight Refresh Concurrency Mutex
- **Location**: `frontend/src/lib/api/client.ts`.
- **Vulnerability**:
  `ApiClient` does not intercept `401 Unauthorized` responses to initiate a silent token refresh and replay requests. If a user tab is throttled in the background or machine sleeps past the 15-minute access token lifespan, subsequent requests fail immediately. Additionally, concurrent refresh invocations are not deduplicated with a shared promise.
- **Remediation**:
  Implement an API client response interceptor that queues failed requests, invokes `refreshSession()`, and replays queued requests with the rotated access token.

---

## 5. Token Security Review

1. **Storage Safety**:
   - `localStorage` inspection: Confirmed `token`, `accessToken`, `refreshToken`, and user credentials are **never written** to `localStorage`.
   - `sessionStorage` inspection: Confirmed zero tokens are written to `sessionStorage`.
2. **Logging Hygiene**:
   - Tokens are not passed to `console.log` or error alerts.
   - `ApiClientError` strips raw request bodies and only reports the error code, status, and server message.
3. **Authorization Header**:
   - `ApiClient.request` correctly sets `Authorization: Bearer ${token}`.
4. **Logout State Sanitation**:
   - `logout()` in `AuthContext` atomically clears `user`, `profile`, `token`, `refreshToken`, and cancels the scheduled timer.
5. **Accurate XSS Evaluation**:
   - In-memory storage strictly eliminates **persistent local credential extraction** (e.g. `localStorage.getItem()`).
   - However, **in-memory storage does not eliminate XSS risk**. If an attacker succeeds in executing JavaScript within the origin (DOM-based XSS, vulnerable dependencies), the active execution context can monkey-patch `window.fetch`, inspect React fiber trees, or trigger authenticated requests through `ApiClient`. True XSS mitigation requires strict Content Security Policy (CSP), input sanitization, and HttpOnly cookies.

---

## 6. Refresh Lifecycle & Concurrency Analysis

1. **Timer Expiration Alignment**:
   - The refresh timer uses a hardcoded interval: `(900 - 60) * 1000 = 840,000 ms` (14 minutes).
   - This assumes backend access tokens expire in exactly 900 seconds (`env.JWT_ACCESS_EXPIRES_IN`). While this matches backend configuration, parsing the `expiresIn` integer from the login/refresh response rather than hardcoding 900 is more resilient.
2. **Timer Cleanup**:
   - The `useEffect` cleanup return `() => clearTimeout(timer)` properly cancels active timers upon unmount, logout, or session reset.
3. **Delayed / Suspended Browser Tabs**:
   - In modern browsers (Chrome, Safari, Edge), `setTimeout` is throttled to 1 minute or suspended entirely when tabs are inactive.
   - When a tab wakes up, the timer fires late (potentially after the access token has already expired). Because the backend supports a 30-day refresh token lifespan and 30-second rotation grace window (`DB-036`), the backend refresh call *would* succeed, but frontend `SEC-FE-001` currently causes a crash.
4. **Backend Token Family Invalidation**:
   - Backend `auth.service.ts` line 540 revokes the specific refresh token family on logout.
   - If an old refresh token is reused outside the 30-second grace window, the backend detects token reuse (`TOKEN_REUSE_DETECTED`) and invalidates all tokens in that family.

---

## 7. Session Restoration Analysis & Recommendation

### Current Behavior Analysis
Because tokens are stored strictly in memory and the Express backend returns tokens in JSON response bodies without setting `Set-Cookie` headers:
- **Browser Reload (F5)**: In-memory React state is destroyed. User is unauthenticated.
- **Opening a New Tab**: New browsing context has `user: null, token: null`. User is unauthenticated.
- **Browser Restart**: Memory cleared. User is unauthenticated.
- **Redirect**: `<ProtectedRoute>` detects `!isAuthenticated` and immediately redirects to `/auth/login?redirect=...`.

### Architectural Comparison of Session Restoration Approaches

| Approach | Description | Security Evaluation | UX Evaluation | Complexity | Recommendation |
| :--- | :--- | :--- | :--- | :---: | :---: |
| **Option A (In-Memory Only)** | Retain current behavior: require manual re-login on every page refresh / new tab. | High client isolation; zero persistent token risk. | **Very Poor**: Frustrating for web and mobile users who refresh or background tabs. | Low | ❌ Not viable for production |
| **Option B (HttpOnly SameSite Cookie)** | Backend sets `refreshToken` in `Set-Cookie: HttpOnly; Secure; SameSite=Lax; Path=/api/v1/auth`. Frontend calls `POST /api/v1/auth/refresh` on initial mount to restore session. | **Industry Gold Standard**: Immune to JavaScript/XSS token theft. SameSite protects against CSRF. | **Seamless**: Sessions survive reloads and sync across tabs automatically. | Moderate | 🏆 **RECOMMENDED** |
| **Option C (Next.js BFF Proxy)** | Next.js API Route Handlers act as a Backend-for-Frontend, storing tokens in an encrypted session cookie (`iron-session`) and proxying to Express. | High security; keeps Express backend untouched. | Seamless session restoration. | High (Adds proxy overhead and dual API routing). | ❌ Over-engineered for Modular Monolith |

### Recommendation for FitMate AI
Adopt **Option B** as a dedicated backend/frontend task in Phase FE 3 / Backend Phase 5.3:
1. Express backend sets `refreshToken` as an `HttpOnly`, `Secure`, `SameSite=Lax` cookie scoped to `/api/v1/auth`.
2. Frontend `AuthProvider` on initial mount executes a silent `POST /api/v1/auth/refresh` (with `credentials: 'include'`).
3. If valid, the session is restored into memory without storing tokens in `localStorage`.
4. If expired or absent, the app remains unauthenticated without error.

---

## 8. Registration and Onboarding Validation Audit

We compared `frontend/src/features/auth/OnboardingWizard.tsx` with backend `src/modules/auth/dto/auth.dto.ts` (`registerSchema`):

| Schema Field | Backend Rule (`registerSchema`) | Frontend Rule (`OnboardingWizard.tsx`) | Alignment |
| :--- | :--- | :--- | :---: |
| `email` | `trim().toLowerCase().email().max(254)` | `regex`, `trim()`, `toLowerCase()` | ✅ EXACT |
| `password` | Min 8, Max 128, 1 uppercase, 1 number, 1 special | Identical regex: `/^(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]).{8,128}$/` | ✅ EXACT |
| `displayName` | `trim().min(1).max(100).optional()` | `trim()`, default `'Fit Athlete'` | ✅ EXACT |
| `goal` | 6 enum values (`fat_loss`, `muscle_gain`, etc.) | Identical 6 enum buttons | ✅ EXACT |
| `biologicalSex` | `'male' \| 'female' \| 'prefer_not_to_say'` | `'male' \| 'female'` selectable in UI | ✅ VALID SUBSET |
| `birthDate` | `YYYY-MM-DD`, Age 13..100 | `<input type="date">`, Age 13..100 calculated | ✅ EXACT |
| `heightCm` | `100.0 .. 250.0` cm | `100.0 .. 250.0` cm | ✅ EXACT |
| `weightKg` | `30.0 .. 300.0` kg | `30.0 .. 300.0` kg | ✅ EXACT |
| `activityMultiplier` | `1.2 \| 1.375 \| 1.55 \| 1.725 \| 1.9` | Identical 5 multipliers | ✅ EXACT |
| `trainingExperience` | `'beginner' \| 'intermediate' \| 'advanced'` | Identical 3 tiers | ✅ EXACT |
| `dietaryPreference` | `'none' \| 'vegetarian' \| 'vegan' \| 'pescatarian' \| 'halal' \| 'keto' \| 'custom'` | Identical 7 preferences | ✅ EXACT |
| `unitSystem` | `'metric' \| 'imperial'` | Identical 2 unit systems | ✅ EXACT |
| `preferredLanguage` | `'en' \| 'ar'` | Identical 2 languages | ✅ EXACT |
| `hasAcceptedHealthDisclaimer` | Strictly `true` | Checked boolean `true` | ✅ EXACT |
| `hasAcceptedTerms` | Strictly `true` | Checked boolean `true` | ✅ EXACT |

---

## 9. Quality Gates & Test Execution Audit

### 9.1 Test Categorization
- **Unit Tests**:
  - `tests/unit/auth.service.test.ts` (Backend: 11 tests)
  - `tests/unit/oauth.security.test.ts` (Backend: 6 tests)
  - `frontend/tests/ProductionMockSafety.test.ts` (Frontend: 8 tests)
  - `frontend/tests/Adapters.test.ts` (Frontend: 3 tests)
  - `frontend/tests/LanguageContext.test.tsx` (Frontend: 2 tests)
  - `frontend/tests/Dashboard.test.tsx` (Frontend: 3 tests)
  - `frontend/tests/Nutrition.test.tsx` (Frontend: 2 tests)
  - `frontend/tests/ProtectedRoute.test.tsx` (Frontend: 2 tests)
- **Mock Integration Tests (Component + In-Memory Provider)**:
  - `frontend/tests/AuthLifecycle.test.tsx` (Frontend: 4 tests)
  - `frontend/tests/LoginForm.test.tsx` (Frontend: 5 tests)
  - `frontend/tests/Onboarding.test.tsx` (Frontend: 2 tests)
  - `frontend/tests/RegistrationIntegration.test.tsx` (Frontend: 7 tests)
  - *Note: These execute against `MockAuthAdapter`. They do not connect to a running Express HTTP server.*
- **Real Backend Integration Tests (HTTP + Mongo Memory Server + Redis)**:
  - `tests/integration/auth.api.test.ts` (Backend: 17 tests)

### 9.2 Execution Results

| Test Suite / Quality Gate | Execution Command | Result | Exit Code |
| :--- | :--- | :---: | :---: |
| **Backend Auth Integration & Unit** | `node ./node_modules/vitest/vitest.mjs run tests/integration/auth.api.test.ts tests/unit/auth.service.test.ts tests/unit/oauth.security.test.ts` | **34 passed (34 tests)** | `0` |
| **Frontend Complete Vitest Suite** | `cd frontend; node ./node_modules/vitest/vitest.mjs run` | **38 passed (10 files, 38 tests)** | `0` |
| **Frontend TypeScript Typecheck** | `cd frontend; node ./node_modules/typescript/bin/tsc --noEmit` | **0 errors** | `0` |
| **Frontend Next.js Production Build** | `cd frontend; node ./node_modules/next/dist/bin/next build` | **11 static pages generated** | `0` |

---

## 10. Required Remediation Before Phase FE 3

The following items are mandatory conditions for proceeding to Phase FE 3:

1. **Fix Silent Refresh Contract (`SEC-FE-001`)**:
   - Update `RefreshResponseData` in `frontend/src/types/auth.types.ts` to `{ accessToken: string; tokenType: string; expiresIn: number; refreshToken: string; }`.
   - Update `AuthContext.tsx` line 52 & 125 to assign `refreshed.accessToken` directly, preventing `TypeError`.
2. **Handle Login Profile Retrieval (`SEC-FE-002`)**:
   - Mark `profile` as optional in `AuthResponseData`.
   - Update `AuthContext.login()` to fetch `GET /api/v1/users/profile` when `res.profile` is missing.
3. **Remediate Open Redirect Risk (`SEC-FE-003`)**:
   - Validate and sanitize `redirectPath` in `LoginForm.tsx` ensuring it starts with `/` and not `//`.
4. **Enclose Shell Routes in Route Guard (`SEC-FE-004`)**:
   - Wrap `/workouts/page.tsx`, `/progress/page.tsx`, and `/coach/page.tsx` with `<ProtectedRoute>`.
5. **Encapsulate `refreshToken` (`SEC-FE-005`)**:
   - Remove `refreshToken` from `AuthContextType` and keep it private to `AuthProvider`.

---

## 11. Deferred Improvements for Production Hardening

1. **Option B HttpOnly Cookie Session Restoration**:
   - Upgrade Express `AuthModule` to set `Set-Cookie: refreshToken=...; HttpOnly; Secure; SameSite=Lax`.
   - Add initial session hydration in `AuthProvider` on page mount.
2. **API Client 401 Interceptor with Mutex**:
   - Intercept 401s in `client.ts`, trigger a single deduplicated refresh promise, and replay failed in-flight requests.
3. **Dynamic Token Expiry Timer**:
   - Decode or read `expiresIn` from the token response instead of assuming a constant 900 seconds.

