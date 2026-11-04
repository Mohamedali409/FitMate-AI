import { Schema, model, Document, Types } from 'mongoose';

export type MealSlotType = 'breakfast' | 'lunch' | 'dinner' | 'snack';

export const MEAL_SLOT_TYPES: MealSlotType[] = [
  'breakfast',
  'lunch',
  'dinner',
  'snack',
];

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
  createdAt?: Date;
  updatedAt?: Date;
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

export const NutritionLogItemSchema = new Schema<INutritionLogItem>(
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
      required: [true, 'Serving unit name in English is required'],
      trim: true,
    },
    servingUnitNameAr: {
      type: String,
      required: [true, 'Serving unit name in Arabic is required'],
      trim: true,
    },
    servingQuantity: {
      type: Number,
      required: [true, 'Serving quantity is required'],
      min: [0.01, 'Quantity must be greater than 0'],
      max: [5000, 'Quantity cannot exceed 5000 units'],
    },
    servingWeightGrams: {
      type: Number,
      required: [true, 'Serving weight in grams is required'],
      min: [0, 'Weight cannot be negative'],
      max: [10000, 'Weight cannot exceed 10,000 grams'],
      set: (val: number) => (typeof val === 'number' && !isNaN(val) ? Math.round(val * 10) / 10 : val),
    },
    calories: {
      type: Number,
      required: [true, 'Calories is required'],
      min: [0, 'Calories cannot be negative'],
      max: [10000, 'Calories per item cannot exceed 10,000'],
      set: (val: number) => (typeof val === 'number' && !isNaN(val) ? Math.round(val) : val),
    },
    proteinGrams: {
      type: Number,
      required: [true, 'Protein is required'],
      min: [0, 'Protein cannot be negative'],
      max: [1000, 'Protein cannot exceed 1,000g'],
      set: (val: number) => (typeof val === 'number' && !isNaN(val) ? Math.round(val * 10) / 10 : val),
    },
    carbsGrams: {
      type: Number,
      required: [true, 'Carbohydrates is required'],
      min: [0, 'Carbohydrates cannot be negative'],
      max: [1000, 'Carbohydrates cannot exceed 1,000g'],
      set: (val: number) => (typeof val === 'number' && !isNaN(val) ? Math.round(val * 10) / 10 : val),
    },
    fatGrams: {
      type: Number,
      required: [true, 'Fat is required'],
      min: [0, 'Fat cannot be negative'],
      max: [1000, 'Fat cannot exceed 1,000g'],
      set: (val: number) => (typeof val === 'number' && !isNaN(val) ? Math.round(val * 10) / 10 : val),
    },
    fiberGrams: {
      type: Number,
      min: [0, 'Fiber cannot be negative'],
      max: [500, 'Fiber cannot exceed 500g'],
      set: (val?: number) => (typeof val === 'number' && !isNaN(val) ? Math.round(val * 10) / 10 : val),
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
      validate: {
        validator: (v: boolean) => v === true,
        message: 'isEstimated must be true per Core Invariant 2',
      },
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

export const MealSlotSchema = new Schema<IMealSlot>(
  {
    slotTotalCalories: {
      type: Number,
      default: 0,
      min: [0, 'Slot calories cannot be negative'],
      set: (val: number) => (typeof val === 'number' && !isNaN(val) ? Math.round(val) : val),
    },
    slotTotalProtein: {
      type: Number,
      default: 0.0,
      min: [0, 'Slot protein cannot be negative'],
      set: (val: number) => (typeof val === 'number' && !isNaN(val) ? Math.round(val * 10) / 10 : val),
    },
    slotTotalCarbs: {
      type: Number,
      default: 0.0,
      min: [0, 'Slot carbohydrates cannot be negative'],
      set: (val: number) => (typeof val === 'number' && !isNaN(val) ? Math.round(val * 10) / 10 : val),
    },
    slotTotalFat: {
      type: Number,
      default: 0.0,
      min: [0, 'Slot fat cannot be negative'],
      set: (val: number) => (typeof val === 'number' && !isNaN(val) ? Math.round(val * 10) / 10 : val),
    },
    items: {
      type: [NutritionLogItemSchema],
      default: [],
    },
  },
  { _id: false }
);

export const NutritionLogSchema = new Schema<INutritionLogDocument>(
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
      breakfast: {
        type: MealSlotSchema,
        default: () => ({ slotTotalCalories: 0, slotTotalProtein: 0, slotTotalCarbs: 0, slotTotalFat: 0, items: [] }),
      },
      lunch: {
        type: MealSlotSchema,
        default: () => ({ slotTotalCalories: 0, slotTotalProtein: 0, slotTotalCarbs: 0, slotTotalFat: 0, items: [] }),
      },
      dinner: {
        type: MealSlotSchema,
        default: () => ({ slotTotalCalories: 0, slotTotalProtein: 0, slotTotalCarbs: 0, slotTotalFat: 0, items: [] }),
      },
      snack: {
        type: MealSlotSchema,
        default: () => ({ slotTotalCalories: 0, slotTotalProtein: 0, slotTotalCarbs: 0, slotTotalFat: 0, items: [] }),
      },
    },
    dailyTotalCalories: {
      type: Number,
      default: 0,
      min: [0, 'Daily calories cannot be negative'],
      set: (val: number) => (typeof val === 'number' && !isNaN(val) ? Math.round(val) : val),
    },
    dailyTotalProtein: {
      type: Number,
      default: 0.0,
      min: [0, 'Daily protein cannot be negative'],
      set: (val: number) => (typeof val === 'number' && !isNaN(val) ? Math.round(val * 10) / 10 : val),
    },
    dailyTotalCarbs: {
      type: Number,
      default: 0.0,
      min: [0, 'Daily carbohydrates cannot be negative'],
      set: (val: number) => (typeof val === 'number' && !isNaN(val) ? Math.round(val * 10) / 10 : val),
    },
    dailyTotalFat: {
      type: Number,
      default: 0.0,
      min: [0, 'Daily fat cannot be negative'],
      set: (val: number) => (typeof val === 'number' && !isNaN(val) ? Math.round(val * 10) / 10 : val),
    },
    isEstimated: {
      type: Boolean,
      default: true,
      required: true, // Core Invariant 2
      validate: {
        validator: (v: boolean) => v === true,
        message: 'isEstimated must be true per Core Invariant 2',
      },
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

/**
 * Purges all nutrition diary records for a user during account deletion saga.
 */
export async function purgeNutritionUserData(userId: string | Types.ObjectId): Promise<number> {
  const result = await NutritionLogModel.deleteMany({ userId });
  return result.deletedCount;
}

