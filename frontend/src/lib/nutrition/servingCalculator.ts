/**
 * FitMate AI — Pure Serving Nutrition Calculator
 * 
 * Architectural Role: Pure arithmetic and validation service for portion scaling
 * and nutritional recalculation in the frontend.
 * Conforms to:
 * - Core Invariant 2 (Estimation Invariant: isEstimated: true)
 * - DB-016 (Precision Tiers: integer calories, 1 decimal place macros, fiber, and weights)
 */

export const MIN_SERVING_WEIGHT_GRAMS = 0.1;
export const MAX_SERVING_WEIGHT_GRAMS = 5000; // 5kg sensible upper bound for single meal portion/ingredient
export const DEFAULT_SERVING_WEIGHT_GRAMS = 100;

export interface ReferenceNutrients {
  caloriesPer100g: number;
  proteinPer100g: number;
  carbsPer100g: number;
  fatPer100g: number;
  fiberPer100g?: number | null;
}

export interface ScaledServingNutrition {
  servingWeightGrams: number;
  calories: number;
  proteinGrams: number;
  carbsGrams: number;
  fatGrams: number;
  fiberGrams?: number | null;
  isEstimated: true;
}

export interface WeightValidationResult {
  isValid: boolean;
  weight?: number;
  error?: string;
}

/**
 * Validates a serving weight input.
 * Rejects NaN, non-numeric values, negative numbers, zero, and unreasonable values (> 5000g).
 */
export function validateServingWeight(weight: unknown): WeightValidationResult {
  if (weight === null || weight === undefined || weight === '') {
    return {
      isValid: false,
      error: 'Weight is required',
    };
  }

  const num = typeof weight === 'number' ? weight : Number(weight);

  if (isNaN(num) || !isFinite(num)) {
    return {
      isValid: false,
      error: 'Weight must be a valid number',
    };
  }

  if (num < MIN_SERVING_WEIGHT_GRAMS) {
    return {
      isValid: false,
      error: `Serving weight must be at least ${MIN_SERVING_WEIGHT_GRAMS}g`,
    };
  }

  if (num > MAX_SERVING_WEIGHT_GRAMS) {
    return {
      isValid: false,
      error: `Serving weight cannot exceed ${MAX_SERVING_WEIGHT_GRAMS}g (5kg)`,
    };
  }

  // Round weight to 1 decimal place
  const roundedWeight = Math.round(num * 10) / 10;

  return {
    isValid: true,
    weight: roundedWeight,
  };
}

/**
 * Scales reference baseline nutrients (per 100g) by target serving weight in grams.
 * Mathematical formula:
 * multiplier = servingWeightGrams / 100.0
 * calories = round(caloriesPer100g * multiplier)
 * protein = round(proteinPer100g * multiplier * 10) / 10
 * carbs = round(carbsPer100g * multiplier * 10) / 10
 * fat = round(fatPer100g * multiplier * 10) / 10
 * fiber = fiberPer100g !== null/undefined ? round(fiberPer100g * multiplier * 10) / 10 : null
 * 
 * Guarantees:
 * - Does NOT mutate the input `nutrients` object.
 * - Adheres to DB-016 integer calories and 1 decimal place macros.
 * - Always labels `isEstimated: true` per Core Invariant 2.
 */
export function calculateServingNutrition(
  nutrients: ReferenceNutrients,
  servingWeightGrams: number
): ScaledServingNutrition {
  const validation = validateServingWeight(servingWeightGrams);
  if (!validation.isValid || validation.weight === undefined) {
    throw new Error(validation.error || 'Invalid serving weight');
  }

  const validWeight = validation.weight;
  const multiplier = validWeight / 100.0;

  const rawCalories = nutrients.caloriesPer100g * multiplier;
  const rawProtein = nutrients.proteinPer100g * multiplier;
  const rawCarbs = nutrients.carbsPer100g * multiplier;
  const rawFat = nutrients.fatPer100g * multiplier;

  const hasFiber = nutrients.fiberPer100g !== undefined && nutrients.fiberPer100g !== null;
  const rawFiber = hasFiber ? nutrients.fiberPer100g! * multiplier : null;

  return {
    servingWeightGrams: validWeight,
    calories: Math.round(rawCalories),
    proteinGrams: Math.round(rawProtein * 10) / 10,
    carbsGrams: Math.round(rawCarbs * 10) / 10,
    fatGrams: Math.round(rawFat * 10) / 10,
    fiberGrams: rawFiber !== null ? Math.round(rawFiber * 10) / 10 : null,
    isEstimated: true,
  };
}

/**
 * Determines the initial default portion weight for a food item.
 * Preference order:
 * 1. Standard portion marked with `isDefault: true`
 * 2. First standard portion if available
 * 3. Reference `servingSizeGrams` if positive
 * 4. 100g fallback
 */
export function getDefaultServingWeight(food: {
  standardPortions?: Array<{ gramWeight: number; isDefault?: boolean }>;
  servingSizeGrams?: number;
}): number {
  if (food.standardPortions && food.standardPortions.length > 0) {
    const defaultPortion = food.standardPortions.find((p) => p.isDefault) || food.standardPortions[0];
    if (defaultPortion && typeof defaultPortion.gramWeight === 'number' && defaultPortion.gramWeight > 0) {
      return defaultPortion.gramWeight;
    }
  }

  if (typeof food.servingSizeGrams === 'number' && food.servingSizeGrams > 0) {
    return food.servingSizeGrams;
  }

  return DEFAULT_SERVING_WEIGHT_GRAMS;
}

