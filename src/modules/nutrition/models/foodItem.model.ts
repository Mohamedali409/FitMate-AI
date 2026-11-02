import { Schema, model, Document, Types } from 'mongoose';
import { buildSearchTokens } from '../utils/textNormalizer.js';

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

export const FOOD_CATEGORIES: FoodCategory[] = [
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
];

export type PreparationState =
  | 'raw'
  | 'cooked'
  | 'boiled'
  | 'grilled'
  | 'fried'
  | 'baked'
  | 'canned';

export const PREPARATION_STATES: PreparationState[] = [
  'raw',
  'cooked',
  'boiled',
  'grilled',
  'fried',
  'baked',
  'canned',
];

export type NutritionConfidenceLevel = 'high' | 'medium';

export interface IStandardPortion {
  portionId: string;
  unitNameEn: string;
  unitNameAr: string;
  gramWeight: number;
  isDefault?: boolean;
}

export interface IFoodItem {
  catalogId: string;
  catalogVersion: string;
  nameEn: string;
  nameAr: string;
  searchAliases: string[];
  searchTokens: string[];
  category: FoodCategory;
  servingSizeGrams: number;
  servingUnitNameEn: string;
  servingUnitNameAr: string;
  caloriesPer100g: number;
  proteinPer100g: number;
  carbsPer100g: number;
  fatPer100g: number;
  fiberPer100g?: number;
  standardPortions: IStandardPortion[];

  // Mandatory Provenance Fields
  sourceOrganization: string;
  sourceDataset: string;
  sourceRecordId?: string | null;
  reviewDate: string;
  preparationState: PreparationState;
  preparationAssumptions?: string;
  confidenceLevel: NutritionConfidenceLevel;
  isVerified: boolean;
  isEstimated: boolean;
  isArchived: boolean;
  schemaVersion: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface IFoodItemDocument extends Document<Types.ObjectId>, IFoodItem {
  id: string;
}

export const StandardPortionSchema = new Schema<IStandardPortion>(
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

export const FoodItemSchema = new Schema<IFoodItemDocument>(
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
        values: FOOD_CATEGORIES,
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
      set: (val: number) => (val !== undefined && val !== null ? Math.round(val * 10) / 10 : undefined),
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
      default: null,
    },
    reviewDate: {
      type: String,
      required: [true, 'Review date is required'],
      match: [/^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/, 'Date must be YYYY-MM-DD'],
    },
    preparationState: {
      type: String,
      enum: {
        values: PREPARATION_STATES,
        message: '{VALUE} is not a supported preparation state',
      },
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
        delete ret.searchTokens; // Exclude internal tokens from API response
      },
    },
  }
);

// Pre-save hook: ensure searchTokens are populated and normalized
FoodItemSchema.pre('save', function (next) {
  if (this.isModified('nameEn') || this.isModified('nameAr') || this.isModified('searchAliases') || !this.searchTokens || this.searchTokens.length === 0) {
    this.searchTokens = buildSearchTokens(this.nameEn, this.nameAr, this.searchAliases || []);
  }
  next();
});

// Indexes (Reconciled as per Schema Spec §2.4)
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

