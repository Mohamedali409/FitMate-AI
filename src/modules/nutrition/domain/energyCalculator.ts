/**
 * Pure Domain Calculation Engine — Mifflin-St Jeor Energy & Macro Target Calculator
 * 
 * Architectural Role: Isolated Domain Leaf Utility (Zero external dependencies).
 * Conforms to:
 * - Core Invariant 2 (Estimation Invariant: isEstimated: true)
 * - DEC-005 (Mifflin-St Jeor sex constant: male +5, female -161, prefer_not_to_say -78)
 * - DB-016 (Precision Tiers: integer calories, 1 decimal place macros)
 * - ADR-010 (Canonical SI conversion boundaries: lbs to kg, inches to cm)
 */

export type BiologicalSex = 'male' | 'female' | 'prefer_not_to_say';

export type FitnessGoal =
  | 'fat_loss'
  | 'muscle_gain'
  | 'recomposition'
  | 'maintenance'
  | 'general_fitness'
  | 'undecided';

export type ActivityMultiplier = 1.2 | 1.375 | 1.55 | 1.725 | 1.9;

export type UnitSystem = 'metric' | 'imperial';

export interface MetabolicCalculationInput {
  weightKg?: number;
  heightCm?: number;
  weightLbs?: number;
  heightInches?: number;
  unitSystem?: UnitSystem;
  birthDate: string; // YYYY-MM-DD
  biologicalSex: BiologicalSex;
  activityMultiplier: number;
  goal: FitnessGoal;
  referenceDate?: Date; // Optional reference date for deterministic testing
}

export interface EnergyTargetsOutput {
  dailyCalorieTarget: number; // Rounded integer, minimum safety floor 1200 kcal
  proteinTargetGrams: number; // Float, 1 decimal place
  carbsTargetGrams: number; // Float, 1 decimal place
  fatTargetGrams: number; // Float, 1 decimal place
  isEstimated: true; // Core Invariant 2
}

export class InvalidCalculationInputError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidCalculationInputError';
  }
}

// Physical Conversion Constants (ADR-010)
const LBS_PER_KG = 2.20462;
const CM_PER_INCH = 2.54;

/**
 * Converts pounds (lbs) to kilograms (kg) rounded to 2 decimal places (ADR-010 input boundary).
 */
export function lbsToKg(lbs: number): number {
  if (typeof lbs !== 'number' || isNaN(lbs) || !isFinite(lbs) || lbs <= 0) {
    throw new InvalidCalculationInputError('Weight in pounds must be a positive finite number');
  }
  return Math.round((lbs / LBS_PER_KG) * 100) / 100;
}

/**
 * Converts kilograms (kg) to pounds (lbs) rounded to 1 decimal place (ADR-010 display boundary).
 */
export function kgToLbs(kg: number): number {
  if (typeof kg !== 'number' || isNaN(kg) || !isFinite(kg) || kg <= 0) {
    throw new InvalidCalculationInputError('Weight in kilograms must be a positive finite number');
  }
  return Math.round((kg * LBS_PER_KG) * 10) / 10;
}

/**
 * Converts inches to centimeters (cm) rounded to 2 decimal places (ADR-010 input boundary).
 */
export function inchesToCm(inches: number): number {
  if (typeof inches !== 'number' || isNaN(inches) || !isFinite(inches) || inches <= 0) {
    throw new InvalidCalculationInputError('Height in inches must be a positive finite number');
  }
  return Math.round((inches * CM_PER_INCH) * 100) / 100;
}

/**
 * Converts centimeters (cm) to inches rounded to 1 decimal place (ADR-010 display boundary).
 */
export function cmToInches(cm: number): number {
  if (typeof cm !== 'number' || isNaN(cm) || !isFinite(cm) || cm <= 0) {
    throw new InvalidCalculationInputError('Height in centimeters must be a positive finite number');
  }
  return Math.round((cm / CM_PER_INCH) * 10) / 10;
}

/**
 * Validates and extracts canonical SI metrics from input parameters.
 */
function resolveCanonicalMetrics(params: MetabolicCalculationInput): {
  weightKg: number;
  heightCm: number;
} {
  let weightKg = params.weightKg;
  let heightCm = params.heightCm;

  // Resolve weight
  if (typeof weightKg !== 'number' && typeof params.weightLbs === 'number') {
    weightKg = lbsToKg(params.weightLbs);
  } else if (params.unitSystem === 'imperial' && typeof params.weightLbs === 'number') {
    weightKg = lbsToKg(params.weightLbs);
  }

  // Resolve height
  if (typeof heightCm !== 'number' && typeof params.heightInches === 'number') {
    heightCm = inchesToCm(params.heightInches);
  } else if (params.unitSystem === 'imperial' && typeof params.heightInches === 'number') {
    heightCm = inchesToCm(params.heightInches);
  }

  // Validate presence
  if (typeof weightKg !== 'number' || isNaN(weightKg) || !isFinite(weightKg)) {
    throw new InvalidCalculationInputError(
      'Weight must be provided as a valid number in kilograms (weightKg) or pounds (weightLbs)'
    );
  }

  if (typeof heightCm !== 'number' || isNaN(heightCm) || !isFinite(heightCm)) {
    throw new InvalidCalculationInputError(
      'Height must be provided as a valid number in centimeters (heightCm) or inches (heightInches)'
    );
  }

  // Validate physical boundaries (30.00kg to 300.00kg, 100.0cm to 250.0cm)
  if (weightKg < 30.0 || weightKg > 300.0) {
    throw new InvalidCalculationInputError(
      `Weight (${weightKg} kg) is outside acceptable physiological boundaries (30.0 kg to 300.0 kg)`
    );
  }

  if (heightCm < 100.0 || heightCm > 250.0) {
    throw new InvalidCalculationInputError(
      `Height (${heightCm} cm) is outside acceptable physiological boundaries (100.0 cm to 250.0 cm)`
    );
  }

  return { weightKg, heightCm };
}

/**
 * Validates birth date and computes age.
 */
function resolveAge(birthDateStr: string, referenceDate: Date = new Date()): number {
  if (!birthDateStr || typeof birthDateStr !== 'string') {
    throw new InvalidCalculationInputError('Birth date is required in YYYY-MM-DD format');
  }

  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!dateRegex.test(birthDateStr)) {
    throw new InvalidCalculationInputError('Birth date must follow YYYY-MM-DD format');
  }

  const birthDate = new Date(birthDateStr);
  if (isNaN(birthDate.getTime())) {
    throw new InvalidCalculationInputError('Invalid birth date value');
  }

  const birthYear = birthDate.getFullYear();
  const currentYear = referenceDate.getFullYear();
  const age = currentYear - birthYear;

  if (age < 13 || age > 100) {
    throw new InvalidCalculationInputError(
      `User age (${age} years) must be between 13 and 100 years of age`
    );
  }

  return age;
}

/**
 * Validates biological sex and returns the Mifflin-St Jeor sex constant (DEC-005).
 * - male: +5
 * - female: -161
 * - prefer_not_to_say: -78 (midpoint average)
 */
function resolveSexConstant(sex: BiologicalSex): number {
  switch (sex) {
    case 'male':
      return 5;
    case 'female':
      return -161;
    case 'prefer_not_to_say':
      return -78;
    default:
      throw new InvalidCalculationInputError(
        `Invalid biological sex '${sex}'. Must be 'male', 'female', or 'prefer_not_to_say'`
      );
  }
}

/**
 * Validates activity multiplier.
 */
function validateActivityMultiplier(multiplier: number): number {
  if (typeof multiplier !== 'number' || isNaN(multiplier) || !isFinite(multiplier)) {
    throw new InvalidCalculationInputError('Activity multiplier must be a valid number');
  }

  const validMultipliers = [1.2, 1.375, 1.55, 1.725, 1.9];
  if (!validMultipliers.includes(multiplier)) {
    throw new InvalidCalculationInputError(
      `Invalid activity multiplier '${multiplier}'. Supported values are: ${validMultipliers.join(', ')}`
    );
  }

  return multiplier;
}

/**
 * Validates fitness goal.
 */
function validateGoal(goal: FitnessGoal): FitnessGoal {
  const validGoals: FitnessGoal[] = [
    'fat_loss',
    'muscle_gain',
    'recomposition',
    'maintenance',
    'general_fitness',
    'undecided',
  ];

  if (!validGoals.includes(goal)) {
    throw new InvalidCalculationInputError(
      `Invalid goal '${goal}'. Supported goals are: ${validGoals.join(', ')}`
    );
  }

  return goal;
}

/**
 * Pure Mifflin-St Jeor Energy & Macro Target Calculator
 * 
 * Calculates Baseline Metabolic Rate (BMR), Total Daily Energy Expenditure (TDEE),
 * and target daily calorie and macronutrient allocations based on user physical metrics,
 * biological sex, activity multiplier, and primary fitness goal.
 * 
 * Enforces:
 * - 1,200 kcal absolute safety floor for deficit diets
 * - Rounded integer calories
 * - 1 decimal place macronutrients (Float64)
 * - isEstimated: true on all results (Core Invariant 2)
 */
export function calculateEnergyTargets(params: MetabolicCalculationInput): EnergyTargetsOutput {
  if (!params || typeof params !== 'object') {
    throw new InvalidCalculationInputError('Calculation parameters object must be provided');
  }

  // 1. Resolve canonical metric inputs
  const { weightKg, heightCm } = resolveCanonicalMetrics(params);

  // 2. Validate and compute age
  const age = resolveAge(params.birthDate, params.referenceDate);

  // 3. Resolve sex constant
  const s = resolveSexConstant(params.biologicalSex);

  // 4. Validate activity multiplier and goal
  const activityMultiplier = validateActivityMultiplier(params.activityMultiplier);
  const goal = validateGoal(params.goal);

  // 5. Calculate BMR (Mifflin-St Jeor formula)
  // BMR = 10 * weight(kg) + 6.25 * height(cm) - 5 * age(y) + s
  const bmr = 10 * weightKg + 6.25 * heightCm - 5 * age + s;

  // 6. Calculate TDEE
  const tdee = bmr * activityMultiplier;

  // 7. Adjust for Fitness Goal & Protein Requirements
  let targetCalories = tdee;
  let proteinFactor = 1.6;

  switch (goal) {
    case 'fat_loss':
      targetCalories = Math.max(1200, tdee - 500);
      proteinFactor = 1.8;
      break;
    case 'muscle_gain':
      targetCalories = tdee + 300;
      proteinFactor = 2.0;
      break;
    case 'recomposition':
      targetCalories = Math.max(1200, tdee - 200);
      proteinFactor = 2.0;
      break;
    case 'maintenance':
    case 'general_fitness':
    case 'undecided':
    default:
      targetCalories = tdee;
      proteinFactor = 1.6;
      break;
  }

  // 8. Round calories to non-negative integer, enforcing 1,200 kcal absolute safety floor
  const dailyCalorieTarget = Math.max(1200, Math.round(targetCalories));

  // 9. Calculate macronutrient targets
  // Protein: weightKg * proteinFactor (rounded to 1 decimal place)
  const proteinTargetGrams = Math.round(weightKg * proteinFactor * 10) / 10;

  // Fat: 25% of total calorie budget (9 kcal/g, rounded to 1 decimal place)
  const fatCalories = dailyCalorieTarget * 0.25;
  const fatTargetGrams = Math.round((fatCalories / 9) * 10) / 10;

  // Carbs: Remainder of calorie budget after protein and fat (4 kcal/g, rounded to 1 decimal place)
  const carbCalories = Math.max(0, dailyCalorieTarget - proteinTargetGrams * 4 - fatTargetGrams * 9);
  const carbsTargetGrams = Math.round((carbCalories / 4) * 10) / 10;

  return {
    dailyCalorieTarget,
    proteinTargetGrams,
    carbsTargetGrams,
    fatTargetGrams,
    isEstimated: true, // Core Invariant 2
  };
}

