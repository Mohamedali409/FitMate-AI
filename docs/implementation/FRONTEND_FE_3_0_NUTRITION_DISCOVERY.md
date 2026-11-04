# FitMate AI — Phase FE 3.0: Nutrition API Integration Discovery & Architecture Plan

**Document Version:** 1.0.0  
**Phase:** FE 3.0 — Nutrition API Integration Foundation  
**Mode:** READ-ONLY DISCOVERY & IMPLEMENTATION PLANNING  
**Date:** November 3, 2026  
**Auditor / Author:** Senior Frontend Architect, Backend Integration Engineer & API Contract Analyst  
**Repository:** `FitMate-AI`  
**Target Milestone Deliverable:** `docs/implementation/FRONTEND_FE_3_0_NUTRITION_DISCOVERY.md`

---

## 1. Executive Summary

Phase FE 2.1 successfully remediated all authentication, token isolation, and route-guarding vulnerabilities with an **APPROVED** independent audit verdict. With a secure in-memory authentication foundation in place, the application is positioned to transition the Nutrition subsystem from an isolated UI preview into a fully integrated feature connected to the FitMate AI backend.

This document presents the **comprehensive discovery and architecture foundation (FE 3.0)**. It details:
1. **Actual Backend State:** Only **2 of 8** documented nutrition endpoints are currently implemented on the backend (`EP-NUTR-005` Search and `EP-NUTR-006` Food Details). Daily diary persistence and meal logging (`EP-NUTR-001` through `EP-NUTR-004`, `EP-NUTR-007`, `EP-NUTR-008`) represent planned backend Milestones 3–5.
2. **Critical Contract Mismatch:** The frontend currently defines 10 food categories (`egyptian_dishes`, `poultry_meat`, etc.) that **do not match** the backend's 10 schema categories (`protein`, `middle_eastern_dishes`, etc.). Calling the real search API with frontend category keys results in HTTP `400 VALIDATION_ERROR`.
3. **Refine Query Rule:** The backend search endpoint strictly requires either `q` ($\ge 2$ characters) OR a valid `category`. Unfiltered queries (`limit=6`) trigger an immediate HTTP `400`.
4. **Token Transmission Gap:** The frontend `NutritionPage` currently invokes nutrition adapter methods without passing the authentication Bearer token, which would lead to initial `401 UNAUTHORIZED` roundtrips against the real backend.
5. **Implementation Roadmap:** A 5-stage phased roadmap (FE 3.1 through FE 3.5) structured to deliver catalog search and food details immediately against live backend endpoints, while preparing robust client architecture for live diary integration.

---

## 2. Actual Backend Nutrition Endpoint Inventory

Inspection of `src/modules/nutrition/nutrition.routes.ts` (lines 10–28), `nutrition.controller.ts` (lines 6–53), `nutrition.service.ts` (lines 10–114), and `dto/nutrition.dto.ts` (lines 11–121) reveals the following active endpoints:

```
[src/app.ts:53] -> Mounted at: /api/v1/nutrition
```

### 2.1 Implemented & Tested Endpoints

#### Endpoint 1: EP-NUTR-005 — Search Curated Food Catalog
- **HTTP Method:** `GET`
- **Exact URL:** `/api/v1/nutrition/foods/search`
- **Controller Action:** `nutritionController.searchFoods` ([nutrition.controller.ts:13-30](file:///d:/2026/Personal%20Fitness%20&%20AI%20Coach%20Platform/FitMate-AI/src/modules/nutrition/nutrition.controller.ts#L13-L30))
- **Authentication:** Bearer JWT required (`authMiddleware`). Rejects missing/malformed tokens with `401 UNAUTHORIZED`.
- **Rate Limiting:** `searchRateLimiter` (60 requests / 1 minute per IP/user).
- **Query Parameters (Zod Schema `searchFoodsQuerySchema`):**
  - `q`: `string` (optional, trimmed, max 100 chars, min 2 chars if no category).
  - `category`: `enum` (optional, must match one of 10 `FOOD_CATEGORIES`).
  - `page`: `integer` (optional, min 1, default 1).
  - `limit`: `integer` (optional, min 1, max 50, default 20).
  - **Zod Refine Constraint:** `(q && q.length >= 2) || Boolean(category)`. If neither is present, rejects with:
    `"Either search query 'q' (min 2 characters) or 'category' must be provided"`.
- **Response Status:** `200 OK`
- **Response Envelope:** `PaginatedResponse<FoodItemSummaryDto>`
  ```json
  {
    "success": true,
    "data": [
      {
        "id": "654321000000000000000001",
        "catalogId": "food_eg_koshari_001",
        "nameEn": "Egyptian Koshari",
        "nameAr": "كشري مصري",
        "category": "middle_eastern_dishes",
        "servingSizeGrams": 100,
        "caloriesPer100g": 165,
        "proteinPer100g": 5.8,
        "carbsPer100g": 31.2,
        "fatPer100g": 1.8,
        "confidenceLevel": "high",
        "isVerified": true,
        "isEstimated": true,
        "defaultPortion": {
          "portionId": "p_koshari_med",
          "unitNameEn": "Medium Bowl",
          "unitNameAr": "طبق متوسط",
          "gramWeight": 350
        }
      }
    ],
    "meta": {
      "pagination": {
        "page": 1,
        "limit": 20,
        "totalItems": 58,
        "totalPages": 3,
        "hasNextPage": true,
        "hasPrevPage": false
      }
    }
  }
  ```
- **Error Codes:**
  - `400 VALIDATION_ERROR` (Empty query without category, `q < 2`, invalid category enum, `limit > 50`)
  - `401 UNAUTHORIZED` (Missing, expired, or invalid token)
  - `429 TOO_MANY_REQUESTS` (Exceeded 60 req/min)
- **Automated Tests:** 13 integration tests in [`tests/integration/foodCatalog.api.test.ts`](file:///d:/2026/Personal%20Fitness%20&%20AI%20Coach%20Platform/FitMate-AI/tests/integration/foodCatalog.api.test.ts#L40-L230).

---

#### Endpoint 2: EP-NUTR-006 — Get Food Item Details & Provenance
- **HTTP Method:** `GET`
- **Exact URL:** `/api/v1/nutrition/foods/:id`
- **Controller Action:** `nutritionController.getFoodById` ([nutrition.controller.ts:36-50](file:///d:/2026/Personal%20Fitness%20&%20AI%20Coach%20Platform/FitMate-AI/src/modules/nutrition/nutrition.controller.ts#L36-L50))
- **Authentication:** Bearer JWT required (`authMiddleware`).
- **Path Parameters (Zod Schema `foodIdParamSchema`):**
  - `id`: `string` (Must be a 24-character hexadecimal MongoDB ObjectId: `/^[0-9a-fA-F]{24}$/`).
- **Response Status:** `200 OK`
- **Response Envelope:** `ApiResponse<FoodItemDetailDto>`
  ```json
  {
    "success": true,
    "data": {
      "id": "654321000000000000000001",
      "catalogId": "food_eg_koshari_001",
      "nameEn": "Egyptian Koshari",
      "nameAr": "كشري مصري",
      "category": "middle_eastern_dishes",
      "servingSizeGrams": 100,
      "caloriesPer100g": 165,
      "proteinPer100g": 5.8,
      "carbsPer100g": 31.2,
      "fatPer100g": 1.8,
      "fiberPer100g": 3.5,
      "standardPortions": [
        {
          "portionId": "p_koshari_med",
          "unitNameEn": "Medium Bowl",
          "unitNameAr": "طبق متوسط",
          "gramWeight": 350,
          "isDefault": true
        }
      ],
      "provenance": {
        "sourceOrganization": "National Nutrition Institute (NNI) Egypt",
        "sourceDataset": "Egyptian Food Composition Tables",
        "sourceRecordId": null,
        "reviewDate": "2026-01-15",
        "preparationState": "Cooked with lentils, rice, pasta and tomato sauce",
        "preparationAssumptions": null,
        "confidenceLevel": "high",
        "isVerified": true,
        "isEstimated": true
      }
    }
  }
  ```
- **Error Codes:**
  - `400 VALIDATION_ERROR` (Invalid ObjectId format)
  - `401 UNAUTHORIZED` (Missing/invalid token)
  - `404 NOT_FOUND` (`RESOURCE_NOT_FOUND` — Food item does not exist or `isArchived: true`)
- **Automated Tests:** 5 integration tests in [`tests/integration/foodCatalog.api.test.ts`](file:///d:/2026/Personal%20Fitness%20&%20AI%20Coach%20Platform/FitMate-AI/tests/integration/foodCatalog.api.test.ts#L235-L330).

---

### 2.2 Endpoint Classification Status

| Endpoint ID | Route Path | Method | Classification | Description |
| :--- | :--- | :---: | :--- | :--- |
| **EP-NUTR-001** | `/api/v1/nutrition/diary` | `GET` | **Documented, Not Implemented** | Daily 4-slot diary & totals. Scheduled for Backend Milestone 3–5. |
| **EP-NUTR-002** | `/api/v1/nutrition/meals/quick-add` | `POST` | **Documented, Not Implemented** | Quick-add uncatalogued calories/macros. |
| **EP-NUTR-003** | `/api/v1/nutrition/meals/item` | `POST` | **Documented, Not Implemented** | Log catalog food scaled by portion/custom grams. |
| **EP-NUTR-004** | `/api/v1/nutrition/meals/:logId/items/:itemId` | `DELETE` | **Documented, Not Implemented** | Remove individual logged food entry. |
| **EP-NUTR-005** | `/api/v1/nutrition/foods/search` | `GET` | **Implemented & Tested** | Bilingual curated food catalog search. |
| **EP-NUTR-006** | `/api/v1/nutrition/foods/:id` | `GET` | **Implemented & Tested** | Food details, standard portions & laboratory provenance. |
| **EP-NUTR-007** | `/api/v1/nutrition/meals/:logId/items/:itemId` | `PATCH` | **Documented, Not Implemented** | Edit portion/weight/slot of logged food. |
| **EP-NUTR-008** | `/api/v1/nutrition/summary` | `GET` | **Documented, Not Implemented** | Lightweight daily totals summary. |
| — | `/api/v1/nutrition/foods/custom` | `POST` | **Planned Future (Post-MVP)** | Custom food creation (deferred per DEC-010). |
| — | `/api/v1/nutrition/foods/barcode/:code` | `GET` | **Planned Future (Phase 5.6)** | External barcode scanner lookup. |

---

## 3. Verified API Contracts & Mismatch Analysis

Comparing `docs/architecture/NUTRITION_API_CONTRACTS.md`, the actual backend codebase, and the frontend reveals five (5) critical discrepancies:

### Mismatch 1: Food Categories Enum Mismatch [Severity: High]
- **Backend Definition** ([`src/modules/nutrition/models/foodItem.model.ts:4-14`](file:///d:/2026/Personal%20Fitness%20&%20AI%20Coach%20Platform/FitMate-AI/src/modules/nutrition/models/foodItem.model.ts#L4-L14)):
  ```typescript
  export type FoodCategory =
    | 'protein'
    | 'carbohydrates'
    | 'legumes'
    | 'dairy_eggs'
    | 'vegetables'
    | 'fruits'
    | 'fats_oils'
    | 'middle_eastern_dishes'
    | 'baked_goods'
    | 'beverages_snacks';
  ```
- **Frontend Current Type** ([`frontend/src/types/nutrition.types.ts:6-16`](file:///d:/2026/Personal%20Fitness%20&%20AI%20Coach%20Platform/FitMate-AI/frontend/src/types/nutrition.types.ts#L6-L16)):
  ```typescript
  export type FoodCategory =
    | 'egyptian_dishes'
    | 'middle_eastern'
    | 'poultry_meat'
    | 'fish_seafood'
    | 'grains_breads'
    | 'dairy_eggs'
    | 'fruits_vegetables'
    | 'legumes_nuts'
    | 'beverages'
    | 'snacks_sweets';
  ```
- **Consequence:** 9 of 10 category values fail backend Zod validation. Sending `category=egyptian_dishes` returns `400 VALIDATION_ERROR`.
- **Remediation Required:** Align `frontend/src/types/nutrition.types.ts`, `FoodSearchBox.tsx`, and translation dictionaries to the authoritative 10 backend categories.

---

### Mismatch 2: Search Query Validation Rules [Severity: Medium]
- **Backend Behavior** ([`src/modules/nutrition/dto/nutrition.dto.ts:35-45`](file:///d:/2026/Personal%20Fitness%20&%20AI%20Coach%20Platform/FitMate-AI/src/modules/nutrition/dto/nutrition.dto.ts#L35-L45)):
  A search query requires either `q.length >= 2` OR a defined `category`.
- **Frontend Current Call** ([`frontend/src/app/nutrition/page.tsx:44`](file:///d:/2026/Personal%20Fitness%20&%20AI%20Coach%20Platform/FitMate-AI/frontend/src/app/nutrition/page.tsx#L44)):
  ```typescript
  const catalog = await adapter.searchFoods({ limit: 6 });
  ```
- **Consequence:** Calling `searchFoods({ limit: 6 })` without `q` or `category` returns HTTP `400`.
- **Remediation Required:** Preload the catalog using a default category (e.g. `category: 'middle_eastern_dishes'`) or guard the search invocation until the user inputs $\ge 2$ characters.

---

### Mismatch 3: Missing Backend Endpoint `/nutrition/summary` [Severity: Medium]
- **Frontend Assumption** ([`frontend/src/lib/api/nutrition.adapter.ts:205`](file:///d:/2026/Personal%20Fitness%20&%20AI%20Coach%20Platform/FitMate-AI/frontend/src/lib/api/nutrition.adapter.ts#L205)):
  `RealNutritionAdapter.getDailySummary()` calls `apiClient.get('/nutrition/summary', { params: { date } })`.
- **Backend State:** The route `/nutrition/summary` does not exist in `src/modules/nutrition/nutrition.routes.ts`.
- **Consequence:** Switching `NEXT_PUBLIC_USE_MOCKS=false` crashes the dashboard or nutrition summary with a `404 NOT_FOUND` error.
- **Remediation Required:** For FE 3, until backend Milestone 3/4 lands, the dashboard and diary summary must either consume user targets via `users/profile` (`EP-USER-001`) or maintain mock adapter isolation for unbuilt endpoints without crashing catalog search.

---

### Mismatch 4: ID vs CatalogId Parameter Contract [Severity: Low]
- **Backend Parameter:** `GET /foods/:id` enforces that `:id` is a 24-character hexadecimal MongoDB ObjectId.
- **Frontend Food Model:** Contains both `id` (`_id.toString()`) and `catalogId` (e.g. `'food_eg_koshari_001'`).
- **Remediation Required:** Ensure `getFoodById` is strictly invoked using `summary.id` and never `summary.catalogId`.

---

### Mismatch 5: Meal Slot Naming Alignment [Severity: None — Aligned]
- Both backend (`services/nutrition.calculator.ts:14`) and frontend (`types/nutrition.types.ts:78`) use the exact singular enum:
  `'breakfast' | 'lunch' | 'dinner' | 'snack'`

---

## 4. Frontend Nutrition Inventory & Current State

| Component / File | Purpose | Current Implementation | Target Backend Endpoint | Status |
| :--- | :--- | :--- | :--- | :--- |
| `frontend/src/app/nutrition/page.tsx` | Main Nutrition Screen | Local React state for diary; hardcoded date `'2026-11-02'`; unauthenticated adapter calls. | `EP-NUTR-001`<br>`EP-NUTR-005` | **Partially Functional (Preview)** |
| `frontend/src/features/nutrition/FoodSearchBox.tsx` | Search Input & Category Pills | Form submit + category click; mismatched categories; lacks debouncing. | `EP-NUTR-005` | **Needs Schema Alignment & Debounce** |
| `frontend/src/features/nutrition/FoodResultCard.tsx` | Search Result Item Card | Displays name, 100g macros, confidence badge, click-to-detail. | `EP-NUTR-005` | **Ready for Real Data** |
| `frontend/src/features/nutrition/FoodDetailModal.tsx` | Portions & Provenance Modal | Portion selector (`standardPortions`), custom grams, local scale calculation. | `EP-NUTR-006` | **Ready for Real Data** |
| `frontend/src/features/nutrition/MealSlotSection.tsx` | 4-Slot Meal Cards | Renders items in slot; calculates local subtotals; no delete/edit buttons. | `EP-NUTR-001`<br>`EP-NUTR-003`<br>`EP-NUTR-004` | **UI Placeholder (No Mutation)** |
| `frontend/src/features/dashboard/CalorieSummaryCard.tsx` | Daily Calorie Progress Ring | Consumes `DailyNutritionSummary` from adapter. | `EP-NUTR-008` | **UI Ready, Awaiting Backend Diary** |
| `frontend/src/features/dashboard/MacroProgressCard.tsx` | Protein/Carb/Fat Progress Bars | Consumes `DailyNutritionSummary` from adapter. | `EP-NUTR-008` | **UI Ready, Awaiting Backend Diary** |
| `frontend/src/lib/api/nutrition.adapter.ts` | Real & Mock Adapters | `RealNutritionAdapter` calls `/nutrition/foods/search`, `/nutrition/foods/:id`, `/nutrition/summary`. | `EP-NUTR-005`<br>`EP-NUTR-006`<br>`EP-NUTR-008` | **Search/Detail Live; Summary 404** |
| `frontend/src/types/nutrition.types.ts` | Nutrition TypeScript Types | Defines food, slot, and summary types. | All EP-NUTR | **Category Enum Discrepancy** |
| `frontend/src/lib/i18n/translations.ts` | AR/EN Localization | Translations for UI and old categories. | N/A | **Update 10 Categories in AR/EN** |

---

## 5. Authentication & Security Integration

1. **Bearer Token Transmission:**
   - In `frontend/src/app/nutrition/page.tsx`, adapter calls (`adapter.searchFoods(...)`, `adapter.getFoodById(...)`) currently omit the Bearer token.
   - While `ApiClient` intercepts `401 UNAUTHORIZED` and triggers silent refresh, sending initial requests without the token creates avoidable latency and server log noise.
   - **Resolution:** Components should retrieve `token` from `useAuth()` and provide it to adapter calls, or the adapter should integrate with an authenticated client instance.

2. **BOLA / IDOR Protection:**
   - Catalog endpoints (`/foods/search` and `/foods/:id`) are public curated read-only datasets; any authenticated user can query them.
   - For future meal logging endpoints (`/nutrition/meals/...`), all queries and mutations are scoped strictly to `req.user.id` on the server. Foreign resource access returns `404 NOT_FOUND` to prevent identifier scanning.

3. **Rate Limiting Resilience:**
   - Backend enforces `searchRateLimiter` (60 req/min).
   - If the frontend fires requests on every keystroke, users will quickly trigger HTTP `429 TOO_MANY_REQUESTS`.
   - **Resolution:** A client-side debounce of **300ms** and minimum length guard ($q \ge 2$) must be enforced.

4. **Token Security Invariants:**
   - Auth tokens remain strictly in-memory (`useRef`). No tokens in `localStorage` or `sessionStorage`.
   - Error messages from failed nutrition searches must never log auth tokens.

---

## 6. Nutrition Domain & UX Decisions

### A. Food Catalog
- **Bilingual Search:** Search matches English prefix/keywords and Arabic normalized tokens (handles Tashkeel `كُشَرِيّ`, Alef variants `أرز / ارز`, and Taa Marbuta `طعمية / طعميه`).
- **Category Browsing:** 10 authoritative categories. Selecting a category pill executes `searchFoods({ category: key })`.
- **Search Debouncing:** 300ms delay on text input; minimum 2 characters required before firing search without category.
- **Incremental Loading:** Utilize `meta.pagination` (`page`, `limit`, `hasNextPage`) for pagination or "Load More".

### B. Food Serving & Scaling
- **Portion Selection:** Standard portions from backend (`p.unitNameEn`, `p.unitNameAr`, `p.gramWeight`) + "Custom Grams" option.
- **Arithmetic Precision Rules:**
  - `scale = grams / 100`
  - `calories = Math.round(caloriesPer100g * scale)` (Integer)
  - `proteinGrams = Math.round(proteinPer100g * scale * 10) / 10` (1 Decimal place)
  - `carbsGrams = Math.round(carbsPer100g * scale * 10) / 10` (1 Decimal place)
  - `fatGrams = Math.round(fatPer100g * scale * 10) / 10` (1 Decimal place)
  - Must strictly match backend `services/nutrition.calculator.ts` precision tiers.

### C. Nutrition Diary
- 4 meal slots: `breakfast`, `lunch`, `dinner`, `snack`.
- In FE 3, until backend Milestones 3–5 land, meal adding in the UI will update local preview state while the live catalog search connects to the real backend.

### D. Daily Summary & Targets
- When user is logged in, profile targets (`dailyCalorieTarget`, `proteinTargetGrams`, etc.) are retrieved from `AuthContext.profile` (hydrated via `GET /api/v1/users/profile`).
- Core Invariant 2: Always display `isEstimated: true` disclaimer badge on all cards.

### E. Date and Time Handling (Avoiding UTC Date Shift)
- **Problem:** `new Date().toISOString().split('T')[0]` converts to UTC. In Egypt (UTC+2 or UTC+3 daylight saving), an athlete logging food at 1:00 AM local time would produce yesterday's UTC date!
- **Solution:** Implement a dedicated local date helper:
  ```typescript
  export function formatLocalDate(date: Date = new Date()): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
  ```
- Send timezone offset header: `X-Timezone-Offset-Minutes: new Date().getTimezoneOffset()`.

### F. Localization
- **RTL / LTR:** UI layout flips dynamically based on `LanguageContext`.
- **Food Data:** Display `nameAr` / `unitNameAr` in Arabic mode; `nameEn` / `unitNameEn` in English mode.
- **Category Translations:** Provide updated translations for all 10 schema categories in `translations.ts`.

---

## 7. Proposed Frontend Architecture

```
frontend/src/
├── features/nutrition/
│   ├── hooks/
│   │   └── useFoodSearch.ts            # Debounced catalog search hook with pagination & category filter
│   ├── FoodSearchBox.tsx               # Aligned categories + search input + debouncing
│   ├── FoodResultCard.tsx              # Card displaying food item summary + portions preview
│   ├── FoodDetailModal.tsx             # Modal with portions selector, custom grams & provenance
│   └── MealSlotSection.tsx             # 4 meal slots with add/view action triggers
├── lib/
│   ├── api/
│   │   ├── client.ts                   # Centralized fetch wrapper with 401 recovery
│   │   └── nutrition.adapter.ts        # RealNutritionAdapter (live) & MockNutritionAdapter (preview)
│   ├── utils/
│   │   ├── date.ts                     # Timezone-safe local YYYY-MM-DD formatting
│   │   └── nutritionCalc.ts            # Client-side scaling math strictly matching backend precision
│   └── i18n/
│       └── translations.ts             # Aligned 10 category translations in AR & EN
└── types/
    └── nutrition.types.ts              # Aligned with backend IFoodItem and DTOs
```

### Architecture Principles:
1. **Zero New External Dependencies:** Utilize native React hooks (`useState`, `useEffect`, `useCallback`) and existing project utilities without adding bloated third-party query libraries.
2. **Adapter Boundary Isolation:** `RealNutritionAdapter` connects to live backend endpoints (`EP-NUTR-005`, `EP-NUTR-006`); `MockNutritionAdapter` provides seamless preview behavior for unbuilt endpoints without contaminating production code.
3. **Layered Responsibility:** UI components consume clean custom hooks (`useFoodSearch`); hooks interact with the adapter; the adapter speaks through `ApiClient`.

---

## 8. Milestone Implementation Plan

```mermaid
flowchart LR
    FE30["FE 3.0: Discovery & Planning"] --> FE31["FE 3.1: Catalog & Search Integration"]
    FE31 --> FE32["FE 3.2: Food Details & Serving Calculator"]
    FE32 --> FE33["FE 3.3: Nutrition Diary & State Architecture"]
    FE33 --> FE34["FE 3.4: Daily Summary & Date Navigation"]
    FE34 --> FE35["FE 3.5: Responsive UX & Final Quality Audit"]
```

---

### Milestone FE 3.1 — Food Catalog & Search Integration
- **Objective:** Connect the frontend food search and category browsing UI directly to the real backend `GET /api/v1/nutrition/foods/search` endpoint.
- **Backend Dependencies:** `EP-NUTR-005` (Available & Tested).
- **Files Expected to Change:**
  - `frontend/src/types/nutrition.types.ts` (Align 10 `FoodCategory` items with backend).
  - `frontend/src/lib/i18n/translations.ts` (Update category labels in AR and EN).
  - `frontend/src/features/nutrition/FoodSearchBox.tsx` (Use aligned categories; add debounced query).
  - `frontend/src/app/nutrition/page.tsx` (Preload catalog with default category; pass token to adapter).
  - `frontend/src/lib/api/nutrition.adapter.ts` (Ensure `RealNutritionAdapter` passes params correctly).
- **Acceptance Criteria:**
  - User typing "koshari" or "كشري" returns real items from the seeded database.
  - Clicking category pills filters items by real backend categories without 400 validation errors.
  - Debounce timer prevents rapid API spamming.
  - No-results empty state renders cleanly in Arabic and English.
- **Tests to Add:**
  - Unit tests for category enum and translation keys.
  - Component tests for debounced search dispatching.
  - Integration tests verifying real API parameter formatting.
- **Definition of Done:** Search functions against live backend in production mode (`NEXT_PUBLIC_USE_MOCKS=false`) with 0 errors.

---

### Milestone FE 3.2 — Food Details & Serving Calculator
- **Objective:** Connect food details and portion selection to backend `GET /api/v1/nutrition/foods/:id`.
- **Backend Dependencies:** `EP-NUTR-006` (Available & Tested).
- **Files Expected to Change:**
  - `frontend/src/features/nutrition/FoodDetailModal.tsx` (Display laboratory provenance & portions).
  - `frontend/src/lib/utils/nutritionCalc.ts` (Shared scaling calculator utility).
  - `frontend/src/app/nutrition/page.tsx` (Fetch details via item `id`).
- **Acceptance Criteria:**
  - Clicking a search result card opens the modal populated with real backend portion options and laboratory provenance (e.g. NNI Egypt / USDA).
  - Selecting standard portion or typing custom grams updates calories and macros using integer and 1-decimal rounding rules.
  - Core Invariant 2 badge (`isEstimated: true`) is prominently visible.
- **Tests to Add:**
  - Unit tests verifying arithmetic scaling matches backend precision rules.
  - Component tests for portion selection and custom gram calculations.
- **Definition of Done:** Real food details and provenance render reliably on click.

---

### Milestone FE 3.3 — Nutrition Diary & State Architecture
- **Objective:** Establish the client-side state architecture for the 4-slot diary (`breakfast`, `lunch`, `dinner`, `snack`) prepared for backend Milestone 3–5 delivery.
- **Backend Dependencies:** Backend Milestones 3 & 4 (`EP-NUTR-001`, `EP-NUTR-003`, `EP-NUTR-004`).
- **Files Expected to Change:**
  - `frontend/src/features/nutrition/MealSlotSection.tsx` (Add delete/edit actions and item list enhancements).
  - `frontend/src/lib/api/nutrition.adapter.ts` (Contract preparation for `addFoodToMeal`, `removeFoodFromMeal`).
- **Acceptance Criteria:**
  - Logging an item adds it to the designated meal slot with an immutable nutritional snapshot.
  - Removing an item updates slot subtotals.
  - Graceful fallback: If backend diary endpoints are not yet deployed, UI maintains preview state with transparent notification.
- **Tests to Add:**
  - Diary state reducer / hook tests.
  - Slot accumulation tests.

---

### Milestone FE 3.4 — Daily Summary & Date Navigation
- **Objective:** Implement local date navigation and integrate user profile calorie/macro targets into daily budget cards.
- **Backend Dependencies:** `EP-USER-001` (Available & Tested) for user targets; `EP-NUTR-001` for diary totals.
- **Files Expected to Change:**
  - `frontend/src/lib/utils/date.ts` (Local timezone-safe date utilities).
  - `frontend/src/features/dashboard/CalorieSummaryCard.tsx` (Dynamic target display).
  - `frontend/src/features/dashboard/MacroProgressCard.tsx` (Dynamic macro budget bars).
  - `frontend/src/app/nutrition/page.tsx` (Date picker / previous-next day controls).
- **Acceptance Criteria:**
  - Changing dates navigates without UTC slippage across all timezones.
  - Remaining calories and macros calculate dynamically against user profile targets.
  - Empty days show 0 consumed with full remaining target budgets.
- **Tests to Add:**
  - Date formatting timezone tests (edge cases at 00:30 and 23:30 local time).
  - Target calculation tests.

---

### Milestone FE 3.5 — Responsive UX & Final Integration Audit
- **Objective:** Complete accessibility (ARIA), mobile bottom sheets, bilingual RTL/LTR ergonomics, and full end-to-end audit.
- **Files Expected to Change:**
  - Layout, responsive design, styling tokens, test suites.
- **Acceptance Criteria:**
  - 100% test passage across unit and integration suites.
  - Zero TypeScript or lint errors.
  - Clean Next.js production build.
  - Independent audit sign-off.

---

## 9. Risks, Dependencies & Unresolved Questions

1. **Backend Milestone 3–5 Dependency:**
   - *Risk:* The backend currently has only the catalog search (`EP-NUTR-005`) and details (`EP-NUTR-006`) endpoints implemented. Endpoints for saving meals (`EP-NUTR-003`) and fetching diary totals (`EP-NUTR-001`) are not yet implemented on the backend.
   - *Mitigation:* In FE 3.1 and FE 3.2, integrate the real food catalog search and details immediately. For FE 3.3, keep diary mutations isolated or coordinate with backend Milestone 3 implementation.
2. **Category Schema Migration in Frontend:**
   - *Risk:* Changing `FoodCategory` breaks existing mock tests if mock data still uses old category strings.
   - *Mitigation:* Update `MOCK_FOODS` in `nutrition.adapter.ts` concurrently when aligning the enum in FE 3.1.
3. **Search Rate Limiting (60 req/min):**
   - *Risk:* Fast typing without debouncing exhausts the rate limiter.
   - *Mitigation:* 300ms debounce + minimum 2-character query requirement.

---

## 10. Exact Source References

- Backend Routes: [`src/modules/nutrition/nutrition.routes.ts:1-29`](file:///d:/2026/Personal%20Fitness%20&%20AI%20Coach%20Platform/FitMate-AI/src/modules/nutrition/nutrition.routes.ts#L1-L29)
- Backend Controller: [`src/modules/nutrition/nutrition.controller.ts:1-53`](file:///d:/2026/Personal%20Fitness%20&%20AI%20Coach%20Platform/FitMate-AI/src/modules/nutrition/nutrition.controller.ts#L1-L53)
- Backend DTOs: [`src/modules/nutrition/dto/nutrition.dto.ts:1-121`](file:///d:/2026/Personal%20Fitness%20&%20AI%20Coach%20Platform/FitMate-AI/src/modules/nutrition/dto/nutrition.dto.ts#L1-L121)
- Backend Food Model & Categories: [`src/modules/nutrition/models/foodItem.model.ts:4-28`](file:///d:/2026/Personal%20Fitness%20&%20AI%20Coach%20Platform/FitMate-AI/src/modules/nutrition/models/foodItem.model.ts#L4-L28)
- Backend Service: [`src/modules/nutrition/nutrition.service.ts:1-116`](file:///d:/2026/Personal%20Fitness%20&%20AI%20Coach%20Platform/FitMate-AI/src/modules/nutrition/nutrition.service.ts#L1-L116)
- Backend Calculator: [`src/modules/nutrition/services/nutrition.calculator.ts:1-150`](file:///d:/2026/Personal%20Fitness%20&%20AI%20Coach%20Platform/FitMate-AI/src/modules/nutrition/services/nutrition.calculator.ts#L1-L150)
- Backend Tests: [`tests/integration/foodCatalog.api.test.ts:1-330`](file:///d:/2026/Personal%20Fitness%20&%20AI%20Coach%20Platform/FitMate-AI/tests/integration/foodCatalog.api.test.ts#L1-L330)
- Approved Architecture Contracts: [`docs/architecture/NUTRITION_API_CONTRACTS.md:1-471`](file:///d:/2026/Personal%20Fitness%20&%20AI%20Coach%20Platform/FitMate-AI/docs/architecture/NUTRITION_API_CONTRACTS.md#L1-L471)
- Approved Implementation Plan: [`docs/architecture/NUTRITION_IMPLEMENTATION_PLAN.md:1-233`](file:///d:/2026/Personal%20Fitness%20&%20AI%20Coach%20Platform/FitMate-AI/docs/architecture/NUTRITION_IMPLEMENTATION_PLAN.md#L1-L233)
- Frontend Types: [`frontend/src/types/nutrition.types.ts:1-123`](file:///d:/2026/Personal%20Fitness%20&%20AI%20Coach%20Platform/FitMate-AI/frontend/src/types/nutrition.types.ts#L1-L123)
- Frontend Adapter: [`frontend/src/lib/api/nutrition.adapter.ts:1-443`](file:///d:/2026/Personal%20Fitness%20&%20AI%20Coach%20Platform/FitMate-AI/frontend/src/lib/api/nutrition.adapter.ts#L1-L443)
- Frontend Page: [`frontend/src/app/nutrition/page.tsx:1-241`](file:///d:/2026/Personal%20Fitness%20&%20AI%20Coach%20Platform/FitMate-AI/frontend/src/app/nutrition/page.tsx#L1-L241)
- Frontend Search Box: [`frontend/src/features/nutrition/FoodSearchBox.tsx:1-99`](file:///d:/2026/Personal%20Fitness%20&%20AI%20Coach%20Platform/FitMate-AI/frontend/src/features/nutrition/FoodSearchBox.tsx#L1-L99)
- Frontend Modal: [`frontend/src/features/nutrition/FoodDetailModal.tsx:1-229`](file:///d:/2026/Personal%20Fitness%20&%20AI%20Coach%20Platform/FitMate-AI/frontend/src/features/nutrition/FoodDetailModal.tsx#L1-L229)

---

## 11. Sign-Off & Recommendation

The discovery phase FE 3.0 has confirmed the exact backend capabilities, identified critical contract and category mismatches, and laid out an actionable milestone roadmap.

**Recommendation:** Present this report for human review and proceed to **Milestone FE 3.1: Food Catalog & Search Integration** upon approval.

