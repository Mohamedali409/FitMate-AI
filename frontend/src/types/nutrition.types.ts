/**
 * FitMate AI — Frontend Nutrition Types
 * Strictly aligned with backend `src/modules/nutrition/dto/nutrition.dto.ts`
 */

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

export interface DefaultPortion {
  portionId?: string;
  unitNameEn: string;
  unitNameAr: string;
  gramWeight: number;
}

export interface StandardPortion {
  portionId: string;
  unitNameEn: string;
  unitNameAr: string;
  gramWeight: number;
  isDefault?: boolean;
}

export interface FoodItemSummary {
  id: string;
  catalogId: string;
  nameEn: string;
  nameAr: string;
  category: FoodCategory;
  servingSizeGrams: number;
  caloriesPer100g: number;
  proteinPer100g: number;
  carbsPer100g: number;
  fatPer100g: number;
  confidenceLevel: 'high' | 'medium';
  isVerified: boolean;
  isEstimated: boolean; // Always true (Core Invariant 2)
  defaultPortion?: DefaultPortion | null;
}

export interface FoodItemProvenance {
  sourceOrganization: string;
  sourceDataset: string;
  sourceRecordId?: string | null;
  reviewDate: string;
  preparationState: string;
  preparationAssumptions?: string | null;
  confidenceLevel: 'high' | 'medium';
  isVerified: boolean;
  isEstimated: boolean;
}

export interface FoodItemDetail {
  id: string;
  catalogId: string;
  nameEn: string;
  nameAr: string;
  category: FoodCategory;
  servingSizeGrams: number;
  caloriesPer100g: number;
  proteinPer100g: number;
  carbsPer100g: number;
  fatPer100g: number;
  fiberPer100g?: number | null;
  standardPortions: StandardPortion[];
  provenance: FoodItemProvenance;
}

export type MealSlotName = 'breakfast' | 'lunch' | 'dinner' | 'snack';

export interface LoggedMealItem {
  id: string;
  foodItemId?: string;
  catalogId?: string;
  nameEn: string;
  nameAr: string;
  servingWeightGrams: number;
  portionMultiplier: number;
  unitNameEn?: string;
  unitNameAr?: string;
  calories: number;
  proteinGrams: number;
  carbsGrams: number;
  fatGrams: number;
  fiberGrams?: number;
  isQuickAdd: boolean;
  isEstimated: true;
  loggedAt: string;
}

export interface MealSlotData {
  slot: MealSlotName;
  calories: number;
  proteinGrams: number;
  carbsGrams: number;
  fatGrams: number;
  items: LoggedMealItem[];
}

export interface DailyNutritionSummary {
  date: string;
  dailyCalorieTarget: number;
  caloriesConsumed: number;
  remainingCalories: number;
  proteinTargetGrams: number;
  proteinConsumedGrams: number;
  carbsTargetGrams: number;
  carbsConsumedGrams: number;
  fatTargetGrams: number;
  fatConsumedGrams: number;
  isEstimated: true;
  slots: Record<MealSlotName, MealSlotData>;
}

