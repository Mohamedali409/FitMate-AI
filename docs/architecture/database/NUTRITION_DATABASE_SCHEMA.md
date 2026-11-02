# FitMate AI — Nutrition Database Schema Specification (`NutritionModule`)

**Document Version:** 1.1.0  
**Phase:** 5.2.1.1 — Nutrition Architecture Design Corrections  
**Status:** **`PROPOSED / READY FOR HUMAN REVIEW`**  
**Date:** 2026-11-02  
**Owning Module:** `NutritionModule`  
**Target Collections:** `food_library`, `nutrition_logs`  
**Author:** Principal Backend Architect & MongoDB Data Modeling Engineer  

---

## Document Revision History

| Version | Date | Author | Description of Changes |
| :---: | :---: | :--- | :--- |
| **1.0.0** | 2026-11-02 | Lead Security & MongoDB Modeler | Initial baseline schema design for Phase 5.2.1. |
| **1.1.0** | 2026-11-02 | Principal Backend Architect | **Phase 5.2.1.1 Design Corrections**: <br>1. **Data Provenance Expansion**: Added 9 required provenance fields to `food_library` (`sourceOrganization`, `sourceDataset`, `sourceRecordId`, `reviewDate`, `preparationState`, `preparationAssumptions`, `confidenceLevel`, `isVerified`, `isEstimated`). <br>2. **Composite Meal Representation**: Detailed institutional recipe standards for Egyptian composite dishes (Koshari, Mahshi, Hawawshi). <br>3. **Search Index Reconciliation**: Harmonized `{ searchTokens: 1, isArchived: 1 }` prefix index and `{ nameEn: 'text', nameAr: 'text', searchAliases: 'text' }` full-text index with realistic benchmark requirements. <br>4. **Human Decisions Recorded**: Optional fiber in catalog/diary, exclusion of other micronutrients, custom gram overrides, script-only seeding. <br>5. **Timezone & Date Stability**: Formatted client-authoritative `YYYY-MM-DD` key and immutable historical boundary rules. <br>6. **Roadmap Correction**: Fixed Phase 5.2 deletion saga step ordering (`Step 2: purge_nutrition`). |

---

## 1. Document Overview & Modeling Principles

This document provides the formal MongoDB schema specification for FitMate AI's `NutritionModule`.

### 1.1 Modeling Foundations
1. **Engine Alignment**: Compatible with MongoDB 7.0+ WiredTiger storage engine and Mongoose 8.x ODM.
2. **Document Bounding & Size Limits**:
   - `food_library`: Curated catalog of ~150–200 static documents (~1.5 KB per document). Total collection size $< 500 \text{ KB}$.
   - `nutrition_logs`: Exactly **1 document per user per calendar day**. Embeds 4 meal slots and up to 25 logged items per day. Average document size is $6\text{ KB} - 18\text{ KB}$, well within the 16 MB MongoDB BSON boundary ([DB-031](file:///d:/2026/Personal%20Fitness%20&%20AI%20Coach%20Platform/FitMate-AI/docs/architecture/database/DATABASE_ISSUES.md#L83)).
3. **Estimation Invariant ([DB-012](file:///d:/2026/Personal%20Fitness%20&%20AI%20Coach%20Platform/FitMate-AI/docs/architecture/database/DATABASE_ISSUES.md#L100-L114))**: Every logged food item, meal slot aggregate, and daily total enforces `isEstimated: true` in accordance with Core Invariant 2.
4. **Precision Tiers ([DB-016](file:///d:/2026/Personal%20Fitness%20&%20AI%20Coach%20Platform/FitMate-AI/docs/architecture/database/DATABASE_ISSUES.md#L158-L172))**:
   - Calories: Rounded non-negative integer.
   - Macronutrients: Float64 rounded to **1 decimal place** (`0.0g`).
   - Grams / Weights: Float64 rounded to **1 decimal place** (`0.0g`).
5. **Timezone & Calendar Keys ([DB-017](file:///d:/2026/Personal%20Fitness%20&%20AI%20Coach%20Platform/FitMate-AI/docs/architecture/database/DATABASE_ISSUES.md#L174-L180))**: The daily diary document is keyed by `date: string` formatted as `YYYY-MM-DD` representing the user's active local calendar date, supplemented by `timezoneOffsetMinutes: number`.

---

## 2. Collection 1: `food_library` (Curated Baseline Food Catalog)

### 2.1 Collection Purpose
The `food_library` collection holds the curated baseline food catalog of ~150–200 items (Middle Eastern, Egyptian regional specialties, and international fitness staples).
- **Runtime Access**: **Read-Only** from mobile client APIs.
- **Mutations**: Admin migration scripts only via explicit CLI runner (`npm run seed:foods`).
- **Idempotency**: Indexed by unique `catalogId` (e.g. `'food_eg_foul_001'`).

### 2.2 Provenance & Composite Meal Standards
1. **Provenance Metadata**: Every record tracks origin organization, publication, review date, and culinary state.
2. **Composite Egyptian Meals**: Dishes like Koshari, Mahshi, Hawawshi, and Molokhia are modeled based on standard institutional recipes published by the National Nutrition Institute (NNI) of Egypt:
   - `preparationState: 'cooked'`
   - `confidenceLevel: 'medium'`
   - `preparationAssumptions`: Documents standardized household proportions (e.g. "Koshari: standard composite of 35% rice, 25% brown lentils, 25% pasta, 10% chickpeas, tomato sauce, fried onions").
3. **`isVerified` vs `isEstimated`**:
   - `isVerified: true`: Certified laboratory source origin (USDA or NNI Egypt).
   - `isEstimated: true`: Mandatory Core Invariant 2 acknowledgment of biological agricultural and cooking variance.

### 2.3 TypeScript Interfaces

```typescript
import { Document, Types } from 'mongoose';

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

export type PreparationState =
  | 'raw'
  | 'cooked'
  | 'boiled'
  | 'grilled'
  | 'fried'
  | 'baked'
  | 'canned';

export type NutritionConfidenceLevel = 'high' | 'medium';

export interface IStandardPortion {
  portionId: string;                   // UUID or slug, e.g. 'portion_loaf_01'
  unitNameEn: string;                  // e.g. 'Loaf', 'Medium Piece', 'Tablespoon'
  unitNameAr: string;                  // e.g. 'رغيف', 'قطعة متوسطة', 'ملعقة كبيرة'
  gramWeight: number;                  // Equivalent weight in grams (e.g. 90.0)
  isDefault?: boolean;                 // Whether pre-selected in UI
}

export interface IFoodItem {
  catalogId: string;                   // Deterministic immutable ID, e.g. 'food_eg_koshari_001'
  catalogVersion: string;              // e.g. '1.0.0'
  nameEn: string;                      // Display name in English, e.g. 'Egyptian Koshari'
  nameAr: string;                      // Display name in Arabic, e.g. 'كشري مصري'
  searchAliases: string[];             // Alternative names, misspellings, transliterations
  searchTokens: string[];              // Normalized tokens for fast indexing (Alef/Yaa stripped)
  category: FoodCategory;
  servingSizeGrams: number;            // Reference baseline size (always 100.0)
  servingUnitNameEn: string;           // '100g'
  servingUnitNameAr: string;           // '100 جرام'
  caloriesPer100g: number;             // Non-negative integer
  proteinPer100g: number;              // Float, 1 decimal place
  carbsPer100g: number;                // Float, 1 decimal place
  fatPer100g: number;                  // Float, 1 decimal place
  fiberPer100g?: number;               // Optional float, 1 decimal place (Decision 1)
  standardPortions: IStandardPortion[];// Pre-calculated household measures
  
  // Mandatory Provenance Fields
  sourceOrganization: string;          // e.g. 'National Nutrition Institute (NNI) Egypt'
  sourceDataset: string;               // e.g. 'Food Composition Tables for Egypt (2006)'
  sourceRecordId?: string;             // e.g. 'NNI-EGY-042' or 'USDA-170934'
  reviewDate: string;                  // YYYY-MM-DD
  preparationState: PreparationState;  // Physical state
  preparationAssumptions?: string;     // Assumptions on oil, moisture, recipe ratios
  confidenceLevel: NutritionConfidenceLevel;
  isVerified: boolean;                 // True for official laboratory data
  isEstimated: boolean;                // Always true (Core Invariant 2)
  isArchived: boolean;                 // Soft-delete toggle (default: false)
  schemaVersion: number;               // Default 1
  createdAt: Date;
  updatedAt: Date;
}

export interface IFoodItemDocument extends Document<Types.ObjectId>, IFoodItem {
  id: string;
}
```

### 2.4 Mongoose Schema Implementation

```typescript
import { Schema, model } from 'mongoose';

const StandardPortionSchema = new Schema<IStandardPortion>(
  {
    portionId: {
      type: String,
      required: [true, 'Portion ID is required'],
      trim: true,
    },
    unitNameEn: {
      type: String,
      required: [true, 'English portion name is required'],
      trim: true,
      maxlength: [50, 'Portion name cannot exceed 50 characters'],
    },
    unitNameAr: {
      type: String,
      required: [true, 'Arabic portion name is required'],
      trim: true,
      maxlength: [50, 'Portion name cannot exceed 50 characters'],
    },
    gramWeight: {
      type: Number,
      required: [true, 'Gram weight is required'],
      min: [0.1, 'Gram weight must be greater than 0'],
      max: [5000, 'Gram weight cannot exceed 5000g'],
    },
    isDefault: {
      type: Boolean,
      default: false,
    },
  },
  { _id: false }
);

const FoodItemSchema = new Schema<IFoodItemDocument>(
  {
    catalogId: {
      type: String,
      required: [true, 'Catalog ID is required'],
      unique: true,
      trim: true,
      match: [/^food_[a-z0-9_]+$/, 'Catalog ID must follow food_<slug> naming convention'],
    },
    catalogVersion: {
      type: String,
      required: true,
      default: '1.0.0',
      trim: true,
    },
    nameEn: {
      type: String,
      required: [true, 'English food name is required'],
      trim: true,
      maxlength: [120, 'English name cannot exceed 120 characters'],
    },
    nameAr: {
      type: String,
      required: [true, 'Arabic food name is required'],
      trim: true,
      maxlength: [120, 'Arabic name cannot exceed 120 characters'],
    },
    searchAliases: {
      type: [String],
      default: [],
      trim: true,
    },
    searchTokens: {
      type: [String],
      default: [],
      trim: true,
    },
    category: {
      type: String,
      enum: {
        values: [
          'protein',
          'carbohydrates',
          'legumes',
          'dairy_eggs',
          'vegetables',
          'fruits',
          'fats_oils',
          'middle_eastern_dishes',
          'baked_goods',
          'beverages_snacks',
        ],
        message: '{VALUE} is not a supported food category',
      },
      required: [true, 'Food category is required'],
    },
    servingSizeGrams: {
      type: Number,
      default: 100.0,
      required: true,
    },
    servingUnitNameEn: {
      type: String,
      default: '100g',
      required: true,
    },
    servingUnitNameAr: {
      type: String,
      default: '100 جرام',
      required: true,
    },
    caloriesPer100g: {
      type: Number,
      required: [true, 'Calories per 100g is required'],
      min: [0, 'Calories cannot be negative'],
      max: [1000, 'Calories per 100g exceeds maximum physical density (900 kcal for pure fat)'],
      set: (val: number) => Math.round(val),
    },
    proteinPer100g: {
      type: Number,
      required: [true, 'Protein per 100g is required'],
      min: [0, 'Protein cannot be negative'],
      max: [100, 'Protein cannot exceed 100g per 100g'],
      set: (val: number) => Math.round(val * 10) / 10,
    },
    carbsPer100g: {
      type: Number,
      required: [true, 'Carbohydrates per 100g is required'],
      min: [0, 'Carbohydrates cannot be negative'],
      max: [100, 'Carbohydrates cannot exceed 100g per 100g'],
      set: (val: number) => Math.round(val * 10) / 10,
    },
    fatPer100g: {
      type: Number,
      required: [true, 'Fat per 100g is required'],
      min: [0, 'Fat cannot be negative'],
      max: [100, 'Fat cannot exceed 100g per 100g'],
      set: (val: number) => Math.round(val * 10) / 10,
    },
    fiberPer100g: {
      type: Number,
      min: [0, 'Fiber cannot be negative'],
      max: [100, 'Fiber cannot exceed 100g per 100g'],
      set: (val: number) => (val !== undefined ? Math.round(val * 10) / 10 : undefined),
    },
    standardPortions: {
      type: [StandardPortionSchema],
      default: [],
    },
    sourceOrganization: {
      type: String,
      required: [true, 'Source organization is required'],
      trim: true,
    },
    sourceDataset: {
      type: String,
      required: [true, 'Source dataset is required'],
      trim: true,
    },
    sourceRecordId: {
      type: String,
      trim: true,
    },
    reviewDate: {
      type: String,
      required: [true, 'Review date is required'],
      match: [/^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/, 'Date must be YYYY-MM-DD'],
    },
    preparationState: {
      type: String,
      enum: ['raw', 'cooked', 'boiled', 'grilled', 'fried', 'baked', 'canned'],
      required: [true, 'Preparation state is required'],
    },
    preparationAssumptions: {
      type: String,
      trim: true,
    },
    confidenceLevel: {
      type: String,
      enum: ['high', 'medium'],
      default: 'high',
      required: true,
    },
    isVerified: {
      type: Boolean,
      default: true,
      required: true,
    },
    isEstimated: {
      type: Boolean,
      default: true,
      required: true, // Core Invariant 2
    },
    isArchived: {
      type: Boolean,
      default: false,
      required: true,
    },
    schemaVersion: {
      type: Number,
      default: 1,
      required: true,
    },
  },
  {
    timestamps: true,
    versionKey: false,
    toJSON: {
      transform(_doc, ret: Record<string, any>) {
        ret.id = ret._id?.toString() || ret.id;
        delete ret._id;
        delete ret.__v;
        delete ret.searchTokens; // Exclude internal tokens from response
      },
    },
  }
);

// Reconciled Indexes
// 1. Authoritative Unique Identifier
FoodItemSchema.index({ catalogId: 1 }, { unique: true, name: 'uniq_food_catalogId' });

// 2. Category browsing with active status filter
FoodItemSchema.index({ category: 1, isArchived: 1 }, { name: 'idx_food_category_active' });

// 3. Normalized Token Prefix Search
FoodItemSchema.index({ searchTokens: 1, isArchived: 1 }, { name: 'idx_food_searchTokens_active' });

// 4. Text Index for Full-Text Search fallback across both languages
FoodItemSchema.index(
  { nameEn: 'text', nameAr: 'text', searchAliases: 'text' },
  {
    name: 'text_food_bilingual_search',
    weights: { nameAr: 10, nameEn: 10, searchAliases: 5 },
    default_language: 'none', // Prevents English stemmer from corrupting Arabic tokens
  }
);

export const FoodItemModel = model<IFoodItemDocument>('FoodItem', FoodItemSchema, 'food_library');
```

---

## 3. Collection 2: `nutrition_logs` (Daily Meal Diary)

### 3.1 Collection Purpose
Maintains the daily nutritional log for authenticated users.
- Embedded 4-slot structure (`breakfast`, `lunch`, `dinner`, `snack`).
- One document per user per local calendar date (`YYYY-MM-DD`).
- Stores complete nutritional snapshots of logged items so catalog modifications never alter history.

### 3.2 TypeScript Interfaces

```typescript
import { Document, Types } from 'mongoose';

export type MealSlotType = 'breakfast' | 'lunch' | 'dinner' | 'snack';

export interface INutritionLogItem {
  itemId: string;                      // UUID v4 unique identifier within daily log
  foodId?: Types.ObjectId | null;      // Reference to food_library (null if Quick-Add)
  catalogId?: string | null;           // Snapshot of catalogId if logged from catalog
  nameEn: string;                      // Display name snapshot in English
  nameAr: string;                      // Display name snapshot in Arabic
  portionId?: string | null;           // Reference to standard portion (e.g. 'portion_loaf_01')
  servingUnitNameEn: string;           // e.g. 'Loaf', 'g'
  servingUnitNameAr: string;           // e.g. 'رغيف', 'جرام'
  servingQuantity: number;             // Multiplier, e.g. 1.5
  servingWeightGrams: number;          // Total calculated weight in grams (e.g. 135.0g)
  calories: number;                    // Integer (e.g. 360)
  proteinGrams: number;                // Float, 1 decimal place
  carbsGrams: number;                  // Float, 1 decimal place
  fatGrams: number;                    // Float, 1 decimal place
  fiberGrams?: number;                 // Optional float, 1 decimal place
  isQuickAdd: boolean;                 // True if logged via Quick-Add
  isEstimated: boolean;                // Always true (Core Invariant 2)
  loggedAt: Date;                      // Timestamp when entry was recorded
  createdAt: Date;
  updatedAt: Date;
}

export interface IMealSlot {
  slotTotalCalories: number;           // Integer sum of items in slot
  slotTotalProtein: number;            // Float sum of items (1 decimal place)
  slotTotalCarbs: number;              // Float sum of items (1 decimal place)
  slotTotalFat: number;                // Float sum of items (1 decimal place)
  items: INutritionLogItem[];          // Array of embedded meal entries
}

export interface INutritionLog {
  userId: Types.ObjectId;              // Reference to users collection
  date: string;                        // Canonical local date 'YYYY-MM-DD' (DB-017)
  timezoneOffsetMinutes: number;       // Device offset at log time, e.g. -120 for Cairo (DB-017)
  slots: {
    breakfast: IMealSlot;
    lunch: IMealSlot;
    dinner: IMealSlot;
    snack: IMealSlot;
  };
  dailyTotalCalories: number;          // Sum across all 4 slots
  dailyTotalProtein: number;           // Sum across all 4 slots (1 decimal)
  dailyTotalCarbs: number;             // Sum across all 4 slots (1 decimal)
  dailyTotalFat: number;               // Sum across all 4 slots (1 decimal)
  isEstimated: boolean;                // Always true (Core Invariant 2)
  schemaVersion: number;               // Default 1
  createdAt: Date;
  updatedAt: Date;
}

export interface INutritionLogDocument extends Document<Types.ObjectId>, INutritionLog {
  id: string;
}
```

### 3.3 Mongoose Schema Implementation

```typescript
import { Schema, model } from 'mongoose';

const NutritionLogItemSchema = new Schema<INutritionLogItem>(
  {
    itemId: {
      type: String,
      required: [true, 'Item ID is required'],
      trim: true,
    },
    foodId: {
      type: Schema.Types.ObjectId,
      ref: 'FoodItem',
      default: null,
    },
    catalogId: {
      type: String,
      default: null,
      trim: true,
    },
    nameEn: {
      type: String,
      required: [true, 'English item name is required'],
      trim: true,
      maxlength: [120, 'Name cannot exceed 120 characters'],
    },
    nameAr: {
      type: String,
      required: [true, 'Arabic item name is required'],
      trim: true,
      maxlength: [120, 'Name cannot exceed 120 characters'],
    },
    portionId: {
      type: String,
      default: null,
      trim: true,
    },
    servingUnitNameEn: {
      type: String,
      required: true,
      trim: true,
    },
    servingUnitNameAr: {
      type: String,
      required: true,
      trim: true,
    },
    servingQuantity: {
      type: Number,
      required: true,
      min: [0.01, 'Quantity must be greater than 0'],
      max: [5000, 'Quantity cannot exceed 5000 units'],
    },
    servingWeightGrams: {
      type: Number,
      required: true,
      min: [0, 'Weight cannot be negative'],
      max: [10000, 'Weight cannot exceed 10,000 grams'],
      set: (val: number) => Math.round(val * 10) / 10,
    },
    calories: {
      type: Number,
      required: true,
      min: [0, 'Calories cannot be negative'],
      max: [10000, 'Calories per item cannot exceed 10,000'],
      set: (val: number) => Math.round(val),
    },
    proteinGrams: {
      type: Number,
      required: true,
      min: [0, 'Protein cannot be negative'],
      max: [1000, 'Protein cannot exceed 1,000g'],
      set: (val: number) => Math.round(val * 10) / 10,
    },
    carbsGrams: {
      type: Number,
      required: true,
      min: [0, 'Carbohydrates cannot be negative'],
      max: [1000, 'Carbohydrates cannot exceed 1,000g'],
      set: (val: number) => Math.round(val * 10) / 10,
    },
    fatGrams: {
      type: Number,
      required: true,
      min: [0, 'Fat cannot be negative'],
      max: [1000, 'Fat cannot exceed 1,000g'],
      set: (val: number) => Math.round(val * 10) / 10,
    },
    fiberGrams: {
      type: Number,
      min: [0, 'Fiber cannot be negative'],
      max: [500, 'Fiber cannot exceed 500g'],
      set: (val: number) => (val !== undefined ? Math.round(val * 10) / 10 : undefined),
    },
    isQuickAdd: {
      type: Boolean,
      default: false,
      required: true,
    },
    isEstimated: {
      type: Boolean,
      default: true,
      required: true, // Core Invariant 2
    },
    loggedAt: {
      type: Date,
      default: Date.now,
      required: true,
    },
  },
  {
    timestamps: true,
    _id: false, // Items are identified by their UUID itemId
  }
);

const MealSlotSchema = new Schema<IMealSlot>(
  {
    slotTotalCalories: {
      type: Number,
      default: 0,
      min: 0,
      set: (val: number) => Math.round(val),
    },
    slotTotalProtein: {
      type: Number,
      default: 0.0,
      min: 0,
      set: (val: number) => Math.round(val * 10) / 10,
    },
    slotTotalCarbs: {
      type: Number,
      default: 0.0,
      min: 0,
      set: (val: number) => Math.round(val * 10) / 10,
    },
    slotTotalFat: {
      type: Number,
      default: 0.0,
      min: 0,
      set: (val: number) => Math.round(val * 10) / 10,
    },
    items: {
      type: [NutritionLogItemSchema],
      default: [],
    },
  },
  { _id: false }
);

const NutritionLogSchema = new Schema<INutritionLogDocument>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User ID reference is required'],
    },
    date: {
      type: String,
      required: [true, 'Local date YYYY-MM-DD is required'],
      match: [/^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/, 'Date must be formatted as YYYY-MM-DD'],
    },
    timezoneOffsetMinutes: {
      type: Number,
      default: 0,
      required: true,
    },
    slots: {
      breakfast: { type: MealSlotSchema, default: () => ({ items: [] }) },
      lunch: { type: MealSlotSchema, default: () => ({ items: [] }) },
      dinner: { type: MealSlotSchema, default: () => ({ items: [] }) },
      snack: { type: MealSlotSchema, default: () => ({ items: [] }) },
    },
    dailyTotalCalories: {
      type: Number,
      default: 0,
      min: 0,
      set: (val: number) => Math.round(val),
    },
    dailyTotalProtein: {
      type: Number,
      default: 0.0,
      min: 0,
      set: (val: number) => Math.round(val * 10) / 10,
    },
    dailyTotalCarbs: {
      type: Number,
      default: 0.0,
      min: 0,
      set: (val: number) => Math.round(val * 10) / 10,
    },
    dailyTotalFat: {
      type: Number,
      default: 0.0,
      min: 0,
      set: (val: number) => Math.round(val * 10) / 10,
    },
    isEstimated: {
      type: Boolean,
      default: true,
      required: true, // Core Invariant 2
    },
    schemaVersion: {
      type: Number,
      default: 1,
      required: true,
    },
  },
  {
    timestamps: true,
    versionKey: false,
    toJSON: {
      transform(_doc, ret: Record<string, any>) {
        ret.id = ret._id?.toString() || ret.id;
        delete ret._id;
        delete ret.__v;
      },
    },
  }
);

// Indexes
// 1. Exactly ONE diary document per user per calendar day (Compound Unique)
NutritionLogSchema.index({ userId: 1, date: 1 }, { unique: true, name: 'uniq_user_nutrition_date' });

// 2. Date Range History / Analytics Queries (ESR Pattern)
NutritionLogSchema.index({ userId: 1, date: -1 }, { name: 'idx_user_nutrition_history' });

export const NutritionLogModel = model<INutritionLogDocument>(
  'NutritionLog',
  NutritionLogSchema,
  'nutrition_logs'
);
```

---

## 4. Evaluation of Custom Food Collection ([DEC-010](file:///d:/2026/Personal%20Fitness%20&%20AI%20Coach%20Platform/FitMate-AI/docs/architecture/MODULE_BOUNDARIES.md#L205))

### 4.1 Decision Reaffirmation
FitMate AI strictly rejects creating a standalone `custom_foods` collection for the MVP.
- **Rationale**: User-created custom foods generate database fragmentation, require complex orphan garbage collection, and slow down search.
- **Approved Implementation**: Quick-Add meals are stored directly inside `nutrition_logs.slots[slotName].items` with `isQuickAdd: true` and `foodId: null`.

---

## 5. Deletion Saga Integration ([DB-018](file:///d:/2026/Personal%20Fitness%20&%20AI%20Coach%20Platform/FitMate-AI/docs/architecture/database/DATABASE_ISSUES.md#L70))

In the account deletion saga, Step 2 (`purge_nutrition`) removes user data:
```typescript
export async function purgeNutritionUserData(userId: string | Types.ObjectId): Promise<number> {
  const result = await NutritionLogModel.deleteMany({ userId });
  return result.deletedCount;
}
```
All daily diary documents are permanently purged. The shared `food_library` contains zero user ownership references and remains unaffected.

---

## 6. Complete BSON Examples

### 6.1 `food_library` Document Example (Composite Egyptian Dish)
```json
{
  "_id": { "$oid": "67258b3c9a41e12345678801" },
  "catalogId": "food_eg_koshari_001",
  "catalogVersion": "1.0.0",
  "nameEn": "Egyptian Koshari",
  "nameAr": "كشري مصري",
  "searchAliases": ["كشري", "كشرى", "كشري مصري", "koshari", "koshary", "kushari"],
  "category": "middle_eastern_dishes",
  "servingSizeGrams": 100.0,
  "servingUnitNameEn": "100g",
  "servingUnitNameAr": "100 جرام",
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
  "sourceOrganization": "National Nutrition Institute (NNI) Egypt",
  "sourceDataset": "Food Composition Tables for Egypt (2006)",
  "sourceRecordId": "NNI-EGY-088",
  "reviewDate": "2026-11-01",
  "preparationState": "cooked",
  "preparationAssumptions": "Standard institutional recipe: 35% Egyptian rice, 25% brown lentils, 25% pasta, 10% chickpeas, tomato sauce, and fried onions.",
  "confidenceLevel": "medium",
  "isVerified": true,
  "isEstimated": true,
  "isArchived": false,
  "schemaVersion": 1,
  "createdAt": { "$date": "2026-11-01T00:00:00.000Z" },
  "updatedAt": { "$date": "2026-11-01T00:00:00.000Z" }
}
```

### 6.2 `nutrition_logs` Document Example
```json
{
  "_id": { "$oid": "67258b3c9a41e12345678850" },
  "userId": { "$oid": "67258b3c9a41e12345678901" },
  "date": "2026-11-02",
  "timezoneOffsetMinutes": -120,
  "slots": {
    "breakfast": {
      "slotTotalCalories": 413,
      "slotTotalProtein": 13.0,
      "slotTotalCarbs": 77.5,
      "slotTotalFat": 6.3,
      "items": [
        {
          "itemId": "item_uuid_1001",
          "foodId": { "$oid": "67258b3c9a41e12345678801" },
          "catalogId": "food_eg_koshari_001",
          "nameEn": "Egyptian Koshari",
          "nameAr": "كشري مصري",
          "portionId": "portion_koshari_small_plate",
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
          "loggedAt": { "$date": "2026-11-02T07:30:00.000Z" }
        }
      ]
    },
    "lunch": { "slotTotalCalories": 0, "slotTotalProtein": 0.0, "slotTotalCarbs": 0.0, "slotTotalFat": 0.0, "items": [] },
    "dinner": { "slotTotalCalories": 0, "slotTotalProtein": 0.0, "slotTotalCarbs": 0.0, "slotTotalFat": 0.0, "items": [] },
    "snack": { "slotTotalCalories": 0, "slotTotalProtein": 0.0, "slotTotalCarbs": 0.0, "slotTotalFat": 0.0, "items": [] }
  },
  "dailyTotalCalories": 413,
  "dailyTotalProtein": 13.0,
  "dailyTotalCarbs": 77.5,
  "dailyTotalFat": 6.3,
  "isEstimated": true,
  "schemaVersion": 1,
  "createdAt": { "$date": "2026-11-02T07:30:00.000Z" },
  "updatedAt": { "$date": "2026-11-02T07:30:00.000Z" }
}
```
