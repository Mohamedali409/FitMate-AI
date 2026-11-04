import { randomUUID } from 'node:crypto';
import { Types } from 'mongoose';
import { NutritionRepository, nutritionRepository } from './nutrition.repository.js';
import {
  SearchFoodsQueryInput,
  FoodItemSummaryDto,
  FoodItemDetailDto,
} from './dto/nutrition.dto.js';
import { AppError, ErrorCode } from '../../shared/errors/AppError.js';
import { IFoodItemDocument } from './models/foodItem.model.js';
import {
  INutritionLogItem,
  MealSlotType,
  MEAL_SLOT_TYPES,
} from './models/nutritionLog.model.js';
import {
  calculateItemNutrition,
  calculateRemainingBudget,
} from './services/nutrition.calculator.js';
import { usersService, UsersService } from '../users/users.service.js';

// Canonical YYYY-MM-DD calendar date regular expression
const DATE_REGEX = /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/;

function validateDateFormat(date: string): void {
  if (!DATE_REGEX.test(date)) {
    throw AppError.badRequest('Invalid date format. Expected YYYY-MM-DD.', ErrorCode.VALIDATION_ERROR);
  }
}

function validateSlot(slot: string): asserts slot is MealSlotType {
  if (!MEAL_SLOT_TYPES.includes(slot as MealSlotType)) {
    throw AppError.badRequest(
      `Invalid meal slot: ${slot}. Expected one of: ${MEAL_SLOT_TYPES.join(', ')}`,
      ErrorCode.VALIDATION_ERROR
    );
  }
}

export interface DiarySlotItemDto {
  itemId: string;
  logId: string;
  foodId?: string | null;
  catalogId?: string | null;
  nameEn: string;
  nameAr: string;
  portionId?: string | null;
  servingUnitNameEn: string;
  servingUnitNameAr: string;
  servingQuantity: number;
  servingWeightGrams: number;
  calories: number;
  proteinGrams: number;
  carbsGrams: number;
  fatGrams: number;
  fiberGrams?: number;
  isQuickAdd: boolean;
  isEstimated: true;
  loggedAt: string;
}

export interface DiarySlotDto {
  slotTotalCalories: number;
  slotTotalProtein: number;
  slotTotalCarbs: number;
  slotTotalFat: number;
  items: DiarySlotItemDto[];
}

export interface DailyDiaryDto {
  date: string;
  dailyTargets: {
    calories: number;
    proteinGrams: number;
    carbsGrams: number;
    fatGrams: number;
    isEstimated: true;
    isTargetsCustomized: boolean;
  };
  consumedTotals: {
    calories: number;
    proteinGrams: number;
    carbsGrams: number;
    fatGrams: number;
    isEstimated: true;
  };
  remainingBudget: {
    calories: number;
    proteinGrams: number;
    carbsGrams: number;
    fatGrams: number;
  };
  progressPercentage: number;
  slots: {
    breakfast: DiarySlotDto;
    lunch: DiarySlotDto;
    dinner: DiarySlotDto;
    snack: DiarySlotDto;
  };
}

export interface LogCatalogItemInput {
  date: string;
  slot: MealSlotType;
  foodId: string;
  portionId?: string;
  servingQuantity: number;
  customGrams?: number;
  timezoneOffsetMinutes?: number;
}

export interface LoggedCatalogItemDto {
  logId: string;
  itemId: string;
  foodId: string;
  catalogId: string | null;
  slot: MealSlotType;
  nameEn: string;
  nameAr: string;
  portionId: string | null;
  servingUnitNameEn: string;
  servingUnitNameAr: string;
  servingQuantity: number;
  servingWeightGrams: number;
  calories: number;
  proteinGrams: number;
  carbsGrams: number;
  fatGrams: number;
  fiberGrams?: number;
  isQuickAdd: false;
  isEstimated: true;
  loggedAt: string;
}

export interface QuickAddInput {
  date: string;
  slot: MealSlotType;
  nameEn?: string;
  nameAr?: string;
  calories: number;
  proteinGrams?: number;
  carbsGrams?: number;
  fatGrams?: number;
  servingWeightGrams?: number;
  timezoneOffsetMinutes?: number;
}

export interface LoggedQuickAddDto {
  logId: string;
  itemId: string;
  slot: MealSlotType;
  nameEn: string;
  nameAr: string;
  calories: number;
  proteinGrams: number;
  carbsGrams: number;
  fatGrams: number;
  servingWeightGrams: number;
  isQuickAdd: true;
  isEstimated: true;
  loggedAt: string;
}

export interface EditLoggedItemInput {
  targetSlot?: MealSlotType;
  portionId?: string;
  servingQuantity?: number;
  customGrams?: number;
  calories?: number;
  proteinGrams?: number;
  carbsGrams?: number;
  fatGrams?: number;
  servingWeightGrams?: number;
}

export interface EditedLoggedItemDto {
  logId: string;
  itemId: string;
  slot: MealSlotType;
  servingQuantity: number;
  servingWeightGrams: number;
  calories: number;
  proteinGrams: number;
  carbsGrams: number;
  fatGrams: number;
  fiberGrams?: number;
  isEstimated: true;
  updatedAt: string;
}

export interface DailySummaryDto {
  date: string;
  dailyCalorieTarget: number;
  consumedCalories: number;
  remainingCalories: number;
  consumedProteinGrams: number;
  consumedCarbsGrams: number;
  consumedFatGrams: number;
  isEstimated: true;
}

export class NutritionService {
  constructor(
    private repository: NutritionRepository = nutritionRepository,
    private userSnapshotService: Pick<UsersService, 'getProfileSnapshot'> = usersService
  ) {}

  /**
   * Retrieves active nutritional targets for the user (EP-NUTR-001 / EP-NUTR-008).
   * Propagates 404 RESOURCE_NOT_FOUND if user profile, onboarding, or targets are missing.
   * Does NOT generate or return generic fallback targets.
   */
  private async getUserTargets(userId: string) {
    return await this.userSnapshotService.getProfileSnapshot(userId);
  }

  // =========================================================================
  // 1. Food Catalog Querying (EP-NUTR-005 & EP-NUTR-006)
  // =========================================================================

  /**
   * Search curated food catalog with bilingual support and category filtering (EP-NUTR-005)
   */
  async searchFoods(query: SearchFoodsQueryInput): Promise<{
    items: FoodItemSummaryDto[];
    pagination: {
      page: number;
      limit: number;
      totalItems: number;
      totalPages: number;
      hasNextPage: boolean;
      hasPrevPage: boolean;
    };
  }> {
    const result = await this.repository.searchFoods(query);

    const items: FoodItemSummaryDto[] = result.items.map((doc: IFoodItemDocument) => {
      const defaultPortion =
        doc.standardPortions.find((p) => p.isDefault) || doc.standardPortions[0] || null;

      return {
        id: doc.id || doc._id.toString(),
        catalogId: doc.catalogId,
        nameEn: doc.nameEn,
        nameAr: doc.nameAr,
        category: doc.category,
        servingSizeGrams: doc.servingSizeGrams,
        caloriesPer100g: doc.caloriesPer100g,
        proteinPer100g: doc.proteinPer100g,
        carbsPer100g: doc.carbsPer100g,
        fatPer100g: doc.fatPer100g,
        confidenceLevel: doc.confidenceLevel,
        isVerified: doc.isVerified,
        isEstimated: true, // Always true (Core Invariant 2)
        defaultPortion: defaultPortion
          ? {
              portionId: defaultPortion.portionId,
              unitNameEn: defaultPortion.unitNameEn,
              unitNameAr: defaultPortion.unitNameAr,
              gramWeight: defaultPortion.gramWeight,
            }
          : null,
      };
    });

    return {
      items,
      pagination: {
        page: result.page,
        limit: result.limit,
        totalItems: result.totalItems,
        totalPages: result.totalPages,
        hasNextPage: result.hasNextPage,
        hasPrevPage: result.hasPrevPage,
      },
    };
  }

  /**
   * Get detailed nutritional profile, portions & provenance for a catalog food (EP-NUTR-006)
   */
  async getFoodById(id: string): Promise<FoodItemDetailDto> {
    const food = await this.repository.findFoodById(id);

    if (!food) {
      throw AppError.notFound('Food item not found', ErrorCode.RESOURCE_NOT_FOUND);
    }

    return {
      id: food.id || food._id.toString(),
      catalogId: food.catalogId,
      nameEn: food.nameEn,
      nameAr: food.nameAr,
      category: food.category,
      servingSizeGrams: food.servingSizeGrams,
      caloriesPer100g: food.caloriesPer100g,
      proteinPer100g: food.proteinPer100g,
      carbsPer100g: food.carbsPer100g,
      fatPer100g: food.fatPer100g,
      fiberPer100g: food.fiberPer100g,
      standardPortions: food.standardPortions.map((p) => ({
        portionId: p.portionId,
        unitNameEn: p.unitNameEn,
        unitNameAr: p.unitNameAr,
        gramWeight: p.gramWeight,
        isDefault: p.isDefault,
      })),
      provenance: {
        sourceOrganization: food.sourceOrganization,
        sourceDataset: food.sourceDataset,
        sourceRecordId: food.sourceRecordId || null,
        reviewDate: food.reviewDate,
        preparationState: food.preparationState,
        preparationAssumptions: food.preparationAssumptions || null,
        confidenceLevel: food.confidenceLevel,
        isVerified: food.isVerified,
        isEstimated: true, // Always true (Core Invariant 2)
      },
    };
  }

  // =========================================================================
  // 2. Daily Diary & Meal Logging (EP-NUTR-001, 002, 003, 004, 007, 008)
  // =========================================================================

  /**
   * Retrieves a user's 4-slot daily nutrition diary for a specific calendar date (EP-NUTR-001).
   * Automatically handles non-existent diary days by returning zero-consumed envelopes.
   */
  async getDiary(userId: string, date: string, _timezoneOffsetMinutes?: number): Promise<DailyDiaryDto> {
    validateDateFormat(date);
    const target = await this.getUserTargets(userId);
    const log = await this.repository.findDiaryByDate(userId, date);

    const emptySlots = {
      breakfast: { slotTotalCalories: 0, slotTotalProtein: 0, slotTotalCarbs: 0, slotTotalFat: 0, items: [] },
      lunch: { slotTotalCalories: 0, slotTotalProtein: 0, slotTotalCarbs: 0, slotTotalFat: 0, items: [] },
      dinner: { slotTotalCalories: 0, slotTotalProtein: 0, slotTotalCarbs: 0, slotTotalFat: 0, items: [] },
      snack: { slotTotalCalories: 0, slotTotalProtein: 0, slotTotalCarbs: 0, slotTotalFat: 0, items: [] },
    };

    const dailyTargets = {
      calories: target.dailyCalorieTarget,
      proteinGrams: target.proteinTargetGrams,
      carbsGrams: target.carbsTargetGrams,
      fatGrams: target.fatTargetGrams,
      isEstimated: true as const,
      isTargetsCustomized: target.isTargetsCustomized,
    };

    if (!log) {
      return {
        date,
        dailyTargets,
        consumedTotals: {
          calories: 0,
          proteinGrams: 0.0,
          carbsGrams: 0.0,
          fatGrams: 0.0,
          isEstimated: true as const,
        },
        remainingBudget: {
          calories: dailyTargets.calories,
          proteinGrams: dailyTargets.proteinGrams,
          carbsGrams: dailyTargets.carbsGrams,
          fatGrams: dailyTargets.fatGrams,
        },
        progressPercentage: 0,
        slots: emptySlots,
      };
    }

    const consumedTotals = {
      calories: log.dailyTotalCalories,
      proteinGrams: log.dailyTotalProtein,
      carbsGrams: log.dailyTotalCarbs,
      fatGrams: log.dailyTotalFat,
      isEstimated: true as const,
    };

    const remainingBudget = calculateRemainingBudget(dailyTargets, consumedTotals);
    const progressPercentage =
      dailyTargets.calories > 0
        ? Math.min(100, Math.round((consumedTotals.calories / dailyTargets.calories) * 100))
        : 0;

    const logId = log.id || log._id.toString();
    const mapSlot = (slotKey: MealSlotType): DiarySlotDto => {
      const slot = log.slots[slotKey] || { slotTotalCalories: 0, slotTotalProtein: 0, slotTotalCarbs: 0, slotTotalFat: 0, items: [] };
      return {
        slotTotalCalories: slot.slotTotalCalories,
        slotTotalProtein: slot.slotTotalProtein,
        slotTotalCarbs: slot.slotTotalCarbs,
        slotTotalFat: slot.slotTotalFat,
        items: (slot.items || []).map((it) => ({
          itemId: it.itemId,
          logId,
          foodId: it.foodId ? it.foodId.toString() : null,
          catalogId: it.catalogId || null,
          nameEn: it.nameEn,
          nameAr: it.nameAr,
          portionId: it.portionId || null,
          servingUnitNameEn: it.servingUnitNameEn,
          servingUnitNameAr: it.servingUnitNameAr,
          servingQuantity: it.servingQuantity,
          servingWeightGrams: it.servingWeightGrams,
          calories: it.calories,
          proteinGrams: it.proteinGrams,
          carbsGrams: it.carbsGrams,
          fatGrams: it.fatGrams,
          fiberGrams: it.fiberGrams,
          isQuickAdd: it.isQuickAdd,
          isEstimated: true as const,
          loggedAt: it.loggedAt instanceof Date ? it.loggedAt.toISOString() : new Date(it.loggedAt).toISOString(),
        })),
      };
    };

    return {
      date,
      dailyTargets,
      consumedTotals,
      remainingBudget,
      progressPercentage,
      slots: {
        breakfast: mapSlot('breakfast'),
        lunch: mapSlot('lunch'),
        dinner: mapSlot('dinner'),
        snack: mapSlot('snack'),
      },
    };
  }

  /**
   * Logs a curated food item from catalog scaled by standard portion or custom grams (EP-NUTR-003).
   * Authoritative nutritional values are computed on the server and persisted as immutable snapshots.
   */
  async logCatalogItem(userId: string, input: LogCatalogItemInput): Promise<LoggedCatalogItemDto> {
    validateDateFormat(input.date);
    validateSlot(input.slot);

    if (input.servingQuantity <= 0 || input.servingQuantity > 5000) {
      throw AppError.badRequest('Serving quantity must be between 0.01 and 5,000 units', ErrorCode.VALIDATION_ERROR);
    }
    if (input.customGrams !== undefined && (input.customGrams <= 0 || input.customGrams > 10000)) {
      throw AppError.badRequest('Custom grams must be between 0.1 and 10,000 grams', ErrorCode.VALIDATION_ERROR);
    }

    if (!Types.ObjectId.isValid(input.foodId)) {
      throw AppError.badRequest('Invalid foodId format', ErrorCode.VALIDATION_ERROR);
    }

    const food = await this.repository.findFoodById(input.foodId);
    if (!food) {
      throw AppError.notFound('Food item not found', ErrorCode.RESOURCE_NOT_FOUND);
    }

    let selectedPortion = null;
    if (input.portionId) {
      selectedPortion = food.standardPortions.find((p) => p.portionId === input.portionId);
      if (!selectedPortion) {
        throw AppError.badRequest('Standard portion not found on food item', ErrorCode.VALIDATION_ERROR);
      }
    }

    // Authoritative calculation using pure domain calculator
    const scaled = calculateItemNutrition({
      caloriesPer100g: food.caloriesPer100g,
      proteinPer100g: food.proteinPer100g,
      carbsPer100g: food.carbsPer100g,
      fatPer100g: food.fatPer100g,
      fiberPer100g: food.fiberPer100g,
      servingQuantity: input.servingQuantity,
      portionGramWeight: selectedPortion?.gramWeight,
      customGrams: input.customGrams,
    });

    let servingUnitNameEn = food.servingUnitNameEn || '100g';
    let servingUnitNameAr = food.servingUnitNameAr || '100 جرام';

    if (input.customGrams !== undefined && input.customGrams > 0) {
      servingUnitNameEn = 'g';
      servingUnitNameAr = 'جرام';
    } else if (selectedPortion) {
      servingUnitNameEn = selectedPortion.unitNameEn;
      servingUnitNameAr = selectedPortion.unitNameAr;
    }

    const itemId = randomUUID();
    const item: INutritionLogItem = {
      itemId,
      foodId: food._id,
      catalogId: food.catalogId,
      nameEn: food.nameEn,
      nameAr: food.nameAr,
      portionId: input.portionId || null,
      servingUnitNameEn,
      servingUnitNameAr,
      servingQuantity: input.servingQuantity,
      servingWeightGrams: scaled.servingWeightGrams,
      calories: scaled.calories,
      proteinGrams: scaled.proteinGrams,
      carbsGrams: scaled.carbsGrams,
      fatGrams: scaled.fatGrams,
      fiberGrams: scaled.fiberGrams,
      isQuickAdd: false,
      isEstimated: true,
      loggedAt: new Date(),
    };

    const { log } = await this.repository.addItemToSlot(
      userId,
      input.date,
      input.slot,
      item,
      input.timezoneOffsetMinutes ?? 0
    );

    return {
      logId: log.id || log._id.toString(),
      itemId: item.itemId,
      foodId: food._id.toString(),
      catalogId: food.catalogId,
      slot: input.slot,
      nameEn: item.nameEn,
      nameAr: item.nameAr,
      portionId: item.portionId || null,
      servingUnitNameEn: item.servingUnitNameEn,
      servingUnitNameAr: item.servingUnitNameAr,
      servingQuantity: item.servingQuantity,
      servingWeightGrams: item.servingWeightGrams,
      calories: item.calories,
      proteinGrams: item.proteinGrams,
      carbsGrams: item.carbsGrams,
      fatGrams: item.fatGrams,
      fiberGrams: item.fiberGrams,
      isQuickAdd: false,
      isEstimated: true as const,
      loggedAt: item.loggedAt.toISOString(),
    };
  }

  /**
   * Logs an uncatalogued manual calorie & macro entry directly into a meal slot (EP-NUTR-002, DEC-010).
   */
  async logQuickAdd(userId: string, input: QuickAddInput): Promise<LoggedQuickAddDto> {
    validateDateFormat(input.date);
    validateSlot(input.slot);

    if (input.calories < 0 || input.calories > 10000) {
      throw AppError.badRequest('Calories must be between 0 and 10,000', ErrorCode.VALIDATION_ERROR);
    }
    const protein = input.proteinGrams ?? 0;
    const carbs = input.carbsGrams ?? 0;
    const fat = input.fatGrams ?? 0;
    const weight = input.servingWeightGrams ?? 0;

    if (protein < 0 || protein > 1000 || carbs < 0 || carbs > 1000 || fat < 0 || fat > 1000) {
      throw AppError.badRequest('Macronutrients must be between 0 and 1,000 grams', ErrorCode.VALIDATION_ERROR);
    }
    if (weight < 0 || weight > 10000) {
      throw AppError.badRequest('Serving weight must be between 0 and 10,000 grams', ErrorCode.VALIDATION_ERROR);
    }

    const itemId = randomUUID();
    const item: INutritionLogItem = {
      itemId,
      foodId: null,
      catalogId: null,
      portionId: null,
      nameEn: input.nameEn?.trim() || 'Quick Add',
      nameAr: input.nameAr?.trim() || 'إضافة سريعة',
      servingUnitNameEn: 'Serving',
      servingUnitNameAr: 'حصة',
      servingQuantity: 1,
      servingWeightGrams: Math.round(weight * 10) / 10,
      calories: Math.round(input.calories),
      proteinGrams: Math.round(protein * 10) / 10,
      carbsGrams: Math.round(carbs * 10) / 10,
      fatGrams: Math.round(fat * 10) / 10,
      isQuickAdd: true,
      isEstimated: true,
      loggedAt: new Date(),
    };

    const { log } = await this.repository.addItemToSlot(
      userId,
      input.date,
      input.slot,
      item,
      input.timezoneOffsetMinutes ?? 0
    );

    return {
      logId: log.id || log._id.toString(),
      itemId: item.itemId,
      slot: input.slot,
      nameEn: item.nameEn,
      nameAr: item.nameAr,
      calories: item.calories,
      proteinGrams: item.proteinGrams,
      carbsGrams: item.carbsGrams,
      fatGrams: item.fatGrams,
      servingWeightGrams: item.servingWeightGrams,
      isQuickAdd: true as const,
      isEstimated: true as const,
      loggedAt: item.loggedAt.toISOString(),
    };
  }

  /**
   * Updates an existing logged meal item in a daily diary (EP-NUTR-007).
   * Enforces user ownership via BOLA defense matrix and recalculates totals.
   */
  async editLoggedItem(
    userId: string,
    logId: string,
    itemId: string,
    input: EditLoggedItemInput
  ): Promise<EditedLoggedItemDto> {
    if (!Types.ObjectId.isValid(logId)) {
      throw AppError.notFound('Diary log not found', ErrorCode.RESOURCE_NOT_FOUND);
    }
    if (input.targetSlot) {
      validateSlot(input.targetSlot);
    }

    const log = await this.repository.findDiaryById(userId, logId);
    if (!log) {
      throw AppError.notFound('Diary log not found', ErrorCode.RESOURCE_NOT_FOUND);
    }

    // Locate item across all meal slots
    const slotKeys: MealSlotType[] = MEAL_SLOT_TYPES;
    let currentSlot: MealSlotType | null = null;
    let existingItem: INutritionLogItem | null = null;

    for (const s of slotKeys) {
      const it = log.slots[s]?.items.find((item) => item.itemId === itemId);
      if (it) {
        currentSlot = s;
        existingItem = it;
        break;
      }
    }

    if (!existingItem || !currentSlot) {
      throw AppError.notFound('Meal item not found in diary', ErrorCode.RESOURCE_NOT_FOUND);
    }

    const updates: Partial<INutritionLogItem> = {};

    if (!existingItem.isQuickAdd && existingItem.foodId) {
      // Catalog food item: cannot override calories/macros directly; must recalculate based on portion / quantity / grams
      const food = await this.repository.findFoodById(existingItem.foodId.toString());
      if (food) {
        const servingQuantity = input.servingQuantity ?? existingItem.servingQuantity;
        if (servingQuantity <= 0 || servingQuantity > 5000) {
          throw AppError.badRequest('Serving quantity must be between 0.01 and 5,000 units', ErrorCode.VALIDATION_ERROR);
        }
        if (input.customGrams !== undefined && (input.customGrams <= 0 || input.customGrams > 10000)) {
          throw AppError.badRequest('Custom grams must be between 0.1 and 10,000 grams', ErrorCode.VALIDATION_ERROR);
        }

        const portionId = input.portionId !== undefined ? input.portionId : existingItem.portionId;
        const customGrams = input.customGrams;

        let selectedPortion = null;
        if (portionId) {
          selectedPortion = food.standardPortions.find((p) => p.portionId === portionId);
          if (!selectedPortion && input.portionId !== undefined) {
            throw AppError.badRequest('Standard portion not found on food item', ErrorCode.VALIDATION_ERROR);
          }
        }

        const scaled = calculateItemNutrition({
          caloriesPer100g: food.caloriesPer100g,
          proteinPer100g: food.proteinPer100g,
          carbsPer100g: food.carbsPer100g,
          fatPer100g: food.fatPer100g,
          fiberPer100g: food.fiberPer100g,
          servingQuantity,
          portionGramWeight: selectedPortion?.gramWeight,
          customGrams,
        });

        updates.servingQuantity = servingQuantity;
        updates.portionId = portionId || null;
        updates.servingWeightGrams = scaled.servingWeightGrams;
        updates.calories = scaled.calories;
        updates.proteinGrams = scaled.proteinGrams;
        updates.carbsGrams = scaled.carbsGrams;
        updates.fatGrams = scaled.fatGrams;
        updates.fiberGrams = scaled.fiberGrams;

        if (customGrams !== undefined && customGrams > 0) {
          updates.servingUnitNameEn = 'g';
          updates.servingUnitNameAr = 'جرام';
        } else if (selectedPortion) {
          updates.servingUnitNameEn = selectedPortion.unitNameEn;
          updates.servingUnitNameAr = selectedPortion.unitNameAr;
        }
      }
    } else {
      // Quick-Add item: allow direct calorie & macro edits
      if (input.calories !== undefined) {
        if (input.calories < 0 || input.calories > 10000) {
          throw AppError.badRequest('Calories must be between 0 and 10,000', ErrorCode.VALIDATION_ERROR);
        }
        updates.calories = Math.round(input.calories);
      }
      if (input.proteinGrams !== undefined) {
        if (input.proteinGrams < 0 || input.proteinGrams > 1000) {
          throw AppError.badRequest('Protein must be between 0 and 1,000g', ErrorCode.VALIDATION_ERROR);
        }
        updates.proteinGrams = Math.round(input.proteinGrams * 10) / 10;
      }
      if (input.carbsGrams !== undefined) {
        if (input.carbsGrams < 0 || input.carbsGrams > 1000) {
          throw AppError.badRequest('Carbohydrates must be between 0 and 1,000g', ErrorCode.VALIDATION_ERROR);
        }
        updates.carbsGrams = Math.round(input.carbsGrams * 10) / 10;
      }
      if (input.fatGrams !== undefined) {
        if (input.fatGrams < 0 || input.fatGrams > 1000) {
          throw AppError.badRequest('Fat must be between 0 and 1,000g', ErrorCode.VALIDATION_ERROR);
        }
        updates.fatGrams = Math.round(input.fatGrams * 10) / 10;
      }
      if (input.servingWeightGrams !== undefined) {
        if (input.servingWeightGrams < 0 || input.servingWeightGrams > 10000) {
          throw AppError.badRequest('Serving weight must be between 0 and 10,000 grams', ErrorCode.VALIDATION_ERROR);
        }
        updates.servingWeightGrams = Math.round(input.servingWeightGrams * 10) / 10;
      }
      if (input.servingQuantity !== undefined) {
        if (input.servingQuantity <= 0 || input.servingQuantity > 5000) {
          throw AppError.badRequest('Serving quantity must be between 0.01 and 5,000 units', ErrorCode.VALIDATION_ERROR);
        }
        updates.servingQuantity = input.servingQuantity;
      }
    }

    const result = await this.repository.updateItemInDiary(
      userId,
      logId,
      itemId,
      updates,
      input.targetSlot
    );

    if (!result) {
      throw AppError.notFound('Failed to update meal item in diary', ErrorCode.RESOURCE_NOT_FOUND);
    }

    return {
      logId: result.log.id || result.log._id.toString(),
      itemId,
      slot: result.slot,
      servingQuantity: result.updatedItem.servingQuantity,
      servingWeightGrams: result.updatedItem.servingWeightGrams,
      calories: result.updatedItem.calories,
      proteinGrams: result.updatedItem.proteinGrams,
      carbsGrams: result.updatedItem.carbsGrams,
      fatGrams: result.updatedItem.fatGrams,
      fiberGrams: result.updatedItem.fiberGrams,
      isEstimated: true as const,
      updatedAt: result.log.updatedAt instanceof Date ? result.log.updatedAt.toISOString() : new Date().toISOString(),
    };
  }

  /**
   * Removes an individual meal item from a daily log (EP-NUTR-004).
   * Enforces user ownership via BOLA defense matrix and recalculates totals.
   */
  async deleteLoggedItem(userId: string, logId: string, itemId: string): Promise<{ message: string }> {
    if (!Types.ObjectId.isValid(logId)) {
      throw AppError.notFound('Diary log not found', ErrorCode.RESOURCE_NOT_FOUND);
    }

    const result = await this.repository.removeItemFromDiary(userId, logId, itemId);
    if (!result) {
      throw AppError.notFound('Meal item or diary not found', ErrorCode.RESOURCE_NOT_FOUND);
    }

    return { message: 'Meal item removed successfully.' };
  }

  /**
   * Retrieves a lightweight daily nutrition summary for Coach context and Dashboard (EP-NUTR-008).
   */
  async getDailySummary(userId: string, date: string): Promise<DailySummaryDto> {
    validateDateFormat(date);
    const target = await this.getUserTargets(userId);
    const log = await this.repository.findDiaryByDate(userId, date);

    const dailyCalorieTarget = target.dailyCalorieTarget;
    const consumedCalories = log ? log.dailyTotalCalories : 0;
    const remainingCalories = dailyCalorieTarget - consumedCalories;
    const consumedProteinGrams = log ? log.dailyTotalProtein : 0.0;
    const consumedCarbsGrams = log ? log.dailyTotalCarbs : 0.0;
    const consumedFatGrams = log ? log.dailyTotalFat : 0.0;

    return {
      date,
      dailyCalorieTarget,
      consumedCalories,
      remainingCalories,
      consumedProteinGrams,
      consumedCarbsGrams,
      consumedFatGrams,
      isEstimated: true as const,
    };
  }
}

export const nutritionService = new NutritionService();
