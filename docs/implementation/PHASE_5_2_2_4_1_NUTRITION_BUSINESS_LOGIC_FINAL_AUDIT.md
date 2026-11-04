# FitMate AI — Milestone 4.1 Independent Final Audit
## Nutrition Persistence Repository & Business Logic Layer

**Date**: 2026-11-03  
**Auditor**: Independent Senior Backend Engineer & Software Architect  
**Audit Target**: Backend Phase 5.2 Milestone 4 (`NutritionRepository`, `NutritionService`, and associated integration tests)  
**Status**: COMPLETED  
**Final Audit Verdict**: **APPROVED WITH CONDITIONS**

---

## 1. Executive Summary & Audit Verdict

This document presents the independent read-only audit of Backend Phase 5.2 Milestone 4: Nutrition persistence repository and business logic orchestration in the FitMate AI Modular Monolith.

The Milestone 4 implementation successfully bridges the foundational persistence schema (Milestone 3, `NutritionLogModel`) with the domain calculators (`nutrition.calculator.ts`, `energyCalculator.ts`) and cross-module profile integration (`usersService.getProfileSnapshot(userId)`). The repository and service layers provide clean, test-backed implementations for all six target nutrition endpoints (EP-NUTR-001, EP-NUTR-002, EP-NUTR-003, EP-NUTR-004, EP-NUTR-007, and EP-NUTR-008) while preserving previously existing food catalog endpoints (EP-NUTR-005, EP-NUTR-006).

### Audit Verdict: **APPROVED WITH CONDITIONS**

The implementation is structurally sound, passes 100% of automated unit and integration tests (201/201 tests across the entire backend, 131/131 in nutrition and related suites), respects modular boundaries, and maintains strict server-side calculation authority. However, two non-blocking architectural and concurrency conditions require explicit remediation or formal sign-off during Milestone 5 (HTTP Controllers & Routing) before production release:

1. **Condition 1 (SEC-NUTR-001 — Medium Severity)**: Concurrency in item-level mutations (`addItemToSlot`, `updateItemInDiary`, `removeItemFromDiary`) relies on in-memory read-modify-save (`log.save()`) with `versionKey: false`. Concurrent requests for the same existing diary log risk lost updates under high write contention.
2. **Condition 2 (ARCH-NUTR-001 — Medium Severity)**: `NutritionService.getTargetsWithFallback()` silently synthesizes generic baseline targets (`2000 kcal`, `150g protein`, `200g carbs`, `65g fat`) when a user has not completed onboarding. This silent fallback is not documented in approved architectural specifications and must be reconciled with Product/Architecture.

---

## 2. Architecture & Modular Boundary Audit

### 2.1 Unidirectional Directed Acyclic Graph (DAG)
The dependency hierarchy was audited to verify compliance with FitMate AI modular boundaries:

```
┌──────────────────────────────────────────────┐
│               NutritionService               │
└──────┬───────────────────────┬───────────────┘
       │ (Constructor DI)      │ (Internal Leaf)
       ▼                       ▼
┌──────────────┐     ┌────────────────────────┐
│ UsersService │     │   nutrition.calculator │
└──────┬───────┘     └────────────────────────┘
       │ (Leaf Dependency)
       ▼
┌──────────────────────┐
│   energyCalculator   │
└──────────────────────┘
```

- **Compliance**: `NutritionService` accepts `UsersService` strictly via constructor dependency injection (`constructor(nutritionRepository, foodItemRepository, usersService)`).
- **Zero Reverse Imports**: `UsersService` has zero dependencies or imports pointing back to `NutritionService` or `NutritionModule`.
- **Encapsulation of Private Collections**: `NutritionModule` never accesses `UserProfileModel` or the underlying `user_profiles` collection directly. Targets flow exclusively through the public `IUserProfileSnapshot` contract returned by `usersService.getProfileSnapshot(userId)`.
- **Pure Leaf Calculation**: Domain calculation routines (`energyCalculator.ts`, `nutrition.calculator.ts`) operate as pure, side-effect-free utility leaves, eliminating logic duplication across the codebase.

---

## 3. Repository Layer Audit (`NutritionRepository`)

File: [nutrition.repository.ts](file:///d:/2026/Personal%20Fitness%20&%20AI%20Coach%20Platform/FitMate-AI/src/modules/nutrition/nutrition.repository.ts)

### 3.1 Method Inventory & Compliance Analysis

| Method | Specification Requirement | Implementation Status | Findings / Notes |
| :--- | :--- | :--- | :--- |
| `findDiaryByDate(userId, date)` | Fetch log by `{ userId, date }` | **Compliant** | Uses unique compound index `uniq_user_nutrition_date`. |
| `findDiaryById(userId, logId)` | Fetch log by `{ _id, userId }` | **Compliant** | BOLA-protected query; non-owner returns `null`. |
| `createDiary(userId, date, tz?)` | Initialize fresh 4-slot diary | **Compliant** | Seeds breakfast, lunch, dinner, snack with 0 subtotals. |
| `findOrCreateDiary(userId, date, tz?)` | Idempotent upsert with collision handling | **Compliant** | Implements Condition 2 recovery: intercepts MongoDB `code === 11000` and retries fetch. |
| `addItemToSlot(userId, date, slot, item, tz?)` | Append item to slot & recalculate | **Compliant** | Recalculates slot & daily totals; persists to DB. |
| `updateItemInDiary(userId, logId, itemId, updates, targetSlot?)` | In-place item update or cross-slot move | **Compliant** | Handles slot migration, adjusts both slot subtotals and daily totals. |
| `removeItemFromDiary(userId, logId, itemId)` | Remove item from diary | **Compliant** | Splices item from sub-array, decrements totals. |
| `findDiaryHistory(userId, startDate, endDate)` | Range queries for analytics | **Compliant** | Backed by index `idx_user_nutrition_history { userId: 1, date: -1 }`. |
| `recalculateTotals(log)` | Authoritative aggregation | **Compliant** | Uses `aggregateNutritionItems` adhering to DB-016 precision tiers. |
| `saveDiary(log)` | Recalculate & save | **Compliant** | Validates schema constraints before persisting. |

### 3.2 Finding SEC-NUTR-001: In-Memory Read-Modify-Save Concurrency
- **Severity**: 🟠 **Medium (Must Address in Milestone 5)**
- **Audit Detail**:
  In `findOrCreateDiary`, concurrent creation collisions are safely mitigated via `E11000` duplicate key error interception. However, in `addItemToSlot`, `updateItemInDiary`, and `removeItemFromDiary`, the document is retrieved into Node.js memory, modified in TypeScript, and saved using Mongoose `log.save()`.
  Because `NutritionLogSchema` explicitly configures `versionKey: false` (from Milestone 3 DB-016), Mongoose Optimistic Concurrency Control (OCC) is disabled.
- **Risk**: If two requests for the same existing diary log arrive concurrently (e.g. rapid multi-item logging or client retry bursts), both workers read the same document state, apply separate item mutations in memory, and the latter `save()` overwrites the former, resulting in a lost update.
- **Remediation**:
  1. For Milestone 5, evaluate atomic MongoDB operators (e.g., `$push`, `$pull` with aggregation pipeline updates), OR
  2. Enable `versionKey: true` and catch `VersionError` with a standard retry loop in the repository.

---

## 4. Business Logic & Service Layer Audit (`NutritionService`)

File: [nutrition.service.ts](file:///d:/2026/Personal%20Fitness%20&%20AI%20Coach%20Platform/FitMate-AI/src/modules/nutrition/nutrition.service.ts)

### 4.1 Endpoint Contract Satisfaction

| Contract ID | Route & Verb | Service Method | Audit Status | Key Invariant / Behavior Verified |
| :--- | :--- | :--- | :--- | :--- |
| **EP-NUTR-001** | `GET /api/v1/nutrition/diary` | `getDiary` | **Compliant** | Virtual empty-day envelope with full targets budget. Remaining budget calculated correctly (`target - consumed`). |
| **EP-NUTR-002** | `POST /api/v1/nutrition/meals/quick-add` | `logQuickAdd` | **Compliant** | Persists uncatalogued items (`foodId: null`, `isQuickAdd: true`, `isEstimated: true`). Rejects kcal > 10,000. |
| **EP-NUTR-003** | `POST /api/v1/nutrition/meals/item` | `logCatalogItem` | **Compliant** | Authoritative server scaling via `scaleNutrients()`. Client macro overrides ignored. Snapshot immutability enforced. |
| **EP-NUTR-004** | `DELETE /api/v1/nutrition/meals/:logId/items/:itemId` | `deleteLoggedItem` | **Compliant** | BOLA-protected item deletion. Returns 404 NOT_FOUND on non-owner access. Recalculates totals. |
| **EP-NUTR-005** | `GET /api/v1/nutrition/foods/search` | `searchFoods` | **Compliant** | Preserved from Milestone 2. Bilingual search and category filtering intact. |
| **EP-NUTR-006** | `GET /api/v1/nutrition/foods/:id` | `getFoodById` | **Compliant** | Preserved from Milestone 2. 9 provenance fields, laboratory verification confidence. |
| **EP-NUTR-007** | `PATCH /api/v1/nutrition/meals/:logId/items/:itemId` | `editLoggedItem` | **Compliant** | Authoritatively recalculates catalog items from reference data. Supports cross-slot move. |
| **EP-NUTR-008** | `GET /api/v1/nutrition/summary` | `getDailySummary` | **Compliant** | Lightweight summary for Coach & Progress. Empty days return 0 consumed without persisting empty logs. |

### 4.2 Finding ARCH-NUTR-001: Unapproved Silent Fallback to 2000 kcal for Missing User Profiles
- **Severity**: 🟠 **Medium (Requires Product/Architectural Reconciliation)**
- **Audit Detail**:
  In `nutrition.service.ts#L671-L699` (`getTargetsWithFallback`):
  ```typescript
  catch (err: unknown) {
    if (err instanceof AppError && err.statusCode === 404) {
      return {
        dailyCalories: 2000,
        proteinGrams: 150,
        carbsGrams: 200,
        fatGrams: 65,
        isTargetsCustomized: false,
        isEstimated: true,
      };
    }
    throw err;
  }
  ```
  While defensively preventing an HTTP 500/404 when a newly registered user visits their diary before completing onboarding, this 2000 kcal baseline fallback is not documented or approved in `MODULE_BOUNDARIES.md`, `NUTRITION_MODULE_DESIGN.md`, or `NUTRITION_API_CONTRACTS.md`. FitMate AI Core Invariant 5 states: *"Never hard-code one individual's body measurements, dietary restrictions, fitness routines, or baseline preferences."*
- **Remediation**:
  1. Reconcile with Product requirements. If the user has not onboarded, either:
     - Return `404 RESOURCE_NOT_FOUND` with message `"User profile not found. Please complete biometric onboarding."`, or
     - Explicitly document this design choice in an Architecture Decision Record (`DEC-013`), marking the targets in the response envelope with `isPlaceholder: true` or `hasCompletedOnboarding: false` so the client UI can prompt onboarding.

### 4.3 Finding DATA-NUTR-001: Static Numerical Timezone Offset Considerations
- **Severity**: 🟡 **Minor / Documentation Note**
- **Audit Detail**:
  As established in `DB-017`, `timezoneOffsetMinutes` is accepted as an integer representing UTC offset minutes (e.g., `-120`). Static numerical offsets do not automatically capture daylight saving time (DST) transitions or intra-day user travel across timezones.
- **Assessment**: The implementation correctly fulfills the approved `DB-017` specification. No code change is required for Milestone 4, but client apps must pass the active timezone offset dynamically on each request.

---

## 5. Security & Authorization Audit (BOLA / IDOR)

### 5.1 Object-Level Authorization Defense
All diary access and mutation methods enforce object-level isolation:
- `findDiaryById(userId, logId)` queries `{ _id: logId, userId }`.
- `updateItemInDiary(userId, logId, itemId, ...)` and `removeItemFromDiary(userId, logId, itemId)` require both `_id: logId` and `userId`.
- When an unauthorized user attempts to manipulate another user's diary entry, the repository returns `null`, and the service raises:
  `AppError.notFound('Diary log not found', ErrorCode.RESOURCE_NOT_FOUND)`.
- Returning `404 NOT_FOUND` rather than `403 FORBIDDEN` is a deliberate security best practice that prevents unauthorized enumeration of existing diary IDs.

### 5.2 Server-Authoritative Calculation & Input Sanitization
- Clients cannot supply fabricated calories or macros when logging or editing catalog foods (`EP-NUTR-003`, `EP-NUTR-007`). Macro values are computed authoritatively on the server from the master catalog record.
- For uncatalogued Quick Add (`EP-NUTR-002`), input values are validated:
  - Calories cannot be negative or exceed `10,000 kcal`.
  - Macronutrients cannot be negative or exceed `1,000 g`.
  - Empty or whitespace-only meal names are rejected.

### 5.3 Snapshot Immutability Verification
- In `nutrition.service.ts`, catalog food data is deep-copied into the log item snapshot.
- Test `tests/integration/nutrition.service.test.ts#L225` explicitly verifies that modifying the underlying catalog food in the `food_library` collection after logging does NOT alter the logged item's snapshot in `nutrition_logs`. Historical user logs remain fully immutable.

---

## 6. Mathematical Precision & Estimation Invariant Audit

### 6.1 DB-016 Precision Tiers
The mathematical routines in `nutrition.repository.ts` and `nutrition.service.ts` conform to DB-016:
- **Calories**: Rounded to nearest integer (`Math.round(val)`).
- **Macronutrients (Protein, Carbs, Fat)**: Rounded to 1 decimal place (`Math.round(val * 10) / 10`).
- **Fiber**: Rounded to 1 decimal place (`Math.round(val * 10) / 10`).
- **Serving Weight**: Rounded to 1 decimal place (`Math.round(val * 10) / 10`).
- **Subtotal & Total Aggregations**: Calculated using `aggregateNutritionItems`, which sums unrounded floats before final rounding, preventing compounding rounding errors.

### 6.2 Core Invariant 2 (Nutrition Values Are Estimates)
Every response DTO generated by `NutritionService` (`DailyDiaryDto`, `LoggedCatalogItemDto`, `LoggedQuickAddDto`, `EditedLoggedItemDto`, `DailySummaryDto`) includes:
- `isEstimated: true` on food item snapshots.
- `isEstimated: true` on daily target profiles.
- `confidenceLevel` (`laboratory`, `verified`, or `unverified`) accurately carried through from the catalog or set to `unverified` for Quick Add.

---

## 7. Test Suite Coverage & Execution Evidence

### 7.1 Automated Test Execution Results

All 20 test suites across the repository were executed against live `mongodb-memory-server` instances.

**Command**:
```bash
node ./node_modules/vitest/vitest.mjs run
```

**Results**:
- **Test Files**: `20 passed (20)`
- **Tests**: `201 passed (201)`
- **Failures**: `0`
- **Total Duration**: `69.29s`

#### Breakdown of Nutrition & Cross-Module Test Suites:

| Test File | Category | Tests Passed | Duration |
| :--- | :--- | :--- | :--- |
| `tests/integration/nutrition.service.test.ts` | Service Integration | **20 / 20** | 5,976 ms |
| `tests/integration/nutrition.repository.test.ts` | Repository Integration | **12 / 12** | 2,180 ms |
| `tests/unit/nutritionLog.model.test.ts` | Model Unit Tests | **28 / 28** | 3,627 ms |
| `tests/unit/energyCalculator.test.ts` | Pure Domain Unit Tests | **23 / 23** | 49 ms |
| `tests/unit/nutrition.calculator.test.ts` | Pure Domain Unit Tests | **10 / 10** | 20 ms |
| `tests/unit/textNormalizer.test.ts` | Search Utility Unit Tests | **11 / 11** | 32 ms |
| `tests/unit/users.service.test.ts` | Users Module Unit Tests | **5 / 5** | 37 ms |
| `tests/integration/foodSeeding.test.ts` | Seeder Integration | **4 / 4** | 5,408 ms |
| `tests/integration/foodCatalog.api.test.ts` | REST API Integration | **18 / 18** | 24,115 ms |
| **Nutrition Subtotal** | — | **131 / 131** | — |
| **All Other Backend Suites (Auth, Rate Limit, Health, Security)** | System / Auth | **70 / 70** | — |
| **Grand Total** | — | **201 / 201** | **69.29s** |

### 7.2 TypeScript Compiler Verification

**Command**:
```bash
node ./node_modules/typescript/bin/tsc --noEmit
```
**Exit Code**: `0` (Zero compiler or type-check errors).

---

## 8. Prioritized Remediation List for Milestone 5

The following conditions must be addressed during Backend Phase 5.2 Milestone 5 (Controllers, Routes, and Zod DTOs):

| Priority | ID | Condition / Task | Required Action in Milestone 5 |
| :--- | :--- | :--- | :--- |
| **P1** | **SEC-NUTR-001** | Item Mutation Concurrency | Address in-memory read-modify-save on `addItemToSlot`, `updateItemInDiary`, and `removeItemFromDiary` by adding OCC (`versionKey: true` with retry) or atomic pipeline updates. |
| **P2** | **ARCH-NUTR-001** | Missing Profile Fallback | Reconcile silent 2000 kcal fallback with Product. Either throw 404 (`User profile not found. Complete onboarding.`) or document DEC-013 with an explicit response flag (`isPlaceholder: true`). |
| **P3** | **ZOD-NUTR-001** | HTTP Input Validation | Implement comprehensive Zod validation schemas for all incoming HTTP request bodies and query parameters matching EP-NUTR-001 through EP-NUTR-008. |
| **P4** | **ROUTE-NUTR-001** | Controller & Router Wiring | Wire `NutritionController` to Express routes, attaching `authenticateToken` middleware and centralized rate limiting. |

---

## 9. Inspected Artifacts & Repository Files

1. `src/modules/nutrition/nutrition.repository.ts` (Tracked modified, +262 lines)
2. `src/modules/nutrition/nutrition.service.ts` (Tracked modified, +721 lines)
3. `src/modules/nutrition/models/nutritionLog.model.ts` (Milestone 3 foundation)
4. `src/modules/nutrition/models/foodItem.model.ts` (Catalog persistence)
5. `src/modules/nutrition/services/nutrition.calculator.ts` (Nutrient scaling utilities)
6. `src/modules/nutrition/domain/energyCalculator.ts` (TDEE/BMR domain leaf)
7. `src/modules/users/users.service.ts` (Public profile snapshot supplier)
8. `docs/architecture/NUTRITION_API_CONTRACTS.md` (Target endpoint contracts)
9. `docs/architecture/NUTRITION_MODULE_DESIGN.md` (Module boundaries & design)
10. `docs/architecture/database/NUTRITION_DATABASE_SCHEMA.md` (Schema specifications)
11. `tests/integration/nutrition.repository.test.ts` (12 live integration tests)
12. `tests/integration/nutrition.service.test.ts` (20 live integration tests)

---

## 10. Audit Conclusion & Next Steps

Milestone 4 satisfies all functional, architectural, and quality requirements. The persistence repository and business logic layers are mature, robustly tested, and ready to be exposed through HTTP controllers.

- **Verdict**: **APPROVED WITH CONDITIONS**
- **Action**: Do NOT proceed to Milestone 5 without explicit user approval. Await human review and sign-off on this audit report.

