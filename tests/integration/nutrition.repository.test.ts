import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { Types } from 'mongoose';
import { setupTestDatabase, teardownTestDatabase, clearTestDatabase } from '../helpers/db.helper.js';
import { NutritionRepository, nutritionRepository } from '../../src/modules/nutrition/nutrition.repository.js';
import {
  NutritionLogModel,
  INutritionLogItem,
} from '../../src/modules/nutrition/models/nutritionLog.model.js';

describe('NutritionRepository Integration Tests (Live MongoDB)', () => {
  let repo: NutritionRepository;

  beforeAll(async () => {
    await setupTestDatabase();
    await NutritionLogModel.init();
    repo = nutritionRepository;
  });

  afterAll(async () => {
    await teardownTestDatabase();
  });

  beforeEach(async () => {
    await clearTestDatabase();
  });

  const createMockItem = (overrides: Partial<INutritionLogItem> = {}): INutritionLogItem => ({
    itemId: 'item_test_001',
    foodId: new Types.ObjectId(),
    catalogId: 'food_eg_foul_001',
    nameEn: 'Foul Mudammas',
    nameAr: 'فول مدمس',
    portionId: null,
    servingUnitNameEn: 'Plate',
    servingUnitNameAr: 'طبق',
    servingQuantity: 1,
    servingWeightGrams: 200.0,
    calories: 260,
    proteinGrams: 16.0,
    carbsGrams: 38.0,
    fatGrams: 4.5,
    fiberGrams: 10.0,
    isQuickAdd: false,
    isEstimated: true,
    loggedAt: new Date('2026-11-03T08:00:00.000Z'),
    ...overrides,
  });

  describe('1. findOrCreateDiary & Concurrency Collision Recovery', () => {
    it('should create a fresh daily diary with 4 empty slots and 0 totals', async () => {
      const userId = new Types.ObjectId();
      const date = '2026-11-03';

      const diary = await repo.findOrCreateDiary(userId, date, -120);

      expect(diary).toBeDefined();
      expect(diary.userId.toString()).toBe(userId.toString());
      expect(diary.date).toBe(date);
      expect(diary.timezoneOffsetMinutes).toBe(-120);
      expect(diary.dailyTotalCalories).toBe(0);
      expect(diary.slots.breakfast.items).toEqual([]);
      expect(diary.slots.lunch.items).toEqual([]);
      expect(diary.slots.dinner.items).toEqual([]);
      expect(diary.slots.snack.items).toEqual([]);
    });

    it('should return existing diary idempotently on subsequent calls without duplicates', async () => {
      const userId = new Types.ObjectId();
      const date = '2026-11-03';

      const first = await repo.findOrCreateDiary(userId, date);
      const second = await repo.findOrCreateDiary(userId, date);

      expect(first._id.toString()).toBe(second._id.toString());
      const count = await NutritionLogModel.countDocuments({ userId, date });
      expect(count).toBe(1);
    });

    it('should recover from MongoDB E11000 duplicate key collision during concurrent diary creation', async () => {
      const userId = new Types.ObjectId();
      const date = '2026-11-03';

      // Simulate simultaneous creation by launching parallel findOrCreateDiary calls
      const [diaryA, diaryB] = await Promise.all([
        repo.findOrCreateDiary(userId, date),
        repo.findOrCreateDiary(userId, date),
      ]);

      expect(diaryA._id.toString()).toBe(diaryB._id.toString());
      const totalDocs = await NutritionLogModel.countDocuments({ userId, date });
      expect(totalDocs).toBe(1);
    });

    it('should isolate logs for different users on the same date', async () => {
      const userA = new Types.ObjectId();
      const userB = new Types.ObjectId();
      const date = '2026-11-03';

      const diaryA = await repo.findOrCreateDiary(userA, date);
      const diaryB = await repo.findOrCreateDiary(userB, date);

      expect(diaryA._id.toString()).not.toBe(diaryB._id.toString());
      expect(await NutritionLogModel.countDocuments({ date })).toBe(2);
    });
  });

  describe('2. addItemToSlot & Totals Recalculation', () => {
    it('should add item to slot and automatically recalculate slot and daily totals', async () => {
      const userId = new Types.ObjectId();
      const date = '2026-11-03';
      const item = createMockItem({
        calories: 260,
        proteinGrams: 16.0,
        carbsGrams: 38.0,
        fatGrams: 4.5,
      });

      const { log, item: addedItem } = await repo.addItemToSlot(userId, date, 'breakfast', item);

      expect(addedItem.itemId).toBe('item_test_001');
      expect(log.slots.breakfast.items).toHaveLength(1);
      expect(log.slots.breakfast.slotTotalCalories).toBe(260);
      expect(log.slots.breakfast.slotTotalProtein).toBe(16.0);
      expect(log.slots.breakfast.slotTotalCarbs).toBe(38.0);
      expect(log.slots.breakfast.slotTotalFat).toBe(4.5);

      expect(log.dailyTotalCalories).toBe(260);
      expect(log.dailyTotalProtein).toBe(16.0);
      expect(log.dailyTotalCarbs).toBe(38.0);
      expect(log.dailyTotalFat).toBe(4.5);
    });

    it('should aggregate multiple items across different slots accurately', async () => {
      const userId = new Types.ObjectId();
      const date = '2026-11-03';

      const breakfastItem = createMockItem({
        itemId: 'item_bfast_001',
        calories: 200,
        proteinGrams: 10.0,
        carbsGrams: 30.0,
        fatGrams: 5.0,
      });
      const lunchItem = createMockItem({
        itemId: 'item_lunch_001',
        calories: 500,
        proteinGrams: 40.0,
        carbsGrams: 50.0,
        fatGrams: 15.0,
      });

      await repo.addItemToSlot(userId, date, 'breakfast', breakfastItem);
      const { log } = await repo.addItemToSlot(userId, date, 'lunch', lunchItem);

      expect(log.slots.breakfast.items).toHaveLength(1);
      expect(log.slots.breakfast.slotTotalCalories).toBe(200);

      expect(log.slots.lunch.items).toHaveLength(1);
      expect(log.slots.lunch.slotTotalCalories).toBe(500);

      expect(log.dailyTotalCalories).toBe(700);
      expect(log.dailyTotalProtein).toBe(50.0);
      expect(log.dailyTotalCarbs).toBe(80.0);
      expect(log.dailyTotalFat).toBe(20.0);
    });
  });

  describe('3. updateItemInDiary & Slot Migration', () => {
    it('should update item properties and recalculate affected totals', async () => {
      const userId = new Types.ObjectId();
      const date = '2026-11-03';
      const item = createMockItem({ calories: 200, proteinGrams: 10.0 });

      const { log } = await repo.addItemToSlot(userId, date, 'breakfast', item);

      const updateResult = await repo.updateItemInDiary(
        userId,
        log._id,
        item.itemId,
        { calories: 350, proteinGrams: 18.0 }
      );

      expect(updateResult).not.toBeNull();
      expect(updateResult!.updatedItem.calories).toBe(350);
      expect(updateResult!.updatedItem.proteinGrams).toBe(18.0);
      expect(updateResult!.log.slots.breakfast.slotTotalCalories).toBe(350);
      expect(updateResult!.log.dailyTotalCalories).toBe(350);
    });

    it('should migrate an item to a different slot and adjust both slot subtotals', async () => {
      const userId = new Types.ObjectId();
      const date = '2026-11-03';
      const item = createMockItem({ calories: 300, proteinGrams: 15.0 });

      const { log } = await repo.addItemToSlot(userId, date, 'breakfast', item);

      // Migrate from breakfast to lunch
      const result = await repo.updateItemInDiary(
        userId,
        log._id,
        item.itemId,
        {},
        'lunch'
      );

      expect(result).not.toBeNull();
      expect(result!.slot).toBe('lunch');
      expect(result!.log.slots.breakfast.items).toHaveLength(0);
      expect(result!.log.slots.breakfast.slotTotalCalories).toBe(0);

      expect(result!.log.slots.lunch.items).toHaveLength(1);
      expect(result!.log.slots.lunch.slotTotalCalories).toBe(300);

      expect(result!.log.dailyTotalCalories).toBe(300);
    });

    it('should return null when attempting to update an item in another users log (BOLA defense)', async () => {
      const userA = new Types.ObjectId();
      const userB = new Types.ObjectId();
      const date = '2026-11-03';
      const item = createMockItem();

      const { log } = await repo.addItemToSlot(userA, date, 'breakfast', item);

      // User B attempts to update User A's item
      const result = await repo.updateItemInDiary(userB, log._id, item.itemId, { calories: 999 });
      expect(result).toBeNull();

      // Verify User A's item remains unchanged
      const unchangedLog = await repo.findDiaryById(userA, log._id);
      expect(unchangedLog!.slots.breakfast.items[0]!.calories).toBe(260);
    });
  });

  describe('4. removeItemFromDiary', () => {
    it('should remove item and decrement slot and daily totals', async () => {
      const userId = new Types.ObjectId();
      const date = '2026-11-03';
      const itemA = createMockItem({ itemId: 'item_a', calories: 200 });
      const itemB = createMockItem({ itemId: 'item_b', calories: 300 });

      await repo.addItemToSlot(userId, date, 'dinner', itemA);
      const { log } = await repo.addItemToSlot(userId, date, 'dinner', itemB);

      expect(log.slots.dinner.slotTotalCalories).toBe(500);

      const removeResult = await repo.removeItemFromDiary(userId, log._id, 'item_a');

      expect(removeResult).not.toBeNull();
      expect(removeResult!.removedItem.itemId).toBe('item_a');
      expect(removeResult!.slot).toBe('dinner');
      expect(removeResult!.log.slots.dinner.items).toHaveLength(1);
      expect(removeResult!.log.slots.dinner.slotTotalCalories).toBe(300);
      expect(removeResult!.log.dailyTotalCalories).toBe(300);
    });

    it('should return null when attempting to delete an item belonging to another user (BOLA defense)', async () => {
      const userA = new Types.ObjectId();
      const userB = new Types.ObjectId();
      const date = '2026-11-03';
      const item = createMockItem({ itemId: 'item_user_a' });

      const { log } = await repo.addItemToSlot(userA, date, 'snack', item);

      // User B attempts to delete User A's item
      const result = await repo.removeItemFromDiary(userB, log._id, 'item_user_a');
      expect(result).toBeNull();

      // Verify item still exists
      const intactLog = await repo.findDiaryById(userA, log._id);
      expect(intactLog!.slots.snack.items).toHaveLength(1);
    });
  });

  describe('5. findDiaryHistory', () => {
    it('should retrieve logs within a date range sorted by date descending', async () => {
      const userId = new Types.ObjectId();

      await repo.findOrCreateDiary(userId, '2026-11-01');
      await repo.findOrCreateDiary(userId, '2026-11-02');
      await repo.findOrCreateDiary(userId, '2026-11-03');

      const history = await repo.findDiaryHistory(userId, '2026-11-01', '2026-11-03');
      expect(history).toHaveLength(3);
      expect(history[0]!.date).toBe('2026-11-03');
      expect(history[1]!.date).toBe('2026-11-02');
      expect(history[2]!.date).toBe('2026-11-01');
    });
  });
});

