import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { Types } from 'mongoose';
import { setupTestDatabase, teardownTestDatabase, clearTestDatabase } from '../helpers/db.helper.js';
import {
  NutritionLogModel,
  purgeNutritionUserData,
  INutritionLogItem,
} from '../../src/modules/nutrition/models/nutritionLog.model.js';
import { FoodItemModel } from '../../src/modules/nutrition/models/foodItem.model.js';

describe('NutritionLog Mongoose Model (Unit/Integration Tests)', () => {
  beforeAll(async () => {
    await setupTestDatabase();
    // Ensure NutritionLog compound unique index and ESR indexes are built in MongoDB
    await NutritionLogModel.init();
  });

  afterAll(async () => {
    await teardownTestDatabase();
  });

  beforeEach(async () => {
    await clearTestDatabase();
  });

  // Helper to create a valid logged item snapshot
  const createMockItem = (overrides: Partial<INutritionLogItem> = {}): INutritionLogItem => ({
    itemId: 'item_uuid_1001',
    foodId: new Types.ObjectId(),
    catalogId: 'food_eg_koshari_001',
    nameEn: 'Egyptian Koshari',
    nameAr: 'كشري مصري',
    portionId: 'portion_koshari_small',
    servingUnitNameEn: 'Small Plate',
    servingUnitNameAr: 'طبق صغير',
    servingQuantity: 1.0,
    servingWeightGrams: 250.0,
    calories: 413,
    proteinGrams: 13.0,
    carbsGrams: 77.5,
    fatGrams: 6.3,
    fiberGrams: 9.5,
    isQuickAdd: false,
    isEstimated: true,
    loggedAt: new Date('2026-11-03T08:00:00.000Z'),
    ...overrides,
  });

  describe('1. Valid Nutrition Log Creation & Defaults', () => {
    it('should create a minimal nutrition log with default slots, zeros, and schema version', async () => {
      const userId = new Types.ObjectId();
      const date = '2026-11-03';

      const log = await NutritionLogModel.create({
        userId,
        date,
      });

      expect(log._id).toBeDefined();
      expect(log.userId.toString()).toBe(userId.toString());
      expect(log.date).toBe('2026-11-03');
      expect(log.timezoneOffsetMinutes).toBe(0);
      expect(log.dailyTotalCalories).toBe(0);
      expect(log.dailyTotalProtein).toBe(0);
      expect(log.dailyTotalCarbs).toBe(0);
      expect(log.dailyTotalFat).toBe(0);
      expect(log.isEstimated).toBe(true);
      expect(log.schemaVersion).toBe(1);

      // Verify all 4 slots are defaulted with empty item lists and zero totals
      expect(log.slots.breakfast.items).toEqual([]);
      expect(log.slots.breakfast.slotTotalCalories).toBe(0);
      expect(log.slots.breakfast.slotTotalProtein).toBe(0);
      expect(log.slots.breakfast.slotTotalCarbs).toBe(0);
      expect(log.slots.breakfast.slotTotalFat).toBe(0);

      expect(log.slots.lunch.items).toEqual([]);
      expect(log.slots.lunch.slotTotalCalories).toBe(0);

      expect(log.slots.dinner.items).toEqual([]);
      expect(log.slots.dinner.slotTotalCalories).toBe(0);

      expect(log.slots.snack.items).toEqual([]);
      expect(log.slots.snack.slotTotalCalories).toBe(0);

      // Verify timestamps
      expect(log.createdAt).toBeInstanceOf(Date);
      expect(log.updatedAt).toBeInstanceOf(Date);
    });

    it('should serialize to JSON with virtual id and remove internal _id and __v', async () => {
      const log = await NutritionLogModel.create({
        userId: new Types.ObjectId(),
        date: '2026-11-03',
      });

      const json = log.toJSON();
      expect(json.id).toBe(log._id.toString());
      expect((json as Record<string, unknown>)['_id']).toBeUndefined();
      expect((json as Record<string, unknown>)['__v']).toBeUndefined();
    });
  });

  describe('2. Required Fields Validation', () => {
    it('should fail validation if userId is missing', async () => {
      const log = new NutritionLogModel({
        date: '2026-11-03',
      });

      await expect(log.validate()).rejects.toThrow(/User ID reference is required/i);
    });

    it('should fail validation if date is missing', async () => {
      const log = new NutritionLogModel({
        userId: new Types.ObjectId(),
      });

      await expect(log.validate()).rejects.toThrow(/Local date YYYY-MM-DD is required/i);
    });
  });

  describe('3. Invalid Field Values & Constraints', () => {
    it.each([
      '2026/11/03',
      '03-11-2026',
      '2026-1-3',
      'invalid-date',
      '2026-13-01',
      '2026-00-10',
      '2026-05-32',
      '2026-05-00',
    ])('should reject invalid date format "%s"', async (invalidDate) => {
      const log = new NutritionLogModel({
        userId: new Types.ObjectId(),
        date: invalidDate,
      });

      await expect(log.validate()).rejects.toThrow(/Date must be formatted as YYYY-MM-DD/i);
    });

    it('should reject negative dailyTotalCalories', async () => {
      const log = new NutritionLogModel({
        userId: new Types.ObjectId(),
        date: '2026-11-03',
        dailyTotalCalories: -50,
      });

      await expect(log.validate()).rejects.toThrow(/Daily calories cannot be negative/i);
    });

    it('should reject negative daily totals for protein, carbs, or fat', async () => {
      const log = new NutritionLogModel({
        userId: new Types.ObjectId(),
        date: '2026-11-03',
        dailyTotalProtein: -1,
      });
      await expect(log.validate()).rejects.toThrow(/Daily protein cannot be negative/i);

      const logCarbs = new NutritionLogModel({
        userId: new Types.ObjectId(),
        date: '2026-11-03',
        dailyTotalCarbs: -2.5,
      });
      await expect(logCarbs.validate()).rejects.toThrow(/Daily carbohydrates cannot be negative/i);

      const logFat = new NutritionLogModel({
        userId: new Types.ObjectId(),
        date: '2026-11-03',
        dailyTotalFat: -0.1,
      });
      await expect(logFat.validate()).rejects.toThrow(/Daily fat cannot be negative/i);
    });

    it('should reject isEstimated: false upholding Core Invariant 2', async () => {
      const log = new NutritionLogModel({
        userId: new Types.ObjectId(),
        date: '2026-11-03',
        isEstimated: false,
      });

      await expect(log.validate()).rejects.toThrow(/isEstimated must be true per Core Invariant 2/i);
    });
  });

  describe('4. Embedded Meal & Item Validation', () => {
    it('should persist valid items inside meal slots', async () => {
      const userId = new Types.ObjectId();
      const item = createMockItem();

      const log = await NutritionLogModel.create({
        userId,
        date: '2026-11-03',
        timezoneOffsetMinutes: -120,
        slots: {
          breakfast: {
            slotTotalCalories: 413,
            slotTotalProtein: 13.0,
            slotTotalCarbs: 77.5,
            slotTotalFat: 6.3,
            items: [item],
          },
        },
        dailyTotalCalories: 413,
        dailyTotalProtein: 13.0,
        dailyTotalCarbs: 77.5,
        dailyTotalFat: 6.3,
      });

      const retrieved = await NutritionLogModel.findById(log._id);
      expect(retrieved).not.toBeNull();
      expect(retrieved!.slots.breakfast.items).toHaveLength(1);
      expect(retrieved!.slots.breakfast.items[0]!.itemId).toBe('item_uuid_1001');
      expect(retrieved!.slots.breakfast.items[0]!.nameEn).toBe('Egyptian Koshari');
      expect(retrieved!.slots.breakfast.items[0]!.nameAr).toBe('كشري مصري');
      expect(retrieved!.slots.breakfast.items[0]!.calories).toBe(413);
      expect(retrieved!.slots.breakfast.items[0]!.fiberGrams).toBe(9.5);
    });

    it('should reject an item missing required fields', async () => {
      const userId = new Types.ObjectId();
      const incompleteItem = {
        itemId: 'item_missing_names',
        // missing nameEn, nameAr, calories, etc.
      };

      const log = new NutritionLogModel({
        userId,
        date: '2026-11-03',
        slots: {
          lunch: {
            items: [incompleteItem as any],
          },
        },
      });

      await expect(log.validate()).rejects.toThrow();
    });

    it('should reject an item with negative nutritional values', async () => {
      const userId = new Types.ObjectId();
      const invalidItem = createMockItem({ calories: -100 });

      const log = new NutritionLogModel({
        userId,
        date: '2026-11-03',
        slots: {
          dinner: {
            items: [invalidItem],
          },
        },
      });

      await expect(log.validate()).rejects.toThrow(/Calories cannot be negative/i);
    });

    it('should reject an item with serving quantity zero or negative', async () => {
      const userId = new Types.ObjectId();
      const zeroQtyItem = createMockItem({ servingQuantity: 0 });

      const log = new NutritionLogModel({
        userId,
        date: '2026-11-03',
        slots: {
          snack: {
            items: [zeroQtyItem],
          },
        },
      });

      await expect(log.validate()).rejects.toThrow(/Quantity must be greater than 0/i);
    });

    it('should reject an item with isEstimated: false per Core Invariant 2', async () => {
      const userId = new Types.ObjectId();
      const unestimatedItem = createMockItem({ isEstimated: false });

      const log = new NutritionLogModel({
        userId,
        date: '2026-11-03',
        slots: {
          breakfast: {
            items: [unestimatedItem],
          },
        },
      });

      await expect(log.validate()).rejects.toThrow(/isEstimated must be true per Core Invariant 2/i);
    });
  });

  describe('5. Setter Precision & Rounding (DB-016)', () => {
    it('should round calories to integer and macros to 1 decimal place', async () => {
      const item = createMockItem({
        calories: 360.7,
        proteinGrams: 14.256,
        carbsGrams: 50.849,
        fatGrams: 8.441,
        fiberGrams: 3.19,
        servingWeightGrams: 125.44,
      });

      const log = await NutritionLogModel.create({
        userId: new Types.ObjectId(),
        date: '2026-11-03',
        dailyTotalCalories: 360.7,
        dailyTotalProtein: 14.256,
        dailyTotalCarbs: 50.849,
        dailyTotalFat: 8.441,
        slots: {
          breakfast: {
            slotTotalCalories: 360.7,
            slotTotalProtein: 14.256,
            slotTotalCarbs: 50.849,
            slotTotalFat: 8.441,
            items: [item],
          },
        },
      });

      const retrieved = await NutritionLogModel.findById(log._id);
      expect(retrieved).not.toBeNull();

      // Item level rounding
      const savedItem = retrieved!.slots.breakfast.items[0]!;
      expect(savedItem.calories).toBe(361);
      expect(savedItem.proteinGrams).toBe(14.3);
      expect(savedItem.carbsGrams).toBe(50.8);
      expect(savedItem.fatGrams).toBe(8.4);
      expect(savedItem.fiberGrams).toBe(3.2);
      expect(savedItem.servingWeightGrams).toBe(125.4);

      // Slot level rounding
      expect(retrieved!.slots.breakfast.slotTotalCalories).toBe(361);
      expect(retrieved!.slots.breakfast.slotTotalProtein).toBe(14.3);
      expect(retrieved!.slots.breakfast.slotTotalCarbs).toBe(50.8);
      expect(retrieved!.slots.breakfast.slotTotalFat).toBe(8.4);

      // Daily totals rounding
      expect(retrieved!.dailyTotalCalories).toBe(361);
      expect(retrieved!.dailyTotalProtein).toBe(14.3);
      expect(retrieved!.dailyTotalCarbs).toBe(50.8);
      expect(retrieved!.dailyTotalFat).toBe(8.4);
    });
  });

  describe('6. Compound Unique Index Constraint ({ userId, date })', () => {
    it('should reject duplicate log for the same user on the same date with E11000 duplicate key error', async () => {
      const userId = new Types.ObjectId();
      const date = '2026-11-03';

      // First document creates successfully
      await NutritionLogModel.create({
        userId,
        date,
      });

      // Second document for the exact same userId and date MUST fail with MongoServerError E11000
      await expect(
        NutritionLogModel.create({
          userId,
          date,
        })
      ).rejects.toThrow(/duplicate key error|E11000/i);
    });

    it('should allow the same user to have logs for different dates', async () => {
      const userId = new Types.ObjectId();

      const logDay1 = await NutritionLogModel.create({
        userId,
        date: '2026-11-01',
      });
      const logDay2 = await NutritionLogModel.create({
        userId,
        date: '2026-11-02',
      });
      const logDay3 = await NutritionLogModel.create({
        userId,
        date: '2026-11-03',
      });

      expect(logDay1._id).toBeDefined();
      expect(logDay2._id).toBeDefined();
      expect(logDay3._id).toBeDefined();

      const userLogs = await NutritionLogModel.find({ userId });
      expect(userLogs).toHaveLength(3);
    });

    it('should allow different users to have logs on the same date', async () => {
      const userA = new Types.ObjectId();
      const userB = new Types.ObjectId();
      const date = '2026-11-03';

      const logUserA = await NutritionLogModel.create({
        userId: userA,
        date,
      });

      const logUserB = await NutritionLogModel.create({
        userId: userB,
        date,
      });

      expect(logUserA._id.toString()).not.toBe(logUserB._id.toString());
      expect(logUserA.userId.toString()).toBe(userA.toString());
      expect(logUserB.userId.toString()).toBe(userB.toString());
      expect(logUserA.date).toBe(date);
      expect(logUserB.date).toBe(date);
    });
  });

  describe('7. Snapshot Immutability (Decoupled from Catalog Changes)', () => {
    it('should preserve historical logged nutritional snapshot when food catalog is updated', async () => {
      // 1. Create a food item in food_library
      const catalogFood = await FoodItemModel.create({
        catalogId: 'food_test_falafel_001',
        catalogVersion: '1.0.0',
        nameEn: 'Falafel Piece',
        nameAr: 'قرص طعمية',
        category: 'legumes',
        servingSizeGrams: 30,
        servingUnitNameEn: 'Piece',
        servingUnitNameAr: 'قرص',
        caloriesPer100g: 333,
        proteinPer100g: 13.3,
        carbsPer100g: 31.8,
        fatPer100g: 17.8,
        sourceOrganization: 'National Nutrition Institute',
        sourceDataset: 'Food Composition Tables for Egypt',
        reviewDate: '2026-11-01',
        preparationState: 'fried',
        confidenceLevel: 'medium',
        isVerified: true,
        isEstimated: true,
        isArchived: false,
      });

      // 2. User logs this food with a captured snapshot
      const userId = new Types.ObjectId();
      const logItem = createMockItem({
        foodId: catalogFood._id,
        catalogId: catalogFood.catalogId,
        nameEn: catalogFood.nameEn,
        nameAr: catalogFood.nameAr,
        calories: 100, // 30g serving calculation snapshot
        proteinGrams: 4.0,
        carbsGrams: 9.5,
        fatGrams: 5.3,
      });

      const userLog = await NutritionLogModel.create({
        userId,
        date: '2026-11-03',
        slots: {
          breakfast: {
            items: [logItem],
            slotTotalCalories: 100,
            slotTotalProtein: 4.0,
            slotTotalCarbs: 9.5,
            slotTotalFat: 5.3,
          },
        },
      });

      // 3. Later, the catalog item is modified (e.g. recipe/macro re-evaluated)
      catalogFood.nameEn = 'Egyptian Falafel (Taameya)';
      catalogFood.caloriesPer100g = 450;
      catalogFood.proteinPer100g = 18.0;
      await catalogFood.save();

      // 4. Re-query the nutrition log from database
      const reloadedLog = await NutritionLogModel.findById(userLog._id);
      expect(reloadedLog).not.toBeNull();

      const snapshot = reloadedLog!.slots.breakfast.items[0]!;
      // Historical log snapshot MUST remain exactly as recorded at log time ('Falafel Piece', not updated 'Egyptian Falafel (Taameya)')
      expect(snapshot.nameEn).toBe('Falafel Piece');
      expect(snapshot.calories).toBe(100);
      expect(snapshot.proteinGrams).toBe(4.0);
      expect(snapshot.carbsGrams).toBe(9.5);
      expect(snapshot.fatGrams).toBe(5.3);

      // Even if catalogFood changed in DB, snapshot is completely independent
      const latestCatalog = await FoodItemModel.findById(catalogFood._id);
      expect(latestCatalog!.nameEn).toBe('Egyptian Falafel (Taameya)');
      expect(latestCatalog!.caloriesPer100g).toBe(450);
      expect(snapshot.nameEn).toBe('Falafel Piece');
      expect(snapshot.calories).toBe(100);
    });
  });

  describe('8. Account Deletion Data Purge (DB-018)', () => {
    it('should purge all nutrition logs for a given user while preserving other users data', async () => {
      const userA = new Types.ObjectId();
      const userB = new Types.ObjectId();

      // Create 3 logs for User A
      await NutritionLogModel.create({ userId: userA, date: '2026-11-01' });
      await NutritionLogModel.create({ userId: userA, date: '2026-11-02' });
      await NutritionLogModel.create({ userId: userA, date: '2026-11-03' });

      // Create 2 logs for User B
      await NutritionLogModel.create({ userId: userB, date: '2026-11-02' });
      await NutritionLogModel.create({ userId: userB, date: '2026-11-03' });

      expect(await NutritionLogModel.countDocuments({ userId: userA })).toBe(3);
      expect(await NutritionLogModel.countDocuments({ userId: userB })).toBe(2);

      // Execute account deletion purge for User A
      const deletedCount = await purgeNutritionUserData(userA);
      expect(deletedCount).toBe(3);

      // Verify User A logs are completely gone
      expect(await NutritionLogModel.countDocuments({ userId: userA })).toBe(0);

      // Verify User B logs are completely untouched
      expect(await NutritionLogModel.countDocuments({ userId: userB })).toBe(2);
    });
  });

  describe('9. MongoDB Index Verification', () => {
    it('should verify that uniq_user_nutrition_date and idx_user_nutrition_history indexes exist', async () => {
      const indexes = await NutritionLogModel.collection.indexes();

      const uniqueCompoundIndex = indexes.find((idx) => idx.name === 'uniq_user_nutrition_date');
      expect(uniqueCompoundIndex).toBeDefined();
      expect(uniqueCompoundIndex!.key).toEqual({ userId: 1, date: 1 });
      expect(uniqueCompoundIndex!.unique).toBe(true);

      const historyIndex = indexes.find((idx) => idx.name === 'idx_user_nutrition_history');
      expect(historyIndex).toBeDefined();
      expect(historyIndex!.key).toEqual({ userId: 1, date: -1 });
    });
  });

  describe('10. Quick Add Item Persistence (DEC-010)', () => {
    it('should persist a Quick Add item with foodId: null and isQuickAdd: true without catalog references', async () => {
      const userId = new Types.ObjectId();
      const quickAddItem: INutritionLogItem = {
        itemId: 'quick_add_uuid_001',
        foodId: null,
        catalogId: null,
        nameEn: 'Homemade Protein Smoothie',
        nameAr: 'سموذي بروتين منزلي',
        portionId: null,
        servingUnitNameEn: 'Serving',
        servingUnitNameAr: 'حصة',
        servingQuantity: 1,
        servingWeightGrams: 350.0,
        calories: 320,
        proteinGrams: 30.0,
        carbsGrams: 35.0,
        fatGrams: 6.0,
        fiberGrams: 4.5,
        isQuickAdd: true,
        isEstimated: true,
        loggedAt: new Date('2026-11-03T10:30:00.000Z'),
      };

      const log = await NutritionLogModel.create({
        userId,
        date: '2026-11-03',
        slots: {
          snack: {
            slotTotalCalories: 320,
            slotTotalProtein: 30.0,
            slotTotalCarbs: 35.0,
            slotTotalFat: 6.0,
            items: [quickAddItem],
          },
        },
        dailyTotalCalories: 320,
        dailyTotalProtein: 30.0,
        dailyTotalCarbs: 35.0,
        dailyTotalFat: 6.0,
      });

      const retrieved = await NutritionLogModel.findById(log._id);
      expect(retrieved).not.toBeNull();
      const item = retrieved!.slots.snack.items[0]!;
      expect(item.foodId).toBeNull();
      expect(item.catalogId).toBeNull();
      expect(item.portionId).toBeNull();
      expect(item.isQuickAdd).toBe(true);
      expect(item.nameEn).toBe('Homemade Protein Smoothie');
      expect(item.calories).toBe(320);
      expect(item.proteinGrams).toBe(30.0);
    });
  });
});
