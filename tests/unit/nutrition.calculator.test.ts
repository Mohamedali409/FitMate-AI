import { describe, it, expect } from 'vitest';
import {
  scaleNutrients,
  calculateItemNutrition,
  aggregateNutritionItems,
  calculateRemainingBudget,
} from '../../src/modules/nutrition/services/nutrition.calculator.js';

describe('Pure Nutrition Calculator (Unit Tests)', () => {
  describe('scaleNutrients', () => {
    const referenceChickenBreast = {
      calories: 165,
      protein: 31.0,
      carbs: 0.0,
      fat: 3.6,
      fiber: 0.0,
    };

    it('should scale reference 100g nutrients proportionally for 150g serving', () => {
      // 150g = 1.5x multiplier
      // calories: 165 * 1.5 = 247.5 -> 248
      // protein: 31.0 * 1.5 = 46.5
      // carbs: 0.0
      // fat: 3.6 * 1.5 = 5.4
      const scaled = scaleNutrients(referenceChickenBreast, 150.0);

      expect(scaled.servingWeightGrams).toBe(150.0);
      expect(scaled.calories).toBe(248);
      expect(scaled.proteinGrams).toBe(46.5);
      expect(scaled.carbsGrams).toBe(0.0);
      expect(scaled.fatGrams).toBe(5.4);
      expect(scaled.isEstimated).toBe(true);
    });

    it('should scale composite dish with fiber correctly (Egyptian Koshari)', () => {
      const referenceKoshari = {
        calories: 165,
        protein: 5.2,
        carbs: 31.0,
        fat: 2.5,
        fiber: 3.8,
      };

      // 250g serving (Small Plate) -> 2.5x
      // calories: 165 * 2.5 = 412.5 -> 413
      // protein: 5.2 * 2.5 = 13.0
      // carbs: 31.0 * 2.5 = 77.5
      // fat: 2.5 * 2.5 = 6.25 -> 6.3
      // fiber: 3.8 * 2.5 = 9.5
      const scaled = scaleNutrients(referenceKoshari, 250.0);

      expect(scaled.calories).toBe(413);
      expect(scaled.proteinGrams).toBe(13.0);
      expect(scaled.carbsGrams).toBe(77.5);
      expect(scaled.fatGrams).toBe(6.3);
      expect(scaled.fiberGrams).toBe(9.5);
      expect(scaled.isEstimated).toBe(true);
    });

    it('should reject negative serving weight in grams', () => {
      expect(() => scaleNutrients(referenceChickenBreast, -50)).toThrow(
        'Serving weight in grams cannot be negative'
      );
    });
  });

  describe('calculateItemNutrition', () => {
    it('should scale item based on standard portion gram weight and quantity', () => {
      // Small plate of Koshari (250g), 1.5 servings -> 375g total
      const result = calculateItemNutrition({
        caloriesPer100g: 165,
        proteinPer100g: 5.2,
        carbsPer100g: 31.0,
        fatPer100g: 2.5,
        fiberPer100g: 3.8,
        portionGramWeight: 250.0,
        servingQuantity: 1.5,
      });

      expect(result.servingWeightGrams).toBe(375.0);
      // 375g = 3.75x
      // calories: 165 * 3.75 = 618.75 -> 619
      expect(result.calories).toBe(619);
      expect(result.proteinGrams).toBe(19.5);
      expect(result.isEstimated).toBe(true);
    });

    it('should prioritize explicit customGrams override over portion weight (Decision 4)', () => {
      // Portion weight is 250g, but user specifies customGrams: 320g, quantity 1.0
      const result = calculateItemNutrition({
        caloriesPer100g: 100,
        proteinPer100g: 10.0,
        carbsPer100g: 10.0,
        fatPer100g: 2.0,
        portionGramWeight: 250.0,
        customGrams: 320.0,
        servingQuantity: 1.0,
      });

      expect(result.servingWeightGrams).toBe(320.0);
      expect(result.calories).toBe(320);
      expect(result.proteinGrams).toBe(32.0);
    });

    it('should reject non-positive serving quantities', () => {
      expect(() =>
        calculateItemNutrition({
          caloriesPer100g: 100,
          proteinPer100g: 10,
          carbsPer100g: 10,
          fatPer100g: 2,
          servingQuantity: 0,
        })
      ).toThrow('Serving quantity must be greater than zero');
    });
  });

  describe('aggregateNutritionItems', () => {
    it('should sum multiple food items preserving precision before final rounding', () => {
      const items = [
        { calories: 155, proteinGrams: 12.6, carbsGrams: 1.1, fatGrams: 10.6 }, // 1 Boiled egg
        { calories: 260, proteinGrams: 8.5, carbsGrams: 52.0, fatGrams: 1.5, fiberGrams: 4.5 }, // 1 Baladi bread
        { calories: 98, proteinGrams: 16.5, carbsGrams: 3.2, fatGrams: 2.0 }, // Gebna Quraish
      ];

      const aggregate = aggregateNutritionItems(items);

      // Total calories: 155 + 260 + 98 = 513
      expect(aggregate.calories).toBe(513);
      // Total protein: 12.6 + 8.5 + 16.5 = 37.6
      expect(aggregate.proteinGrams).toBe(37.6);
      // Total carbs: 1.1 + 52.0 + 3.2 = 56.3
      expect(aggregate.carbsGrams).toBe(56.3);
      // Total fat: 10.6 + 1.5 + 2.0 = 14.1
      expect(aggregate.fatGrams).toBe(14.1);
      // Fiber: 4.5
      expect(aggregate.fiberGrams).toBe(4.5);
      expect(aggregate.isEstimated).toBe(true);
    });

    it('should handle empty items array gracefully with zeroes', () => {
      const empty = aggregateNutritionItems([]);
      expect(empty.calories).toBe(0);
      expect(empty.proteinGrams).toBe(0.0);
      expect(empty.carbsGrams).toBe(0.0);
      expect(empty.fatGrams).toBe(0.0);
      expect(empty.fiberGrams).toBeUndefined();
      expect(empty.isEstimated).toBe(true);
    });
  });

  describe('calculateRemainingBudget', () => {
    it('should calculate remaining budget accurately when under targets', () => {
      const targets = { calories: 2000, proteinGrams: 150.0, carbsGrams: 200.0, fatGrams: 65.0 };
      const consumed = { calories: 683, proteinGrams: 34.0, carbsGrams: 81.0, fatGrams: 25.5 };

      const remaining = calculateRemainingBudget(targets, consumed);

      expect(remaining.calories).toBe(1317);
      expect(remaining.proteinGrams).toBe(116.0);
      expect(remaining.carbsGrams).toBe(119.0);
      expect(remaining.fatGrams).toBe(39.5);
    });

    it('should return negative values when consumed exceeds targets', () => {
      const targets = { calories: 1800, proteinGrams: 120.0, carbsGrams: 150.0, fatGrams: 50.0 };
      const consumed = { calories: 2000, proteinGrams: 130.5, carbsGrams: 170.0, fatGrams: 60.2 };

      const remaining = calculateRemainingBudget(targets, consumed);

      expect(remaining.calories).toBe(-200);
      expect(remaining.proteinGrams).toBe(-10.5);
      expect(remaining.carbsGrams).toBe(-20.0);
      expect(remaining.fatGrams).toBe(-10.2);
    });
  });
});

