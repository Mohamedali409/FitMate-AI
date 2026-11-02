import { describe, it, expect } from 'vitest';
import {
  calculateEnergyTargets,
  lbsToKg,
  kgToLbs,
  inchesToCm,
  cmToInches,
  InvalidCalculationInputError,
} from '../../src/modules/nutrition/domain/energyCalculator.js';

describe('Pure Energy Calculator (Unit Tests)', () => {
  const deterministicDate = new Date('2026-11-02T12:00:00.000Z');

  describe('Mifflin-St Jeor Sex Constants & Formulas (DEC-005)', () => {
    it('should calculate BMR and targets for male with sex constant s = +5', () => {
      // 75kg, 180cm, born 1998 (28 years old in 2026)
      // BMR = 10 * 75 + 6.25 * 180 - 5 * 28 + 5 = 750 + 1125 - 140 + 5 = 1740 kcal
      // TDEE (1.55) = 1740 * 1.55 = 2697 kcal
      // Muscle Gain: +300 = 2997 kcal
      const result = calculateEnergyTargets({
        weightKg: 75.0,
        heightCm: 180.0,
        birthDate: '1998-01-01',
        biologicalSex: 'male',
        activityMultiplier: 1.55,
        goal: 'muscle_gain',
        referenceDate: deterministicDate,
      });

      expect(result.isEstimated).toBe(true);
      expect(result.dailyCalorieTarget).toBe(2997);
      // Protein: 75 * 2.0 = 150.0g
      expect(result.proteinTargetGrams).toBe(150.0);
      // Fat: 25% of 2997 = 749.25 kcal / 9 = 83.25 -> 83.3g
      expect(result.fatTargetGrams).toBe(83.3);
      // Carbs: (2997 - 150*4 - 83.3*9) / 4 = (2997 - 600 - 749.7) / 4 = 1647.3 / 4 = 411.825 -> 411.8g
      expect(result.carbsTargetGrams).toBe(411.8);
    });

    it('should calculate BMR and targets for female with sex constant s = -161', () => {
      // 65kg, 168cm, born 1995 (31 years old in 2026)
      // BMR = 10 * 65 + 6.25 * 168 - 5 * 31 - 161 = 650 + 1050 - 155 - 161 = 1384 kcal
      // TDEE (1.375) = 1384 * 1.375 = 1903 kcal
      // Fat Loss: 1903 - 500 = 1403 kcal
      const result = calculateEnergyTargets({
        weightKg: 65.0,
        heightCm: 168.0,
        birthDate: '1995-06-15',
        biologicalSex: 'female',
        activityMultiplier: 1.375,
        goal: 'fat_loss',
        referenceDate: deterministicDate,
      });

      expect(result.isEstimated).toBe(true);
      expect(result.dailyCalorieTarget).toBe(1403);
      // Protein: 65 * 1.8 = 117.0g
      expect(result.proteinTargetGrams).toBe(117.0);
      // Fat: 25% of 1403 = 350.75 / 9 = 38.97 -> 39.0g
      expect(result.fatTargetGrams).toBe(39.0);
      // Carbs: (1403 - 117*4 - 39*9) / 4 = (1403 - 468 - 351) / 4 = 584 / 4 = 146.0g
      expect(result.carbsTargetGrams).toBe(146.0);
    });

    it('should calculate BMR for prefer_not_to_say with midpoint constant s = -78', () => {
      // BMR with s = -78
      const maleResult = calculateEnergyTargets({
        weightKg: 70.0,
        heightCm: 175.0,
        birthDate: '1990-01-01',
        biologicalSex: 'male',
        activityMultiplier: 1.2,
        goal: 'maintenance',
        referenceDate: deterministicDate,
      });

      const femaleResult = calculateEnergyTargets({
        weightKg: 70.0,
        heightCm: 175.0,
        birthDate: '1990-01-01',
        biologicalSex: 'female',
        activityMultiplier: 1.2,
        goal: 'maintenance',
        referenceDate: deterministicDate,
      });

      const neutralResult = calculateEnergyTargets({
        weightKg: 70.0,
        heightCm: 175.0,
        birthDate: '1990-01-01',
        biologicalSex: 'prefer_not_to_say',
        activityMultiplier: 1.2,
        goal: 'maintenance',
        referenceDate: deterministicDate,
      });

      expect(neutralResult.dailyCalorieTarget).toBeLessThan(maleResult.dailyCalorieTarget);
      expect(neutralResult.dailyCalorieTarget).toBeGreaterThan(femaleResult.dailyCalorieTarget);
    });
  });

  describe('Activity Multipliers', () => {
    const baseParams = {
      weightKg: 80.0,
      heightCm: 180.0,
      birthDate: '1995-01-01',
      biologicalSex: 'male' as const,
      goal: 'maintenance' as const,
      referenceDate: deterministicDate,
    };

    it('should scale energy targets monotonically with all 5 approved activity multipliers', () => {
      const sedentary = calculateEnergyTargets({ ...baseParams, activityMultiplier: 1.2 });
      const lightlyActive = calculateEnergyTargets({ ...baseParams, activityMultiplier: 1.375 });
      const moderatelyActive = calculateEnergyTargets({ ...baseParams, activityMultiplier: 1.55 });
      const veryActive = calculateEnergyTargets({ ...baseParams, activityMultiplier: 1.725 });
      const extraActive = calculateEnergyTargets({ ...baseParams, activityMultiplier: 1.9 });

      expect(sedentary.dailyCalorieTarget).toBeLessThan(lightlyActive.dailyCalorieTarget);
      expect(lightlyActive.dailyCalorieTarget).toBeLessThan(moderatelyActive.dailyCalorieTarget);
      expect(moderatelyActive.dailyCalorieTarget).toBeLessThan(veryActive.dailyCalorieTarget);
      expect(veryActive.dailyCalorieTarget).toBeLessThan(extraActive.dailyCalorieTarget);
    });
  });

  describe('Goal Calorie & Protein Adjustments', () => {
    const baseParams = {
      weightKg: 70.0,
      heightCm: 175.0,
      birthDate: '1995-01-01',
      biologicalSex: 'male' as const,
      activityMultiplier: 1.55,
      referenceDate: deterministicDate,
    };

    it('should apply -500 deficit and 1.8g/kg protein for fat_loss', () => {
      const maintenance = calculateEnergyTargets({ ...baseParams, goal: 'maintenance' });
      const fatLoss = calculateEnergyTargets({ ...baseParams, goal: 'fat_loss' });

      expect(fatLoss.dailyCalorieTarget).toBe(maintenance.dailyCalorieTarget - 500);
      expect(fatLoss.proteinTargetGrams).toBe(Math.round(70 * 1.8 * 10) / 10);
    });

    it('should apply +300 surplus and 2.0g/kg protein for muscle_gain', () => {
      const maintenance = calculateEnergyTargets({ ...baseParams, goal: 'maintenance' });
      const muscleGain = calculateEnergyTargets({ ...baseParams, goal: 'muscle_gain' });

      expect(muscleGain.dailyCalorieTarget).toBe(maintenance.dailyCalorieTarget + 300);
      expect(muscleGain.proteinTargetGrams).toBe(70 * 2.0);
    });

    it('should apply -200 deficit and 2.0g/kg protein for recomposition', () => {
      const maintenance = calculateEnergyTargets({ ...baseParams, goal: 'maintenance' });
      const recomp = calculateEnergyTargets({ ...baseParams, goal: 'recomposition' });

      expect(recomp.dailyCalorieTarget).toBe(maintenance.dailyCalorieTarget - 200);
      expect(recomp.proteinTargetGrams).toBe(70 * 2.0);
    });

    it('should apply standard TDEE and 1.6g/kg protein for general_fitness and undecided', () => {
      const general = calculateEnergyTargets({ ...baseParams, goal: 'general_fitness' });
      const undecided = calculateEnergyTargets({ ...baseParams, goal: 'undecided' });

      expect(general.dailyCalorieTarget).toBe(undecided.dailyCalorieTarget);
      expect(general.proteinTargetGrams).toBe(Math.round(70 * 1.6 * 10) / 10);
    });
  });

  describe('Safety Floor Enforcements', () => {
    it('should strictly clamp daily calorie target to 1,200 kcal floor when deficit exceeds bounds', () => {
      // Petite female with low weight and low activity
      const result = calculateEnergyTargets({
        weightKg: 35.0,
        heightCm: 140.0,
        birthDate: '1990-01-01',
        biologicalSex: 'female',
        activityMultiplier: 1.2,
        goal: 'fat_loss',
        referenceDate: deterministicDate,
      });

      expect(result.dailyCalorieTarget).toBe(1200);
      expect(result.isEstimated).toBe(true);
      expect(result.proteinTargetGrams).toBeGreaterThan(0);
      expect(result.fatTargetGrams).toBeGreaterThan(0);
      expect(result.carbsTargetGrams).toBeGreaterThan(0);
    });
  });

  describe('Imperial Input Handling & Conversion Utilities (ADR-010)', () => {
    it('should convert pounds to kilograms accurately (lbsToKg)', () => {
      expect(lbsToKg(150)).toBe(68.04);
      expect(lbsToKg(200)).toBe(90.72);
      expect(lbsToKg(220.462)).toBe(100.0);
    });

    it('should convert kilograms to pounds accurately (kgToLbs)', () => {
      expect(kgToLbs(70)).toBe(154.3);
      expect(kgToLbs(100)).toBe(220.5);
    });

    it('should convert inches to centimeters accurately (inchesToCm)', () => {
      expect(inchesToCm(70)).toBe(177.8);
      expect(inchesToCm(60)).toBe(152.4);
    });

    it('should convert centimeters to inches accurately (cmToInches)', () => {
      expect(cmToInches(180)).toBe(70.9);
      expect(cmToInches(170)).toBe(66.9);
    });

    it('should accept imperial inputs (weightLbs, heightInches) and produce identical valid targets', () => {
      // 165.35 lbs ~= 75 kg, 70.87 inches ~= 180 cm
      const imperialResult = calculateEnergyTargets({
        weightLbs: 165.35,
        heightInches: 70.87,
        birthDate: '1998-01-01',
        biologicalSex: 'male',
        activityMultiplier: 1.55,
        goal: 'muscle_gain',
        unitSystem: 'imperial',
        referenceDate: deterministicDate,
      });

      const metricResult = calculateEnergyTargets({
        weightKg: 75.0,
        heightCm: 180.0,
        birthDate: '1998-01-01',
        biologicalSex: 'male',
        activityMultiplier: 1.55,
        goal: 'muscle_gain',
        referenceDate: deterministicDate,
      });

      expect(imperialResult.dailyCalorieTarget).toBe(metricResult.dailyCalorieTarget);
      expect(imperialResult.proteinTargetGrams).toBe(metricResult.proteinTargetGrams);
      expect(imperialResult.isEstimated).toBe(true);
    });
  });

  describe('Explicit Input Validation & Boundary Errors', () => {
    const validParams = {
      weightKg: 70.0,
      heightCm: 175.0,
      birthDate: '1995-01-01',
      biologicalSex: 'male' as const,
      activityMultiplier: 1.55,
      goal: 'maintenance' as const,
      referenceDate: deterministicDate,
    };

    it('should reject missing calculation parameter object', () => {
      // @ts-expect-error - defensive testing
      expect(() => calculateEnergyTargets(null)).toThrow(InvalidCalculationInputError);
    });

    it('should reject weight outside 30.0kg - 300.0kg boundary', () => {
      expect(() => calculateEnergyTargets({ ...validParams, weightKg: 25.0 })).toThrow(
        InvalidCalculationInputError
      );
      expect(() => calculateEnergyTargets({ ...validParams, weightKg: 350.0 })).toThrow(
        InvalidCalculationInputError
      );
    });

    it('should reject height outside 100.0cm - 250.0cm boundary', () => {
      expect(() => calculateEnergyTargets({ ...validParams, heightCm: 90.0 })).toThrow(
        InvalidCalculationInputError
      );
      expect(() => calculateEnergyTargets({ ...validParams, heightCm: 260.0 })).toThrow(
        InvalidCalculationInputError
      );
    });

    it('should reject missing weight and height', () => {
      expect(() =>
        calculateEnergyTargets({
          ...validParams,
          weightKg: undefined,
          weightLbs: undefined,
        })
      ).toThrow(InvalidCalculationInputError);

      expect(() =>
        calculateEnergyTargets({
          ...validParams,
          heightCm: undefined,
          heightInches: undefined,
        })
      ).toThrow(InvalidCalculationInputError);
    });

    it('should reject age below 13 or above 100', () => {
      // Born in 2020 -> 6 years old in 2026
      expect(() =>
        calculateEnergyTargets({ ...validParams, birthDate: '2020-01-01' })
      ).toThrow(InvalidCalculationInputError);

      // Born in 1910 -> 116 years old in 2026
      expect(() =>
        calculateEnergyTargets({ ...validParams, birthDate: '1910-01-01' })
      ).toThrow(InvalidCalculationInputError);
    });

    it('should reject malformed birth date strings', () => {
      expect(() =>
        calculateEnergyTargets({ ...validParams, birthDate: 'invalid-date' })
      ).toThrow(InvalidCalculationInputError);
      expect(() =>
        calculateEnergyTargets({ ...validParams, birthDate: '01/01/1995' })
      ).toThrow(InvalidCalculationInputError);
    });

    it('should reject unsupported biological sex, activity multiplier, or goal', () => {
      // @ts-expect-error - testing invalid biological sex
      expect(() => calculateEnergyTargets({ ...validParams, biologicalSex: 'alien' })).toThrow(
        InvalidCalculationInputError
      );

      expect(() => calculateEnergyTargets({ ...validParams, activityMultiplier: 3.5 })).toThrow(
        InvalidCalculationInputError
      );

      // @ts-expect-error - testing invalid goal
      expect(() => calculateEnergyTargets({ ...validParams, goal: 'bodybuilding_pro' })).toThrow(
        InvalidCalculationInputError
      );
    });
  });

  describe('Determinism & Precision Standards (DB-016)', () => {
    it('should produce strictly identical outputs for identical inputs across repeated invocations', () => {
      const input = {
        weightKg: 78.5,
        heightCm: 182.0,
        birthDate: '1992-05-14',
        biologicalSex: 'male' as const,
        activityMultiplier: 1.55,
        goal: 'fat_loss' as const,
        referenceDate: deterministicDate,
      };

      const run1 = calculateEnergyTargets(input);
      const run2 = calculateEnergyTargets(input);
      const run3 = calculateEnergyTargets(input);

      expect(run1).toEqual(run2);
      expect(run2).toEqual(run3);
    });

    it('should strictly format calories as integers and macros to 1 decimal place', () => {
      const result = calculateEnergyTargets({
        weightKg: 68.3,
        heightCm: 172.5,
        birthDate: '1994-08-22',
        biologicalSex: 'female',
        activityMultiplier: 1.375,
        goal: 'recomposition',
        referenceDate: deterministicDate,
      });

      expect(Number.isInteger(result.dailyCalorieTarget)).toBe(true);

      // Check 1 decimal place constraint (val * 10 is an integer)
      expect(Math.round(result.proteinTargetGrams * 10)).toBe(result.proteinTargetGrams * 10);
      expect(Math.round(result.fatTargetGrams * 10)).toBe(result.fatTargetGrams * 10);
      expect(Math.round(result.carbsTargetGrams * 10)).toBe(result.carbsTargetGrams * 10);
    });
  });
});

