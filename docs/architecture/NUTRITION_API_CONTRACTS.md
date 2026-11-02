# FitMate AI — Nutrition API Contracts Specification (`NutritionModule`)

**Document Version:** 1.1.0  
**Phase:** 5.2.1.1 — Nutrition Architecture Design Corrections  
**Status:** **`PROPOSED / READY FOR HUMAN REVIEW`**  
**Date:** 2026-11-02  
**Owning Module:** `NutritionModule`  
**Author:** Principal Backend Architect, API Design Specialist & Application Security Engineer  

---

## Document Revision History

| Version | Date | Author | Description of Changes |
| :---: | :---: | :--- | :--- |
| **1.0.0** | 2026-11-02 | Lead Security & API Architect | Initial baseline API contracts for Phase 5.2.1. |
| **1.1.0** | 2026-11-02 | Principal Backend Architect | **Phase 5.2.1.1 Design Corrections**: <br>1. **Custom Gram Quantity Overrides**: Explicitly supported `customGrams` in `EP-NUTR-003` and `EP-NUTR-007`. <br>2. **Data Provenance Surfacing**: Added full provenance fields to `EP-NUTR-006` (source organization, dataset, prep state, assumptions). <br>3. **Fiber & Micronutrient Scoping**: Confirmed fiber is optional in items and excluded from daily summary budgets. Excluded unapproved micronutrients. <br>4. **Server-Side Authoritative Calculation**: Clarified that client cannot submit tampered macros for catalog foods. <br>5. **Timezone & Date Contract**: Formalized client-authoritative `YYYY-MM-DD` query and immutable historical date stability. |

---

## 1. Global API Standards & Envelope Conventions

All `NutritionModule` endpoints strictly adhere to FitMate AI global REST conventions established in `API_CONTRACTS.md`:
1. **URI Versioning**: Base prefix `/api/v1/nutrition`.
2. **Standard Success Envelope**:
   ```typescript
   interface ApiResponse<T> {
     success: true;
     data: T;
     meta?: {
       pagination?: {
         page: number;
         limit: number;
         totalItems: number;
         totalPages: number;
         hasNextPage: boolean;
         hasPrevPage: boolean;
       };
     };
   }
   ```
3. **Standard Error Envelope**:
   ```typescript
   interface ApiErrorResponse {
     success: false;
     error: {
       code: string;
       message: string;
       correlationId?: string;
       details?: Array<{ field: string; message: string }>;
     };
   }
   ```
4. **Mandatory Estimation Flag (Core Invariant 2)**: Every response containing nutritional calculations, food details, slot subtotals, or daily aggregates includes `isEstimated: true`.
5. **Centralized BOLA Defense Matrix**: All user mutations and diary views are scoped strictly to `req.user.id`. Foreign resource access attempts return `404 NOT_FOUND` (`RESOURCE_NOT_FOUND`) rather than `403 FORBIDDEN` to prevent resource enumeration.

---

## 2. Endpoint Master Inventory

| Endpoint ID | Method | Route Path | Purpose | Auth | Rate Limit Category |
| :--- | :---: | :--- | :--- | :---: | :---: |
| **EP-NUTR-001** | `GET` | `/api/v1/nutrition/diary` | Fetch 4-slot daily nutrition diary, targets & remaining budget | Bearer | General Reads (300/m) |
| **EP-NUTR-002** | `POST` | `/api/v1/nutrition/meals/quick-add` | Log uncatalogued manual calorie & macro entry to meal slot | Bearer | Standard Writes (120/m) |
| **EP-NUTR-003** | `POST` | `/api/v1/nutrition/meals/item` | Log curated catalog food scaled by portion or custom grams | Bearer | Standard Writes (120/m) |
| **EP-NUTR-004** | `DELETE`| `/api/v1/nutrition/meals/:logId/items/:itemId` | Remove individual logged food entry from diary | Bearer | Standard Writes (120/m) |
| **EP-NUTR-005** | `GET` | `/api/v1/nutrition/foods/search` | Search curated local food catalog (bilingual AR/EN) | Bearer | Search Cache (60/m) |
| **EP-NUTR-006** | `GET` | `/api/v1/nutrition/foods/:id` | Retrieve detailed nutritional profile, portions & provenance | Bearer | General Reads (300/m) |
| **EP-NUTR-007** | `PATCH` | `/api/v1/nutrition/meals/:logId/items/:itemId` | Edit portion, custom grams, quantity, or slot of logged item | Bearer | Standard Writes (120/m) |
| **EP-NUTR-008** | `GET` | `/api/v1/nutrition/summary` | Lightweight daily totals summary for Coach context/Dashboard | Bearer | General Reads (300/m) |

---

## 3. Detailed Endpoint Contracts

---

### Endpoint: EP-NUTR-001 — Daily Nutrition Diary & Totals
- **Method**: `GET`
- **Route**: `/api/v1/nutrition/diary`
- **Purpose**: Retrieves the 4-slot meal diary (`breakfast`, `lunch`, `dinner`, `snack`), calorie/macro subtotals, active daily targets snapshot, and remaining budget for a specified calendar date (`SCR-009`).
- **Authentication**: Bearer JWT (`authMiddleware`).
- **Authorization**: Resource Owner (`req.user.id`).
- **Target Integration**: Reads user's active targets in-process via `usersService.getProfileSnapshot(userId)` without modifying `user_profiles`.

#### Request
- **Headers**:
  - `Authorization: Bearer <jwt>` (Required)
  - `X-Timezone-Offset-Minutes: -120` (Optional, client timezone offset in minutes)
- **Query Parameters (Zod)**:
  ```typescript
  {
    date: string; // Required, YYYY-MM-DD format (regex: /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/)
  }
  ```

#### Empty Diary Behavior
If no meals have been logged for the requested date, the endpoint returns HTTP 200 with all 4 slots empty (`items: []`, 0 totals), consumed totals at 0, and `remainingBudget` matching full target amounts.

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
      "isEstimated": true,
      "isTargetsCustomized": false
    },
    "consumedTotals": {
      "calories": 683,
      "proteinGrams": 34.0,
      "carbsGrams": 81.0,
      "fatGrams": 25.5,
      "isEstimated": true
    },
    "remainingBudget": {
      "calories": 1317,
      "proteinGrams": 116.0,
      "carbsGrams": 119.0,
      "fatGrams": 39.5
    },
    "progressPercentage": 34,
    "slots": {
      "breakfast": {
        "slotTotalCalories": 413,
        "slotTotalProtein": 20.0,
        "slotTotalCarbs": 48.0,
        "slotTotalFat": 14.5,
        "items": [
          {
            "itemId": "item_uuid_1001",
            "logId": "67258b3c9a41e12345678850",
            "nameEn": "Egyptian Koshari",
            "nameAr": "كشري مصري",
            "servingUnitNameEn": "Small Plate",
            "servingUnitNameAr": "طبق صغير",
            "servingQuantity": 1.0,
            "servingWeightGrams": 250.0,
            "calories": 413,
            "proteinGrams": 13.0,
            "carbsGrams": 77.5,
            "fatGrams": 6.3,
            "fiberGrams": 9.5,
            "isQuickAdd": false,
            "isEstimated": true,
            "loggedAt": "2026-11-02T06:30:00.000Z"
          }
        ]
      },
      "lunch": { "slotTotalCalories": 270, "slotTotalProtein": 14.0, "slotTotalCarbs": 33.0, "slotTotalFat": 11.0, "items": [] },
      "dinner": { "slotTotalCalories": 0, "slotTotalProtein": 0.0, "slotTotalCarbs": 0.0, "slotTotalFat": 0.0, "items": [] },
      "snack": { "slotTotalCalories": 0, "slotTotalProtein": 0.0, "slotTotalCarbs": 0.0, "slotTotalFat": 0.0, "items": [] }
    }
  }
}
```

---

### Endpoint: EP-NUTR-002 — Quick-Add Manual Meal Entry
- **Method**: `POST`
- **Route**: `/api/v1/nutrition/meals/quick-add`
- **Purpose**: Logs an uncatalogued manual calorie & macro entry directly into a meal slot (`SCR-012`).
- **Authentication**: Bearer JWT.
- **Rate-limit Category**: Standard Mutation / Writes (120 req / 1 min).

#### Request Body Schema (Zod)
```typescript
{
  date: string;                       // YYYY-MM-DD
  slot: 'breakfast' | 'lunch' | 'dinner' | 'snack';
  nameEn?: string;                    // Optional, defaults to "Quick Add"
  nameAr?: string;                    // Optional, defaults to "إضافة سريعة"
  calories: number;                   // Integer, 0 <= calories <= 10,000
  proteinGrams?: number;              // Float, 0 <= protein <= 1,000 (default: 0)
  carbsGrams?: number;                // Float, 0 <= carbs <= 1,000 (default: 0)
  fatGrams?: number;                  // Float, 0 <= fat <= 1,000 (default: 0)
  servingWeightGrams?: number;        // Float, 0 <= weight <= 10,000 (default: 0)
}
```

#### Success Response
- **HTTP Status**: `201 Created`
```json
{
  "success": true,
  "data": {
    "logId": "67258b3c9a41e12345678850",
    "itemId": "item_uuid_1002",
    "slot": "breakfast",
    "nameEn": "Boiled Egg",
    "nameAr": "بيضة مسلوقة",
    "calories": 125,
    "proteinGrams": 6.0,
    "carbsGrams": 15.0,
    "fatGrams": 5.5,
    "servingWeightGrams": 50.0,
    "isQuickAdd": true,
    "isEstimated": true,
    "loggedAt": "2026-11-02T06:32:00.000Z"
  }
}
```

---

### Endpoint: EP-NUTR-003 — Log Food Item from Catalog
- **Method**: `POST`
- **Route**: `/api/v1/nutrition/meals/item`
- **Purpose**: Logs a curated food item from `food_library` scaled by portion unit or explicit custom grams (`SCR-011`).
- **Authentication**: Bearer JWT.
- **Server-Side Authoritative Calculation**: The server reads reference macros from `food_library` and calculates nutritional values. Client cannot send custom calorie/macro overrides for catalog items.

#### Request Body Schema (Zod)
```typescript
{
  date: string;                       // YYYY-MM-DD
  slot: 'breakfast' | 'lunch' | 'dinner' | 'snack';
  foodId: string;                     // MongoDB ObjectId string from food_library
  portionId?: string;                 // Optional portion ID from standardPortions
  servingQuantity: number;            // Float > 0 and <= 5000 (e.g. 1.5)
  customGrams?: number;               // Optional explicit gram override (Decision 4, e.g. 275.0)
}
```

#### Success Response
- **HTTP Status**: `201 Created`
```json
{
  "success": true,
  "data": {
    "logId": "67258b3c9a41e12345678850",
    "itemId": "item_uuid_1001",
    "foodId": "67258b3c9a41e12345678801",
    "catalogId": "food_eg_koshari_001",
    "slot": "breakfast",
    "nameEn": "Egyptian Koshari",
    "nameAr": "كشري مصري",
    "servingUnitNameEn": "Small Plate",
    "servingUnitNameAr": "طبق صغير",
    "servingQuantity": 1.0,
    "servingWeightGrams": 250.0,
    "calories": 413,
    "proteinGrams": 13.0,
    "carbsGrams": 77.5,
    "fatGrams": 6.3,
    "fiberGrams": 9.5,
    "isQuickAdd": false,
    "isEstimated": true,
    "loggedAt": "2026-11-02T06:30:00.000Z"
  }
}
```

---

### Endpoint: EP-NUTR-004 — Remove Logged Meal Item
- **Method**: `DELETE`
- **Route**: `/api/v1/nutrition/meals/:logId/items/:itemId`
- **Purpose**: Atomically removes a specific food item from a daily diary log and decrements totals.
- **Authentication**: Bearer JWT.
- **Authorization**: Resource Owner (`req.user.id`).

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

#### Error Responses
- `404 NOT_FOUND` (`RESOURCE_NOT_FOUND`): Returned if `logId` does not belong to authenticated user OR if `itemId` does not exist in the log (BOLA defense).

---

### Endpoint: EP-NUTR-005 — Search Curated Food Catalog
- **Method**: `GET`
- **Route**: `/api/v1/nutrition/foods/search`
- **Purpose**: Substring, normalized keyword, and alias search across regional and international foods (`SCR-010`).
- **Authentication**: Bearer JWT.
- **Rate-limit Category**: Food & Exercise Search (60 req / 1 min).

#### Query Parameters Schema (Zod)
```typescript
{
  q: string;                          // Min 2 chars, max 100 chars (trimmed)
  category?: FoodCategory;            // Optional category filter
  page?: number;                      // Default: 1, min: 1
  limit?: number;                     // Default: 20, min: 1, max: 50
}
```

#### Success Response
- **HTTP Status**: `200 OK`
```json
{
  "success": true,
  "data": [
    {
      "id": "67258b3c9a41e12345678801",
      "catalogId": "food_eg_koshari_001",
      "nameEn": "Egyptian Koshari",
      "nameAr": "كشري مصري",
      "category": "middle_eastern_dishes",
      "servingSizeGrams": 100.0,
      "caloriesPer100g": 165,
      "proteinPer100g": 5.2,
      "carbsPer100g": 31.0,
      "fatPer100g": 2.5,
      "confidenceLevel": "medium",
      "isVerified": true,
      "isEstimated": true,
      "defaultPortion": {
        "unitNameEn": "Small Plate",
        "unitNameAr": "طبق صغير",
        "gramWeight": 250.0
      }
    }
  ],
  "meta": {
    "pagination": {
      "page": 1,
      "limit": 20,
      "totalItems": 1,
      "totalPages": 1,
      "hasNextPage": false,
      "hasPrevPage": false
    }
  }
}
```

---

### Endpoint: EP-NUTR-006 — Get Food Item Details & Provenance
- **Method**: `GET`
- **Route**: `/api/v1/nutrition/foods/:id`
- **Purpose**: Retrieves complete nutritional facts, standard portions, and provenance metadata for a catalog food (`SCR-011`).
- **Authentication**: Bearer JWT.

#### Success Response
- **HTTP Status**: `200 OK`
```json
{
  "success": true,
  "data": {
    "id": "67258b3c9a41e12345678801",
    "catalogId": "food_eg_koshari_001",
    "nameEn": "Egyptian Koshari",
    "nameAr": "كشري مصري",
    "category": "middle_eastern_dishes",
    "servingSizeGrams": 100.0,
    "caloriesPer100g": 165,
    "proteinPer100g": 5.2,
    "carbsPer100g": 31.0,
    "fatPer100g": 2.5,
    "fiberPer100g": 3.8,
    "standardPortions": [
      {
        "portionId": "portion_koshari_small_plate",
        "unitNameEn": "Small Plate",
        "unitNameAr": "طبق صغير",
        "gramWeight": 250.0,
        "isDefault": true
      },
      {
        "portionId": "portion_koshari_medium_plate",
        "unitNameEn": "Medium Plate",
        "unitNameAr": "طبق وسط",
        "gramWeight": 400.0,
        "isDefault": false
      }
    ],
    "provenance": {
      "sourceOrganization": "National Nutrition Institute (NNI) Egypt",
      "sourceDataset": "Food Composition Tables for Egypt (2006)",
      "sourceRecordId": "NNI-EGY-088",
      "reviewDate": "2026-11-01",
      "preparationState": "cooked",
      "preparationAssumptions": "Standard institutional recipe: 35% rice, 25% brown lentils, 25% pasta, 10% chickpeas, tomato sauce, fried onions.",
      "confidenceLevel": "medium",
      "isVerified": true,
      "isEstimated": true
    }
  }
}
```

---

### Endpoint: EP-NUTR-007 — Edit Logged Meal Item
- **Method**: `PATCH`
- **Route**: `/api/v1/nutrition/meals/:logId/items/:itemId`
- **Purpose**: Updates the quantity, portion unit, custom grams, or target meal slot of an already logged food item.
- **Authentication**: Bearer JWT.
- **Authorization**: Resource Owner (`req.user.id`).

#### Request Body Schema (Zod)
```typescript
{
  targetSlot?: 'breakfast' | 'lunch' | 'dinner' | 'snack';
  portionId?: string;
  servingQuantity?: number;           // Float > 0 and <= 5000
  customGrams?: number;               // Float > 0 and <= 10000 (Decision 4)
  // For Quick-Add items only:
  calories?: number;
  proteinGrams?: number;
  carbsGrams?: number;
  fatGrams?: number;
}
```

#### Success Response
- **HTTP Status**: `200 OK`
```json
{
  "success": true,
  "data": {
    "logId": "67258b3c9a41e12345678850",
    "itemId": "item_uuid_1001",
    "slot": "breakfast",
    "servingQuantity": 1.5,
    "servingWeightGrams": 375.0,
    "calories": 620,
    "proteinGrams": 19.5,
    "carbsGrams": 116.3,
    "fatGrams": 9.5,
    "fiberGrams": 14.3,
    "isEstimated": true,
    "updatedAt": "2026-11-02T07:15:00.000Z"
  }
}
```

---

### Endpoint: EP-NUTR-008 — Daily Nutrition Summary Snapshot
- **Method**: `GET`
- **Route**: `/api/v1/nutrition/summary`
- **Purpose**: Returns a lightweight summary of daily calorie and macronutrient intake for Progress dashboards and AI Coach context assembly without sending the full item list.
- **Authentication**: Bearer JWT.
- **Query Parameters (Zod)**:
  - `date`: `YYYY-MM-DD` (Required)

#### Success Response
- **HTTP Status**: `200 OK`
```json
{
  "success": true,
  "data": {
    "date": "2026-11-02",
    "dailyCalorieTarget": 2000,
    "consumedCalories": 683,
    "remainingCalories": 1317,
    "consumedProteinGrams": 34.0,
    "consumedCarbsGrams": 81.0,
    "consumedFatGrams": 25.5,
    "isEstimated": true
  }
}
```
