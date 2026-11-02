/**
 * Pure Nutrition Calculator — Item Scaling & Slot Aggregation Engine
 * 
 * Architectural Role: Pure arithmetic service for scaling reference food items
 * and aggregating daily and meal-slot nutritional totals.
 * Conforms to:
 * - Core Invariant 2 (Estimation Invariant: isEstimated: true)
 * - DB-016 (Precision Tiers: integer calories, 1 decimal place macros and weights)
 */

export interface ReferenceNutrientsPer100g {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber?: number;
}

export interface ScaledNutrientsOutput {
  servingWeightGrams: number;
  calories: number;
  proteinGrams: number;
  carbsGrams: number;
  fatGrams: number;
  fiberGrams?: number;
  isEstimated: true;
}

export interface NutrientsAccumulator {
  calories: number;
  proteinGrams: number;
  carbsGrams: number;
  fatGrams: number;
  fiberGrams?: number;
}

export interface RemainingBudgetOutput {
  calories: number;
  proteinGrams: number;
  carbsGrams: number;
  fatGrams: number;
}

/**
 * Scales reference baseline nutrients (per 100g) by target serving weight in grams.
 * Maintains Float64 precision until final decimal rounding.
 */
export function scaleNutrients(
  per100g: ReferenceNutrientsPer100g,
  weightGrams: number
): ScaledNutrientsOutput {
  if (weightGrams < 0) {
    throw new Error('Serving weight in grams cannot be negative');
  }

  const multiplier = weightGrams / 100.0;

  const rawCalories = per100g.calories * multiplier;
  const rawProtein = per100g.protein * multiplier;
  const rawCarbs = per100g.carbs * multiplier;
  const rawFat = per100g.fat * multiplier;
  const rawFiber = per100g.fiber !== undefined ? per100g.fiber * multiplier : undefined;

  return {
    servingWeightGrams: Math.round(weightGrams * 10) / 10,
    calories: Math.round(rawCalories),
    proteinGrams: Math.round(rawProtein * 10) / 10,
    carbsGrams: Math.round(rawCarbs * 10) / 10,
    fatGrams: Math.round(rawFat * 10) / 10,
    fiberGrams: rawFiber !== undefined ? Math.round(rawFiber * 10) / 10 : undefined,
    isEstimated: true,
  };
}

/**
 * Calculates item nutritional values based on portion selection or explicit custom grams.
 */
export function calculateItemNutrition(params: {
  caloriesPer100g: number;
  proteinPer100g: number;
  carbsPer100g: number;
  fatPer100g: number;
  fiberPer100g?: number;
  servingQuantity: number;
  portionGramWeight?: number;
  customGrams?: number;
}): ScaledNutrientsOutput {
  if (params.servingQuantity <= 0) {
    throw new Error('Serving quantity must be greater than zero');
  }

  let totalWeightGrams: number;

  if (params.customGrams !== undefined && params.customGrams > 0) {
    totalWeightGrams = params.customGrams * params.servingQuantity;
  } else if (params.portionGramWeight !== undefined && params.portionGramWeight > 0) {
    totalWeightGrams = params.portionGramWeight * params.servingQuantity;
  } else {
    // Default to reference 100g serving size
    totalWeightGrams = 100.0 * params.servingQuantity;
  }

  return scaleNutrients(
    {
      calories: params.caloriesPer100g,
      protein: params.proteinPer100g,
      carbs: params.carbsPer100g,
      fat: params.fatPer100g,
      fiber: params.fiberPer100g,
    },
    totalWeightGrams
  );
}

/**
 * Aggregates a list of food items into slot/daily subtotals.
 * Sums unrounded float values before applying final precision rounding (DB-016).
 */
export function aggregateNutritionItems(
  items: Array<NutrientsAccumulator>
): NutrientsAccumulator & { isEstimated: true } {
  let totalCalories = 0;
  let totalProtein = 0;
  let totalCarbs = 0;
  let totalFat = 0;
  let totalFiber: number | undefined = undefined;
  let hasFiber = false;

  for (const item of items) {
    totalCalories += item.calories;
    totalProtein += item.proteinGrams;
    totalCarbs += item.carbsGrams;
    totalFat += item.fatGrams;

    if (item.fiberGrams !== undefined) {
      hasFiber = true;
      totalFiber = (totalFiber || 0) + item.fiberGrams;
    }
  }

  return {
    calories: Math.round(totalCalories),
    proteinGrams: Math.round(totalProtein * 10) / 10,
    carbsGrams: Math.round(totalCarbs * 10) / 10,
    fatGrams: Math.round(totalFat * 10) / 10,
    fiberGrams: hasFiber && totalFiber !== undefined ? Math.round(totalFiber * 10) / 10 : undefined,
    isEstimated: true,
  };
}

/**
 * Calculates remaining daily budget by subtracting consumed totals from active targets.
 */
export function calculateRemainingBudget(
  targets: { calories: number; proteinGrams: number; carbsGrams: number; fatGrams: number },
  consumed: { calories: number; proteinGrams: number; carbsGrams: number; fatGrams: number }
): RemainingBudgetOutput {
  return {
    calories: targets.calories - consumed.calories,
    proteinGrams: Math.round((targets.proteinGrams - consumed.proteinGrams) * 10) / 10,
    carbsGrams: Math.round((targets.carbsGrams - consumed.carbsGrams) * 10) / 10,
    fatGrams: Math.round((targets.fatGrams - consumed.fatGrams) * 10) / 10,
  };
}

