import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { setupTestDatabase, teardownTestDatabase, clearTestDatabase } from '../helpers/db.helper.js';
import { seedFoodCatalog } from '../../src/modules/nutrition/seeds/seedFoods.js';
import { FoodItemModel } from '../../src/modules/nutrition/models/foodItem.model.js';

describe('Food Catalog Seeding (Integration Tests)', () => {
  beforeAll(async () => {
    await setupTestDatabase();
  });

  afterAll(async () => {
    await teardownTestDatabase();
  });

  beforeEach(async () => {
    await clearTestDatabase();
  });

  it('should seed food catalog idempotently without creating duplicates on repeated runs', async () => {
    // First seeding pass
    const firstResult = await seedFoodCatalog();
    expect(firstResult.errors).toHaveLength(0);
    expect(firstResult.inserted).toBe(firstResult.total);
    expect(firstResult.updated).toBe(0);
    expect(firstResult.total).toBeGreaterThan(40);

    const initialDbCount = await FoodItemModel.countDocuments();
    expect(initialDbCount).toBe(firstResult.total);

    // Second seeding pass (must update, zero new inserts, zero duplicate key errors)
    const secondResult = await seedFoodCatalog();
    expect(secondResult.errors).toHaveLength(0);
    expect(secondResult.inserted).toBe(0);
    expect(secondResult.updated).toBe(secondResult.total);

    const postSecondDbCount = await FoodItemModel.countDocuments();
    expect(postSecondDbCount).toBe(initialDbCount);
  });

  it('should verify that all seeded food items uphold Core Invariant 2 (isEstimated: true)', async () => {
    await seedFoodCatalog();

    const unestimatedItems = await FoodItemModel.find({ isEstimated: { $ne: true } });
    expect(unestimatedItems).toHaveLength(0);

    const totalCount = await FoodItemModel.countDocuments();
    expect(totalCount).toBeGreaterThan(40);
  });

  it('should verify that all 9 provenance fields are present on every seeded item', async () => {
    await seedFoodCatalog();

    const allFoods = await FoodItemModel.find().lean();
    expect(allFoods.length).toBeGreaterThan(40);

    for (const food of allFoods) {
      // 1. sourceOrganization
      expect(food.sourceOrganization).toBeDefined();
      expect(food.sourceOrganization.length).toBeGreaterThan(0);

      // 2. sourceDataset
      expect(food.sourceDataset).toBeDefined();
      expect(food.sourceDataset.length).toBeGreaterThan(0);

      // 3. sourceRecordId (null for unverified NNI, string for verified USDA)
      if (food.isVerified) {
        expect(food.sourceRecordId).not.toBeNull();
        expect(typeof food.sourceRecordId).toBe('string');
      } else {
        expect(food.sourceRecordId).toBeNull();
      }

      // 4. reviewDate (YYYY-MM-DD)
      expect(food.reviewDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);

      // 5. preparationState
      expect(['raw', 'cooked', 'boiled', 'grilled', 'fried', 'baked', 'canned']).toContain(
        food.preparationState
      );

      // 6. confidenceLevel
      expect(['high', 'medium']).toContain(food.confidenceLevel);

      // 7. isVerified
      expect(typeof food.isVerified).toBe('boolean');

      // 8. isEstimated
      expect(food.isEstimated).toBe(true);

      // 9. schemaVersion
      expect(food.schemaVersion).toBe(1);

      // Search tokens pre-computed and lowercased (Condition AUD-003)
      expect(Array.isArray(food.searchTokens)).toBe(true);
      expect(food.searchTokens.length).toBeGreaterThan(0);
      for (const token of food.searchTokens) {
        expect(token).toBe(token.toLowerCase());
      }
    }
  });

  it('should verify standard portions structure for each food item', async () => {
    await seedFoodCatalog();

    const allFoods = await FoodItemModel.find().lean();

    for (const food of allFoods) {
      expect(Array.isArray(food.standardPortions)).toBe(true);
      if (food.standardPortions.length > 0) {
        for (const portion of food.standardPortions) {
          expect(portion.portionId).toBeDefined();
          expect(portion.unitNameEn).toBeDefined();
          expect(portion.unitNameAr).toBeDefined();
          expect(portion.gramWeight).toBeGreaterThan(0);
        }
      }
    }
  });
});

