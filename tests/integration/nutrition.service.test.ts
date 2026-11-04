import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { Types } from 'mongoose';
import { setupTestDatabase, teardownTestDatabase, clearTestDatabase } from '../helpers/db.helper.js';
import { NutritionService, nutritionService } from '../../src/modules/nutrition/nutrition.service.js';
import { FoodItemModel } from '../../src/modules/nutrition/models/foodItem.model.js';
import { NutritionLogModel } from '../../src/modules/nutrition/models/nutritionLog.model.js';
import { UserProfileModel } from '../../src/modules/users/models/userProfile.model.js';
import { AppError, ErrorCode } from '../../src/shared/errors/AppError.js';

describe('NutritionService Integration Tests (Live MongoDB)', () => {
  let service: NutritionService;

  beforeAll(async () => {
    await setupTestDatabase();
    await NutritionLogModel.init();
    await UserProfileModel.init();
    service = nutritionService;
  });

  afterAll(async () => {
    await teardownTestDatabase();
  });

  beforeEach(async () => {
    await clearTestDatabase();
  });

  // Helper to seed a standard user profile for target snapshot verification
  const seedUserProfile = async (userId: Types.ObjectId, overrides: Record<string, any> = {}) => {
    return UserProfileModel.create({
      userId,
      name: 'Test Athlete',
      isOnboardingCompleted: true,
      birthDate: new Date('1995-06-15'),
      biologicalSex: 'male',
      heightCm: 180,
      weightKg: 80,
      unitSystem: 'metric',
      preferredLanguage: 'en',
      fitnessGoal: 'fat_loss',
      activityLevel: 'moderate',
      dailyCalorieTarget: 2200,
      proteinTargetGrams: 165.0,
      carbsTargetGrams: 220.0,
      fatTargetGrams: 73.0,
      isTargetsCustomized: true,
      ...overrides,
    });
  };

  // Helper to seed a catalog food with standard portions
  const seedCatalogFood = async (overrides: Record<string, any> = {}) => {
    return FoodItemModel.create({
      catalogId: 'food_test_koshari_001',
      catalogVersion: '1.0.0',
      nameEn: 'Egyptian Koshari',
      nameAr: 'كشري مصري',
      searchAliases: ['koshari', 'kushari'],
      category: 'middle_eastern_dishes',
      servingSizeGrams: 100.0,
      servingUnitNameEn: '100g',
      servingUnitNameAr: '100 جرام',
      caloriesPer100g: 165,
      proteinPer100g: 5.2,
      carbsPer100g: 31.0,
      fatPer100g: 2.5,
      fiberPer100g: 3.8,
      standardPortions: [
        {
          portionId: 'portion_small_plate',
          unitNameEn: 'Small Plate',
          unitNameAr: 'طبق صغير',
          gramWeight: 250.0,
          isDefault: true,
        },
        {
          portionId: 'portion_large_plate',
          unitNameEn: 'Large Plate',
          unitNameAr: 'طبق كبير',
          gramWeight: 450.0,
          isDefault: false,
        },
      ],
      sourceOrganization: 'National Nutrition Institute',
      sourceDataset: 'Food Composition Tables for Egypt',
      reviewDate: '2026-11-01',
      preparationState: 'cooked',
      confidenceLevel: 'medium',
      isVerified: true,
      isEstimated: true,
      isArchived: false,
      ...overrides,
    });
  };

  // =========================================================================
  // 1. Diary Retrieval (EP-NUTR-001)
  // =========================================================================
  describe('1. getDiary (EP-NUTR-001)', () => {
    it('should return empty diary envelope with full target budget when day has no logged meals', async () => {
      const userId = new Types.ObjectId();
      await seedUserProfile(userId);

      const diary = await service.getDiary(userId.toString(), '2026-11-03');

      expect(diary.date).toBe('2026-11-03');
      expect(diary.dailyTargets.calories).toBe(2200);
      expect(diary.dailyTargets.proteinGrams).toBe(165.0);
      expect(diary.dailyTargets.isTargetsCustomized).toBe(true);
      expect(diary.dailyTargets.isEstimated).toBe(true);

      expect(diary.consumedTotals.calories).toBe(0);
      expect(diary.consumedTotals.proteinGrams).toBe(0.0);
      expect(diary.consumedTotals.carbsGrams).toBe(0.0);
      expect(diary.consumedTotals.fatGrams).toBe(0.0);

      expect(diary.remainingBudget.calories).toBe(2200);
      expect(diary.remainingBudget.proteinGrams).toBe(165.0);
      expect(diary.progressPercentage).toBe(0);

      expect(diary.slots.breakfast.items).toEqual([]);
      expect(diary.slots.lunch.items).toEqual([]);
      expect(diary.slots.dinner.items).toEqual([]);
      expect(diary.slots.snack.items).toEqual([]);
    });

    it('should calculate consumed totals, remaining budget, and progress percentage for populated diary', async () => {
      const userId = new Types.ObjectId();
      await seedUserProfile(userId, { dailyCalorieTarget: 2000, proteinTargetGrams: 150.0 });
      const food = await seedCatalogFood();

      // Log an item into breakfast (250g small plate = 413 kcal, 13g protein, 77.5g carbs, 6.3g fat)
      await service.logCatalogItem(userId.toString(), {
        date: '2026-11-03',
        slot: 'breakfast',
        foodId: food._id.toString(),
        portionId: 'portion_small_plate',
        servingQuantity: 1,
      });

      const diary = await service.getDiary(userId.toString(), '2026-11-03');

      expect(diary.consumedTotals.calories).toBe(413);
      expect(diary.consumedTotals.proteinGrams).toBe(13.0);
      expect(diary.consumedTotals.carbsGrams).toBe(77.5);
      expect(diary.consumedTotals.fatGrams).toBe(6.3);

      expect(diary.remainingBudget.calories).toBe(1587); // 2000 - 413
      expect(diary.remainingBudget.proteinGrams).toBe(137.0); // 150 - 13

      expect(diary.progressPercentage).toBe(21); // (413 / 2000) * 100 = 20.65 -> 21%
      expect(diary.slots.breakfast.items).toHaveLength(1);
      expect(diary.slots.breakfast.items[0]!.nameEn).toBe('Egyptian Koshari');
      expect(diary.slots.breakfast.items[0]!.isEstimated).toBe(true);
    });

    it('should reject getDiary with 404 RESOURCE_NOT_FOUND if user profile does not exist', async () => {
      const unregisteredUser = new Types.ObjectId();

      await expect(service.getDiary(unregisteredUser.toString(), '2026-11-03')).rejects.toMatchObject({
        statusCode: 404,
        errorCode: ErrorCode.RESOURCE_NOT_FOUND,
      });
    });

    it('should reject getDiary with 404 RESOURCE_NOT_FOUND if user onboarding is not completed', async () => {
      const incompleteUser = new Types.ObjectId();
      await seedUserProfile(incompleteUser, { isOnboardingCompleted: false });

      await expect(service.getDiary(incompleteUser.toString(), '2026-11-03')).rejects.toMatchObject({
        statusCode: 404,
        errorCode: ErrorCode.RESOURCE_NOT_FOUND,
      });
    });

    it('should reject getDiary with 404 RESOURCE_NOT_FOUND if required nutrition targets are missing', async () => {
      const missingTargetsUser = new Types.ObjectId();
      await seedUserProfile(missingTargetsUser, { dailyCalorieTarget: undefined });

      await expect(service.getDiary(missingTargetsUser.toString(), '2026-11-03')).rejects.toMatchObject({
        statusCode: 404,
        errorCode: ErrorCode.RESOURCE_NOT_FOUND,
      });
    });

    it('should verify getDiary does not return fabricated targets for users without completed onboarding', async () => {
      const user = new Types.ObjectId();
      await seedUserProfile(user, { isOnboardingCompleted: false, dailyCalorieTarget: undefined });

      await expect(service.getDiary(user.toString(), '2026-11-03')).rejects.toThrow();
    });

    it('should reject invalid date format with 400 VALIDATION_ERROR', async () => {
      const userId = new Types.ObjectId();
      await expect(service.getDiary(userId.toString(), '03/11/2026')).rejects.toThrow(
        /Invalid date format/i
      );
    });
  });

  // =========================================================================
  // 2. Catalog Food Logging (EP-NUTR-003)
  // =========================================================================
  describe('2. logCatalogItem (EP-NUTR-003)', () => {
    it('should log catalog food scaled by standard portion with server-side authoritative calculation', async () => {
      const userId = new Types.ObjectId();
      await seedUserProfile(userId);
      const food = await seedCatalogFood();

      // Small Plate = 250g. Multiplier = 2.5x
      // 165 * 2.5 = 412.5 -> 413 kcal
      const result = await service.logCatalogItem(userId.toString(), {
        date: '2026-11-03',
        slot: 'lunch',
        foodId: food._id.toString(),
        portionId: 'portion_small_plate',
        servingQuantity: 1,
      });

      expect(result.logId).toBeDefined();
      expect(result.itemId).toBeDefined();
      expect(result.foodId).toBe(food._id.toString());
      expect(result.catalogId).toBe('food_test_koshari_001');
      expect(result.slot).toBe('lunch');
      expect(result.nameEn).toBe('Egyptian Koshari');
      expect(result.servingUnitNameEn).toBe('Small Plate');
      expect(result.servingWeightGrams).toBe(250.0);
      expect(result.calories).toBe(413);
      expect(result.proteinGrams).toBe(13.0);
      expect(result.carbsGrams).toBe(77.5);
      expect(result.fatGrams).toBe(6.3);
      expect(result.fiberGrams).toBe(9.5);
      expect(result.isQuickAdd).toBe(false);
      expect(result.isEstimated).toBe(true);
    });

    it('should log catalog food scaled by explicit customGrams (Decision 4)', async () => {
      const userId = new Types.ObjectId();
      await seedUserProfile(userId);
      const food = await seedCatalogFood();

      // Custom 200g serving. Multiplier = 2.0x
      // 165 * 2 = 330 kcal, protein 5.2 * 2 = 10.4
      const result = await service.logCatalogItem(userId.toString(), {
        date: '2026-11-03',
        slot: 'dinner',
        foodId: food._id.toString(),
        customGrams: 200.0,
        servingQuantity: 1,
      });

      expect(result.servingUnitNameEn).toBe('g');
      expect(result.servingWeightGrams).toBe(200.0);
      expect(result.calories).toBe(330);
      expect(result.proteinGrams).toBe(10.4);
    });

    it('should reject logging non-existent foodId with 404 NOT_FOUND', async () => {
      const userId = new Types.ObjectId();
      const fakeFoodId = new Types.ObjectId().toString();

      await expect(
        service.logCatalogItem(userId.toString(), {
          date: '2026-11-03',
          slot: 'breakfast',
          foodId: fakeFoodId,
          servingQuantity: 1,
        })
      ).rejects.toThrow(AppError);
    });

    it('should reject invalid portionId with 400 VALIDATION_ERROR', async () => {
      const userId = new Types.ObjectId();
      const food = await seedCatalogFood();

      await expect(
        service.logCatalogItem(userId.toString(), {
          date: '2026-11-03',
          slot: 'breakfast',
          foodId: food._id.toString(),
          portionId: 'portion_non_existent',
          servingQuantity: 1,
        })
      ).rejects.toThrow(/Standard portion not found/i);
    });

    it('should reject zero or negative servingQuantity with 400 VALIDATION_ERROR', async () => {
      const userId = new Types.ObjectId();
      const food = await seedCatalogFood();

      await expect(
        service.logCatalogItem(userId.toString(), {
          date: '2026-11-03',
          slot: 'breakfast',
          foodId: food._id.toString(),
          servingQuantity: 0,
        })
      ).rejects.toThrow(/Serving quantity must be between/i);
    });

    it('should preserve snapshot immutability when catalog food is subsequently modified in DB', async () => {
      const userId = new Types.ObjectId();
      await seedUserProfile(userId);
      const food = await seedCatalogFood();

      const logged = await service.logCatalogItem(userId.toString(), {
        date: '2026-11-03',
        slot: 'lunch',
        foodId: food._id.toString(),
        portionId: 'portion_small_plate',
        servingQuantity: 1,
      });

      expect(logged.calories).toBe(413);

      // Modify catalog food in database
      food.caloriesPer100g = 999;
      food.nameEn = 'Modified Koshari';
      await food.save();

      // Retrieve diary and verify logged snapshot remains untouched
      const diary = await service.getDiary(userId.toString(), '2026-11-03');
      const item = diary.slots.lunch.items[0]!;

      expect(item.nameEn).toBe('Egyptian Koshari');
      expect(item.calories).toBe(413);
    });
  });

  // =========================================================================
  // 3. Quick-Add Manual Meal Logging (EP-NUTR-002, DEC-010)
  // =========================================================================
  describe('3. logQuickAdd (EP-NUTR-002)', () => {
    it('should persist uncatalogued Quick Add entry directly into slot without synthetic catalog records', async () => {
      const userId = new Types.ObjectId();
      await seedUserProfile(userId);

      const result = await service.logQuickAdd(userId.toString(), {
        date: '2026-11-03',
        slot: 'snack',
        nameEn: 'Protein Bar',
        nameAr: 'لوح بروتين',
        calories: 220,
        proteinGrams: 20.0,
        carbsGrams: 22.0,
        fatGrams: 6.0,
        servingWeightGrams: 60.0,
      });

      expect(result.logId).toBeDefined();
      expect(result.itemId).toBeDefined();
      expect(result.slot).toBe('snack');
      expect(result.nameEn).toBe('Protein Bar');
      expect(result.nameAr).toBe('لوح بروتين');
      expect(result.calories).toBe(220);
      expect(result.proteinGrams).toBe(20.0);
      expect(result.isQuickAdd).toBe(true);
      expect(result.isEstimated).toBe(true);

      const diary = await service.getDiary(userId.toString(), '2026-11-03');
      expect(diary.slots.snack.items[0]!.foodId).toBeNull();
      expect(diary.slots.snack.items[0]!.catalogId).toBeNull();
    });

    it('should reject Quick Add with negative calories or calories > 10000', async () => {
      const userId = new Types.ObjectId();

      await expect(
        service.logQuickAdd(userId.toString(), {
          date: '2026-11-03',
          slot: 'breakfast',
          calories: -50,
        })
      ).rejects.toThrow(/Calories must be between/i);

      await expect(
        service.logQuickAdd(userId.toString(), {
          date: '2026-11-03',
          slot: 'breakfast',
          calories: 12000,
        })
      ).rejects.toThrow(/Calories must be between/i);
    });
  });

  // =========================================================================
  // 4. Update Logged Meal Item (EP-NUTR-007)
  // =========================================================================
  describe('4. editLoggedItem (EP-NUTR-007)', () => {
    it('should update catalog item quantity and authoritatively recalculate macros', async () => {
      const userId = new Types.ObjectId();
      await seedUserProfile(userId);
      const food = await seedCatalogFood();

      const logged = await service.logCatalogItem(userId.toString(), {
        date: '2026-11-03',
        slot: 'lunch',
        foodId: food._id.toString(),
        portionId: 'portion_small_plate',
        servingQuantity: 1, // 250g = 413 kcal
      });

      // Update to 2 portions (500g = 825 kcal)
      const edited = await service.editLoggedItem(
        userId.toString(),
        logged.logId,
        logged.itemId,
        { servingQuantity: 2 }
      );

      expect(edited.servingQuantity).toBe(2);
      expect(edited.servingWeightGrams).toBe(500.0);
      expect(edited.calories).toBe(825);
      expect(edited.proteinGrams).toBe(26.0);
      expect(edited.isEstimated).toBe(true);

      const diary = await service.getDiary(userId.toString(), '2026-11-03');
      expect(diary.slots.lunch.slotTotalCalories).toBe(825);
      expect(diary.consumedTotals.calories).toBe(825);
    });

    it('should move an item to targetSlot and adjust both slot subtotals', async () => {
      const userId = new Types.ObjectId();
      await seedUserProfile(userId);
      const food = await seedCatalogFood();

      const logged = await service.logCatalogItem(userId.toString(), {
        date: '2026-11-03',
        slot: 'breakfast',
        foodId: food._id.toString(),
        portionId: 'portion_small_plate',
        servingQuantity: 1,
      });

      // Migrate from breakfast to dinner
      const edited = await service.editLoggedItem(
        userId.toString(),
        logged.logId,
        logged.itemId,
        { targetSlot: 'dinner' }
      );

      expect(edited.slot).toBe('dinner');

      const diary = await service.getDiary(userId.toString(), '2026-11-03');
      expect(diary.slots.breakfast.items).toHaveLength(0);
      expect(diary.slots.breakfast.slotTotalCalories).toBe(0);

      expect(diary.slots.dinner.items).toHaveLength(1);
      expect(diary.slots.dinner.slotTotalCalories).toBe(413);
    });

    it('should prevent cross-user edits and return 404 NOT_FOUND (BOLA defense)', async () => {
      const userA = new Types.ObjectId();
      const userB = new Types.ObjectId();
      await seedUserProfile(userA);
      const food = await seedCatalogFood();

      const logged = await service.logCatalogItem(userA.toString(), {
        date: '2026-11-03',
        slot: 'lunch',
        foodId: food._id.toString(),
        portionId: 'portion_small_plate',
        servingQuantity: 1,
      });

      // User B attempts to edit User A's log
      await expect(
        service.editLoggedItem(userB.toString(), logged.logId, logged.itemId, { servingQuantity: 3 })
      ).rejects.toThrow(AppError);

      const diary = await service.getDiary(userA.toString(), '2026-11-03');
      expect(diary.slots.lunch.items[0]!.servingQuantity).toBe(1);
    });

    it('should reject editing non-existent itemId with 404 NOT_FOUND', async () => {
      const userId = new Types.ObjectId();
      await seedUserProfile(userId);
      const food = await seedCatalogFood();

      const logged = await service.logCatalogItem(userId.toString(), {
        date: '2026-11-03',
        slot: 'lunch',
        foodId: food._id.toString(),
        servingQuantity: 1,
      });

      await expect(
        service.editLoggedItem(userId.toString(), logged.logId, 'fake_item_id_999', { servingQuantity: 2 })
      ).rejects.toThrow(/Meal item not found/i);
    });
  });

  // =========================================================================
  // 5. Delete Logged Meal Item (EP-NUTR-004)
  // =========================================================================
  describe('5. deleteLoggedItem (EP-NUTR-004)', () => {
    it('should delete item from diary and decrement slot and daily totals', async () => {
      const userId = new Types.ObjectId();
      await seedUserProfile(userId);
      const food = await seedCatalogFood();

      const logged = await service.logCatalogItem(userId.toString(), {
        date: '2026-11-03',
        slot: 'dinner',
        foodId: food._id.toString(),
        portionId: 'portion_small_plate',
        servingQuantity: 1,
      });

      const response = await service.deleteLoggedItem(userId.toString(), logged.logId, logged.itemId);
      expect(response.message).toBe('Meal item removed successfully.');

      const diary = await service.getDiary(userId.toString(), '2026-11-03');
      expect(diary.slots.dinner.items).toHaveLength(0);
      expect(diary.slots.dinner.slotTotalCalories).toBe(0);
      expect(diary.consumedTotals.calories).toBe(0);
    });

    it('should prevent cross-user deletion and return 404 NOT_FOUND (BOLA defense)', async () => {
      const userA = new Types.ObjectId();
      const userB = new Types.ObjectId();
      await seedUserProfile(userA);
      const food = await seedCatalogFood();

      const logged = await service.logCatalogItem(userA.toString(), {
        date: '2026-11-03',
        slot: 'dinner',
        foodId: food._id.toString(),
        servingQuantity: 1,
      });

      // User B attempts to delete User A's meal
      await expect(
        service.deleteLoggedItem(userB.toString(), logged.logId, logged.itemId)
      ).rejects.toThrow(AppError);

      const diary = await service.getDiary(userA.toString(), '2026-11-03');
      expect(diary.slots.dinner.items).toHaveLength(1);
    });
  });

  // =========================================================================
  // 6. Daily Nutrition Summary (EP-NUTR-008)
  // =========================================================================
  describe('6. getDailySummary (EP-NUTR-008)', () => {
    it('should return lightweight daily summary for progress and AI coach context', async () => {
      const userId = new Types.ObjectId();
      await seedUserProfile(userId, { dailyCalorieTarget: 2200 });
      const food = await seedCatalogFood();

      await service.logCatalogItem(userId.toString(), {
        date: '2026-11-03',
        slot: 'lunch',
        foodId: food._id.toString(),
        portionId: 'portion_small_plate',
        servingQuantity: 1, // 413 kcal, 13g protein
      });

      const summary = await service.getDailySummary(userId.toString(), '2026-11-03');

      expect(summary.date).toBe('2026-11-03');
      expect(summary.dailyCalorieTarget).toBe(2200);
      expect(summary.consumedCalories).toBe(413);
      expect(summary.remainingCalories).toBe(1787);
      expect(summary.consumedProteinGrams).toBe(13.0);
      expect(summary.consumedCarbsGrams).toBe(77.5);
      expect(summary.consumedFatGrams).toBe(6.3);
      expect(summary.isEstimated).toBe(true);
    });

    it('should return zero-consumed summary for empty diary dates', async () => {
      const userId = new Types.ObjectId();
      await seedUserProfile(userId, { dailyCalorieTarget: 2200 });

      const summary = await service.getDailySummary(userId.toString(), '2026-11-03');

      expect(summary.consumedCalories).toBe(0);
      expect(summary.remainingCalories).toBe(2200);
      expect(summary.consumedProteinGrams).toBe(0.0);
      expect(summary.isEstimated).toBe(true);
    });

    it('should reject getDailySummary with 404 RESOURCE_NOT_FOUND if user profile or targets do not exist (no fabricated targets)', async () => {
      const unregisteredUser = new Types.ObjectId();
      await expect(service.getDailySummary(unregisteredUser.toString(), '2026-11-03')).rejects.toMatchObject({
        statusCode: 404,
        errorCode: ErrorCode.RESOURCE_NOT_FOUND,
      });

      const incompleteUser = new Types.ObjectId();
      await seedUserProfile(incompleteUser, { isOnboardingCompleted: false });
      await expect(service.getDailySummary(incompleteUser.toString(), '2026-11-03')).rejects.toMatchObject({
        statusCode: 404,
        errorCode: ErrorCode.RESOURCE_NOT_FOUND,
      });
    });
  });
});
