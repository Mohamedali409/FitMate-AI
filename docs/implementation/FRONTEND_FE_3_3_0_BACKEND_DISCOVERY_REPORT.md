# FitMate AI — Phase FE 3.3.0 Backend Contract Discovery Report
## Meal Logging & Daily Nutrition Aggregation

**Role:** Senior Backend Integration Engineer & Frontend Architect  
**Audit Mode:** STRICT READ-ONLY DISCOVERY  
**Target Milestone:** FE 3.3 — Meal Logging & Daily Nutrition Aggregation  
**Date:** 2026-11-03  
**Status:** **DISCOVERY COMPLETE — BACKEND IMPLEMENTATION REQUIRED BEFORE FE 3.3 REAL INTEGRATION**  

---

## 1. Executive Summary

A comprehensive, strict read-only discovery inspection of the FitMate AI backend repository (`src/`, `tests/`, and `docs/architecture/`) was conducted to evaluate readiness for **Milestone FE 3.3 (Meal Logging & Daily Nutrition Aggregation)**.

### Primary Architectural Finding
**Zero (0) of the six (6) meal logging and diary aggregation endpoints are currently implemented in backend source code.**

While the domain calculation algorithms (`nutrition.calculator.ts` and `energyCalculator.ts`) and catalog endpoints (EP-NUTR-005 and EP-NUTR-006) were completed in Phase 5.2 Milestones 1 and 2, the **Nutrition Diary persistence layer (Milestones 3, 4, and 5)** has not yet been implemented in the backend. 

All six requested endpoints currently exist **strictly as architectural specifications** in [`docs/architecture/NUTRITION_API_CONTRACTS.md`](file:///d:/2026/Personal%20Fitness%20&%20AI%20Coach%20Platform/FitMate-AI/docs/architecture/NUTRITION_API_CONTRACTS.md) and [`docs/architecture/database/NUTRITION_DATABASE_SCHEMA.md`](file:///d:/2026/Personal%20Fitness%20&%20AI%20Coach%20Platform/FitMate-AI/docs/architecture/database/NUTRITION_DATABASE_SCHEMA.md).

### Summary Breakdown
- **READY (2 endpoints):**
  - `GET /api/v1/nutrition/foods/search` (EP-NUTR-005)
  - `GET /api/v1/nutrition/foods/:id` (EP-NUTR-006)
- **MISSING IN CODE (6 endpoints):**
  - `GET /api/v1/nutrition/diary` (EP-NUTR-001)
  - `POST /api/v1/nutrition/meals/quick-add` (EP-NUTR-002)
  - `POST /api/v1/nutrition/meals/item` (EP-NUTR-003)
  - `DELETE /api/v1/nutrition/meals/:logId/items/:itemId` (EP-NUTR-004)
  - `PATCH /api/v1/nutrition/meals/:logId/items/:itemId` (EP-NUTR-007)
  - `GET /api/v1/nutrition/summary` (EP-NUTR-008)

### Strategic Recommendation
Frontend real API integration for FE 3.3 cannot proceed until backend **Phase 5.2 (Milestones 3, 4, and 5)** is implemented. Frontend work must either:
1. **Pause** until the backend endpoints are built and tested; OR
2. Proceed strictly under **Mock-First Development** using an expanded `MockNutritionAdapter` adhering to the approved Phase 5.2.1.1 contract specification.

---

## 2. Endpoint Readiness Matrix

| Endpoint Identifier | HTTP Method | Route Path | Current Status | Implemented in Code? | Integration Tests Exist? |
|:-------------------:|:-----------:|:-----------|:--------------:|:--------------------:|:------------------------:|
| **EP-NUTR-001** | `GET` | `/api/v1/nutrition/diary` | **MISSING** | ❌ No | ❌ No |
| **EP-NUTR-002** | `POST` | `/api/v1/nutrition/meals/quick-add` | **MISSING** | ❌ No | ❌ No |
| **EP-NUTR-003** | `POST` | `/api/v1/nutrition/meals/item` | **MISSING** | ❌ No | ❌ No |
| **EP-NUTR-004** | `DELETE` | `/api/v1/nutrition/meals/:logId/items/:itemId` | **MISSING** | ❌ No | ❌ No |
| **EP-NUTR-005** | `GET` | `/api/v1/nutrition/foods/search` | **READY** | ✅ Yes (`nutrition.routes.ts`) | ✅ Yes (12+ tests) |
| **EP-NUTR-006** | `GET` | `/api/v1/nutrition/foods/:id` | **READY** | ✅ Yes (`nutrition.routes.ts`) | ✅ Yes (5+ tests) |
| **EP-NUTR-007** | `PATCH` | `/api/v1/nutrition/meals/:logId/items/:itemId` | **MISSING** | ❌ No | ❌ No |
| **EP-NUTR-008** | `GET` | `/api/v1/nutrition/summary` | **MISSING** | ❌ No | ❌ No |

---

## 3. Detailed Endpoint Contract Analysis

### 3.1 Implemented & Ready Endpoints

#### EP-NUTR-005: Search Curated Food Catalog
- **Route:** `GET /api/v1/nutrition/foods/search`
- **Auth:** Bearer JWT required.
- **Query DTO (`searchFoodsQuerySchema`):**
  - `q`: string, optional (min 2 chars if provided).
  - `category`: optional `FoodCategory` (10 enum values).
  - `page`: number (default 1).
  - `limit`: number (default 20, max 50).
  - *Refine rule:* Either `q >= 2` or `category` must be supplied.
- **Response:** `PaginatedResponse<FoodItemSummaryDto>` (`{ success: true, data: [...], meta: { pagination } }`).

#### EP-NUTR-006: Get Food Item Details & Provenance
- **Route:** `GET /api/v1/nutrition/foods/:id`
- **Auth:** Bearer JWT required.
- **Param DTO (`foodIdParamSchema`):** `id` (24-character hex ObjectId).
- **Response:** `ApiResponse<FoodItemDetailDto>` with 100g macros, `standardPortions`, and complete provenance metadata.

---

### 3.2 Missing Endpoints (Designed Contracts from Architecture v1.1.0)

#### EP-NUTR-001: Daily Nutrition Diary & Totals (`GET /api/v1/nutrition/diary`)
- **Status:** **MISSING**
- **Query Parameters:** `date: string` (`YYYY-MM-DD` required), optional header `X-Timezone-Offset-Minutes`.
- **Designed Behavior:**
  - One diary document per user per local calendar date.
  - Resolves active targets via in-process `usersService.getProfileSnapshot(userId)` (Acyclic dependency).
  - Empty day behavior: HTTP 200 with all 4 slots empty (`items: []`, 0 consumed totals), and remaining budget equal to full targets.
  - Response Shape:
    ```typescript
    {
      success: true,
      data: {
        date: string; // YYYY-MM-DD
        dailyTargets: { calories: number; proteinGrams: number; carbsGrams: number; fatGrams: number; isEstimated: true; isTargetsCustomized: boolean };
        consumedTotals: { calories: number; proteinGrams: number; carbsGrams: number; fatGrams: number; isEstimated: true };
        remainingBudget: { calories: number; proteinGrams: number; carbsGrams: number; fatGrams: number };
        progressPercentage: number;
        slots: {
          breakfast: MealSlotSubtotalDto;
          lunch: MealSlotSubtotalDto;
          dinner: MealSlotSubtotalDto;
          snack: MealSlotSubtotalDto;
        }
      }
    }
    ```

#### EP-NUTR-002: Quick-Add Manual Meal Entry (`POST /api/v1/nutrition/meals/quick-add`)
- **Status:** **MISSING**
- **Purpose:** Direct manual entry of calories/macros without catalog referencing.
- **Request Body Schema:**
  ```typescript
  {
    date: string; // YYYY-MM-DD
    slot: 'breakfast' | 'lunch' | 'dinner' | 'snack';
    nameEn?: string; // default: "Quick Add"
    nameAr?: string; // default: "إضافة سريعة"
    calories: number; // integer [0, 10000]
    proteinGrams?: number; // [0, 1000], default 0
    carbsGrams?: number; // [0, 1000], default 0
    fatGrams?: number; // [0, 1000], default 0
    servingWeightGrams?: number; // [0, 10000], default 0
  }
  ```
- **Response:** `201 Created` with created `logId` and generated `itemId`.

#### EP-NUTR-003: Log Food Item from Catalog (`POST /api/v1/nutrition/meals/item`)
- **Status:** **MISSING**
- **Server-Side Authoritative Calculation:** Server reads reference macros from `food_library` and scales them. Client cannot submit custom macros.
- **Request Body Schema:**
  ```typescript
  {
    date: string; // YYYY-MM-DD
    slot: 'breakfast' | 'lunch' | 'dinner' | 'snack';
    foodId: string; // 24-character hex ObjectId
    portionId?: string; // standard portion ID
    servingQuantity: number; // float > 0 and <= 5000 (e.g. 1.0)
    customGrams?: number; // optional explicit gram override (e.g. 250.0)
  }
  ```
- **Response:** `201 Created` with logged snapshot, including calculated calories, protein, carbs, fat, fiber, and immutable copy of item names.

#### EP-NUTR-004: Remove Logged Meal Item (`DELETE /api/v1/nutrition/meals/:logId/items/:itemId`)
- **Status:** **MISSING**
- **Path Parameters:** `logId` (24-hex ObjectId) and `itemId` (string).
- **Security Check:** BOLA protection — returns 404 if `logId` does not belong to `req.user.id` or if `itemId` is not present in the document.
- **Response:** `200 OK` (`{ success: true, data: { message: "Meal item removed successfully." } }`).

#### EP-NUTR-007: Edit Logged Meal Item (`PATCH /api/v1/nutrition/meals/:logId/items/:itemId`)
- **Status:** **MISSING**
- **Request Body Schema:** Allows updating `servingQuantity`, `portionId`, `customGrams`, or moving the item to a different `targetSlot`.
- **Response:** `200 OK` with recalculated item values and updated slot totals.

#### EP-NUTR-008: Daily Nutrition Summary Snapshot (`GET /api/v1/nutrition/summary`)
- **Status:** **MISSING**
- **Query Parameters:** `date: string` (`YYYY-MM-DD`).
- **Response:** Lightweight daily totals without slot breakdown (designed for AI Coach context and dashboard cards).

---

## 4. Backend Implementation Gaps

To implement the missing endpoints, the following backend components must be created or updated:

1. **Mongoose Model (`src/modules/nutrition/models/nutritionLog.model.ts`):**
   - Collection name: `nutrition_logs`.
   - Compound unique index: `{ userId: 1, date: 1 }` (guarantees exactly one document per user per day).
   - Embedded subdocument schema for `items` and `slots`.
2. **DTOs (`src/modules/nutrition/dto/nutrition.dto.ts`):**
   - `getDiaryQuerySchema`, `quickAddMealSchema`, `logCatalogItemSchema`, `editMealItemSchema`, `mealItemParamsSchema`.
3. **Repository Methods (`src/modules/nutrition/nutrition.repository.ts`):**
   - `findOrCreateDiary(userId, date, timezoneOffset)`
   - `addItemToMealSlot(userId, date, slot, itemData)`
   - `removeItemFromMeal(userId, logId, itemId)`
   - `updateMealItem(userId, logId, itemId, updates)`
   - `findSummaryByDate(userId, date)`
4. **Service Integration (`src/modules/nutrition/nutrition.service.ts`):**
   - Connect to `nutrition.calculator.ts` (`scaleNutrients`, `aggregateNutritionItems`, `calculateRemainingBudget`).
   - Connect to `usersService.getProfileSnapshot(userId)` for dynamic energy targets.
5. **Controller & Route Mounting (`nutrition.controller.ts` & `nutrition.routes.ts`):**
   - Handlers for `getDiary`, `quickAdd`, `logItem`, `deleteItem`, `editItem`, and `getSummary`.

---

## 5. Frontend Readiness & Contract Mismatches

Inspection of `frontend/src/` revealed several architectural gaps and contract mismatches:

### 5.1 Current Add-to-Meal Behavior
- In [`frontend/src/app/nutrition/page.tsx`](file:///d:/2026/Personal%20Fitness%20&%20AI%20Coach%20Platform/FitMate-AI/frontend/src/app/nutrition/page.tsx#L140-L190):
  - Clicking "Add to Meal" in `FoodDetailModal` triggers `handleAddFoodToMeal`.
  - This function calculates scaling in React memory, generates a temporary timestamp ID (`item_${Date.now()}`), and prepends the item to local React state (`diary`).
  - **No network request is dispatched.** State is purely ephemeral and lost on refresh.

### 5.2 Contract Shape Mismatches
1. **Diary Top-Level Envelopes:**
   - Frontend `DailyNutritionSummary` uses flat properties: `caloriesConsumed`, `remainingCalories`, `proteinTargetGrams`, `proteinConsumedGrams`.
   - Backend EP-NUTR-001 contract uses nested objects: `dailyTargets: { calories, ... }`, `consumedTotals: { calories, ... }`, and `remainingBudget: { calories, ... }`.
2. **Logged Item Identifier:**
   - Frontend types expect `id` and `foodItemId`.
   - Backend contract uses `itemId` (unique item UUID) and `logId` (parent MongoDB diary document ID required for DELETE/PATCH).
3. **Slot Subtotals:**
   - Frontend slot model: `MealSlotData` (`calories`, `proteinGrams`, `carbsGrams`, `fatGrams`).
   - Backend slot model: `slotTotalCalories`, `slotTotalProtein`, `slotTotalCarbs`, `slotTotalFat`.

### 5.3 Missing UI Capabilities
- **Date Switcher:** No calendar picker or previous/next day navigation exists in `page.tsx`. Current load hardcodes `'2026-11-02'`.
- **Edit & Delete Actions:** [`MealSlotSection.tsx`](file:///d:/2026/Personal%20Fitness%20&%20AI%20Coach%20Platform/FitMate-AI/frontend/src/features/nutrition/MealSlotSection.tsx) displays items but has no delete (trash icon) or edit buttons.
- **Quick-Add Modal:** No UI form exists for uncatalogued manual entries (EP-NUTR-002).

---

## 6. Files Inspected

### Backend Files
- `src/modules/nutrition/nutrition.routes.ts`
- `src/modules/nutrition/nutrition.controller.ts`
- `src/modules/nutrition/nutrition.service.ts`
- `src/modules/nutrition/nutrition.repository.ts`
- `src/modules/nutrition/dto/nutrition.dto.ts`
- `src/modules/nutrition/models/foodItem.model.ts`
- `src/modules/nutrition/services/nutrition.calculator.ts`
- `src/modules/nutrition/domain/energyCalculator.ts`
- `src/modules/users/users.service.ts`
- `tests/integration/foodCatalog.api.test.ts`
- `docs/architecture/NUTRITION_API_CONTRACTS.md`
- `docs/architecture/database/NUTRITION_DATABASE_SCHEMA.md`
- `docs/architecture/NUTRITION_IMPLEMENTATION_PLAN.md`
- `docs/implementation/PHASE_5_2_2_2_1_FINAL_AUDIT.md`

### Frontend Files
- `frontend/src/features/nutrition/FoodDetailModal.tsx`
- `frontend/src/features/nutrition/MealSlotSection.tsx`
- `frontend/src/features/nutrition/FoodResultCard.tsx`
- `frontend/src/features/nutrition/FoodSearchBox.tsx`
- `frontend/src/app/nutrition/page.tsx`
- `frontend/src/lib/api/nutrition.adapter.ts`
- `frontend/src/lib/nutrition/servingCalculator.ts`
- `frontend/src/types/nutrition.types.ts`
- `frontend/src/lib/i18n/translations.ts`
- `frontend/tests/FoodDetailsServingCalculator.test.tsx`
- `frontend/tests/FoodSearchIntegration.test.tsx`

---

## 7. Git & Scope Integrity

Inspection commands were executed to verify zero code mutation during this discovery turn:
- `git status --short`: Only pre-existing FE 3.2 documentation and untracked report files.
- `git diff --stat -- src/ tests/`: **0 files changed, 0 additions, 0 deletions** (Backend is 100% untouched).
- `git diff --stat -- frontend/`: **0 lines modified** during this turn.

---

## 8. Final Recommendation & Implementation Roadmap

| Milestone | Scope | Prerequisites | Status |
|-----------|-------|:-------------:|:------:|
| **BE Phase 5.2 (Milestones 3–5)** | Implement `nutrition_logs` model, repository, service, DTOs, and Express routes for diary, quick-add, catalog meal log, delete, edit, and summary. | Backend Milestone 2 (Complete) | **RECOMMENDED NEXT STEP** |
| **FE 3.3.1 (Type & Adapter Alignment)** | Update frontend `nutrition.types.ts` and `nutrition.adapter.ts` to match EP-NUTR-001 through 008 contracts. | Backend Contract Finalized | Awaiting BE implementation |
| **FE 3.3.2 (UI Integration)** | Connect `FoodDetailModal` to `POST /meals/item`, implement Quick-Add modal, add item deletion/editing in `MealSlotSection`, and add calendar date switcher. | FE 3.3.1 | Awaiting BE implementation |

---

**STOP CONDITION MET:** Discovery report completed. No code changes implemented. Awaiting human review and decision on backend implementation sequencing.

