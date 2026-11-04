import { FilterQuery, Types } from 'mongoose';
import { FoodItemModel, IFoodItem, IFoodItemDocument } from './models/foodItem.model.js';
import {
  NutritionLogModel,
  INutritionLogDocument,
  INutritionLogItem,
  MealSlotType,
  MEAL_SLOT_TYPES,
} from './models/nutritionLog.model.js';
import { aggregateNutritionItems } from './services/nutrition.calculator.js';
import { SearchFoodsQueryInput } from './dto/nutrition.dto.js';
import { normalizeText, buildSearchTokens } from './utils/textNormalizer.js';

/**
 * Escapes regex special characters in user input strings.
 */
function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export interface PaginatedResult<T> {
  items: T[];
  totalItems: number;
  totalPages: number;
  page: number;
  limit: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

export class NutritionRepository {
  // =========================================================================
  // 1. Curated Food Library Persistence
  // =========================================================================

  /**
   * Find a single food item by its MongoDB ObjectId.
   * Excludes archived items.
   */
  async findFoodById(id: string | Types.ObjectId): Promise<IFoodItemDocument | null> {
    return FoodItemModel.findOne({ _id: id, isArchived: false }).exec();
  }

  /**
   * Find a single food item by its deterministic catalogId (e.g. 'food_eg_foul_001').
   */
  async findFoodByCatalogId(catalogId: string): Promise<IFoodItemDocument | null> {
    return FoodItemModel.findOne({ catalogId }).exec();
  }

  /**
   * Search food catalog with bilingual prefix indexing and category filtering.
   * 
   * Satisfies Condition AUD-003: Tokens in searchTokens are pre-normalized and lowercased.
   * Prefix queries utilize B-tree index bounds via `{ searchTokens: { $regex: '^' + term } }`
   * without case-insensitive regex modifiers.
   * 
   * Satisfies Condition AUD-004: Supports category browsing without requiring query 'q'.
   */
  async searchFoods(query: SearchFoodsQueryInput): Promise<PaginatedResult<IFoodItemDocument>> {
    const { q, category, page = 1, limit = 20 } = query;
    const filter: FilterQuery<IFoodItemDocument> = { isArchived: false };

    // Apply category filter if provided
    if (category) {
      filter.category = category;
    }

    // Apply text search if query string is provided
    if (q && q.trim().length > 0) {
      const normalizedQ = normalizeText(q.trim());
      const words = normalizedQ.split(/\s+/).filter((w) => w.length > 0);

      if (words.length === 1) {
        // Single word: match prefix against searchTokens array
        filter.searchTokens = { $regex: '^' + escapeRegex(words[0]!) };
      } else if (words.length > 1) {
        // Multi-word: match all words against searchTokens
        filter.$and = words.map((word) => ({
          searchTokens: { $regex: '^' + escapeRegex(word) },
        }));
      }
    }

    const skip = (page - 1) * limit;

    const [items, totalItems] = await Promise.all([
      FoodItemModel.find(filter)
        .sort({ nameEn: 1 })
        .skip(skip)
        .limit(limit)
        .exec(),
      FoodItemModel.countDocuments(filter).exec(),
    ]);

    const totalPages = Math.ceil(totalItems / limit) || 1;

    return {
      items,
      totalItems,
      totalPages,
      page,
      limit,
      hasNextPage: page < totalPages,
      hasPrevPage: page > 1,
    };
  }

  /**
   * Upsert a food item for idempotent database seeding.
   */
  async upsertFoodItem(foodData: Partial<IFoodItem> & { catalogId: string }): Promise<{ item: IFoodItemDocument; isNew: boolean }> {
    const existing = await FoodItemModel.findOne({ catalogId: foodData.catalogId }).exec();

    // Ensure search tokens are pre-computed and lowercased
    const searchTokens = buildSearchTokens(
      foodData.nameEn || existing?.nameEn || '',
      foodData.nameAr || existing?.nameAr || '',
      foodData.searchAliases || existing?.searchAliases || []
    );

    if (existing) {
      Object.assign(existing, foodData, { searchTokens });
      const updated = await existing.save();
      return { item: updated, isNew: false };
    }

    const newItem = new FoodItemModel({
      ...foodData,
      searchTokens,
      isEstimated: true, // Always true (Core Invariant 2)
      isArchived: foodData.isArchived ?? false,
      schemaVersion: foodData.schemaVersion ?? 1,
    });

    const saved = await newItem.save();
    return { item: saved, isNew: true };
  }

  /**
   * Count total active food items in catalog.
   */
  async countFoods(): Promise<number> {
    return FoodItemModel.countDocuments({ isArchived: false }).exec();
  }

  // =========================================================================
  // 2. Daily Nutrition Log Persistence Layer
  // =========================================================================

  /**
   * Recalculates and updates slot subtotals and daily totals for a nutrition log document.
   * Leverages aggregateNutritionItems pure utility to conform with DB-016 precision tiers.
   */
  recalculateTotals(log: INutritionLogDocument): void {
    const slotKeys: MealSlotType[] = MEAL_SLOT_TYPES;
    let dailyCalories = 0;
    let dailyProtein = 0;
    let dailyCarbs = 0;
    let dailyFat = 0;

    for (const slotKey of slotKeys) {
      const slot = log.slots[slotKey];
      if (slot) {
        const slotAgg = aggregateNutritionItems(slot.items || []);
        slot.slotTotalCalories = slotAgg.calories;
        slot.slotTotalProtein = slotAgg.proteinGrams;
        slot.slotTotalCarbs = slotAgg.carbsGrams;
        slot.slotTotalFat = slotAgg.fatGrams;

        dailyCalories += slot.slotTotalCalories;
        dailyProtein += slot.slotTotalProtein;
        dailyCarbs += slot.slotTotalCarbs;
        dailyFat += slot.slotTotalFat;
      }
    }

    log.dailyTotalCalories = Math.round(dailyCalories);
    log.dailyTotalProtein = Math.round(dailyProtein * 10) / 10;
    log.dailyTotalCarbs = Math.round(dailyCarbs * 10) / 10;
    log.dailyTotalFat = Math.round(dailyFat * 10) / 10;
  }

  /**
   * Find a user's daily diary document by canonical calendar date (YYYY-MM-DD).
   * Scoped strictly by userId.
   */
  async findDiaryByDate(
    userId: string | Types.ObjectId,
    date: string
  ): Promise<INutritionLogDocument | null> {
    return NutritionLogModel.findOne({ userId, date }).exec();
  }

  /**
   * Find a diary document by user ID and document log ID.
   * Scoped strictly by userId to enforce BOLA defense.
   */
  async findDiaryById(
    userId: string | Types.ObjectId,
    logId: string | Types.ObjectId
  ): Promise<INutritionLogDocument | null> {
    return NutritionLogModel.findOne({ _id: logId, userId }).exec();
  }

  /**
   * Creates a new daily diary document for a user.
   */
  async createDiary(
    userId: string | Types.ObjectId,
    date: string,
    timezoneOffsetMinutes: number = 0
  ): Promise<INutritionLogDocument> {
    return NutritionLogModel.create({
      userId,
      date,
      timezoneOffsetMinutes,
    });
  }

  /**
   * Finds or creates a user's daily diary document for a calendar date.
   * 
   * Satisfies Condition 2 (Upsert Collision Recovery):
   * Wraps creation in a try/catch block that detects MongoDB code 11000
   * (E11000 duplicate key error on { userId, date }) and executes a single retry
   * to seamlessly retrieve the concurrently created document.
   */
  async findOrCreateDiary(
    userId: string | Types.ObjectId,
    date: string,
    timezoneOffsetMinutes: number = 0
  ): Promise<INutritionLogDocument> {
    const existing = await this.findDiaryByDate(userId, date);
    if (existing) {
      return existing;
    }

    try {
      return await this.createDiary(userId, date, timezoneOffsetMinutes);
    } catch (err: any) {
      if (err?.code === 11000 || (err?.name === 'MongoServerError' && err?.code === 11000)) {
        const collisionResolved = await this.findDiaryByDate(userId, date);
        if (collisionResolved) {
          return collisionResolved;
        }
      }
      throw err;
    }
  }

  /**
   * Adds an immutable food item snapshot to a specific meal slot.
   * Automatically creates daily diary with race recovery if missing,
   * pushes item, recalculates slot and daily totals, and persists atomically.
   */
  async addItemToSlot(
    userId: string | Types.ObjectId,
    date: string,
    slot: MealSlotType,
    item: INutritionLogItem,
    timezoneOffsetMinutes: number = 0
  ): Promise<{ log: INutritionLogDocument; item: INutritionLogItem }> {
    const log = await this.findOrCreateDiary(userId, date, timezoneOffsetMinutes);

    log.slots[slot].items.push(item);
    this.recalculateTotals(log);

    const saved = await log.save();
    return { log: saved, item };
  }

  /**
   * Removes an individual meal item from a daily log.
   * Enforces user ownership via findDiaryById (BOLA defense).
   * Recalculates slot and daily aggregates.
   */
  async removeItemFromDiary(
    userId: string | Types.ObjectId,
    logId: string | Types.ObjectId,
    itemId: string
  ): Promise<{ log: INutritionLogDocument; removedItem: INutritionLogItem; slot: MealSlotType } | null> {
    const log = await this.findDiaryById(userId, logId);
    if (!log) {
      return null;
    }

    const slotTypes: MealSlotType[] = MEAL_SLOT_TYPES;
    let removedItem: INutritionLogItem | null = null;
    let foundSlot: MealSlotType | null = null;

    for (const slotKey of slotTypes) {
      const slot = log.slots[slotKey];
      const index = slot.items.findIndex((it) => it.itemId === itemId);
      if (index !== -1) {
        removedItem = slot.items[index]!;
        foundSlot = slotKey;
        slot.items.splice(index, 1);
        break;
      }
    }

    if (!removedItem || !foundSlot) {
      return null;
    }

    this.recalculateTotals(log);
    const saved = await log.save();
    return { log: saved, removedItem, slot: foundSlot };
  }

  /**
   * Updates an individual meal item in a daily log.
   * Enforces user ownership (BOLA defense) and supports moving items across slots.
   */
  async updateItemInDiary(
    userId: string | Types.ObjectId,
    logId: string | Types.ObjectId,
    itemId: string,
    updates: Partial<INutritionLogItem>,
    targetSlot?: MealSlotType
  ): Promise<{ log: INutritionLogDocument; updatedItem: INutritionLogItem; slot: MealSlotType } | null> {
    const log = await this.findDiaryById(userId, logId);
    if (!log) {
      return null;
    }

    const slotTypes: MealSlotType[] = MEAL_SLOT_TYPES;
    let currentSlot: MealSlotType | null = null;
    let itemIndex = -1;

    for (const slotKey of slotTypes) {
      const slot = log.slots[slotKey];
      const idx = slot.items.findIndex((it) => it.itemId === itemId);
      if (idx !== -1) {
        currentSlot = slotKey;
        itemIndex = idx;
        break;
      }
    }

    if (currentSlot === null || itemIndex === -1) {
      return null;
    }

    const targetItem = log.slots[currentSlot].items[itemIndex]!;

    // Apply allowed updates to item snapshot
    Object.assign(targetItem, updates);

    let finalSlot = currentSlot;

    // Handle slot migration if targetSlot is provided and distinct
    if (targetSlot && targetSlot !== currentSlot) {
      log.slots[currentSlot].items.splice(itemIndex, 1);
      log.slots[targetSlot].items.push(targetItem);
      finalSlot = targetSlot;
    }

    this.recalculateTotals(log);
    const saved = await log.save();

    const savedItem = saved.slots[finalSlot].items.find((it) => it.itemId === itemId)!;
    return { log: saved, updatedItem: savedItem, slot: finalSlot };
  }

  /**
   * Retrieves diary history within an inclusive local calendar date range (YYYY-MM-DD).
   * Optimally utilizes idx_user_nutrition_history index { userId: 1, date: -1 }.
   */
  async findDiaryHistory(
    userId: string | Types.ObjectId,
    startDate: string,
    endDate: string
  ): Promise<INutritionLogDocument[]> {
    return NutritionLogModel.find({
      userId,
      date: { $gte: startDate, $lte: endDate },
    })
      .sort({ date: -1 })
      .exec();
  }

  /**
   * Persists directly a diary document with total recalculation and validation.
   */
  async saveDiary(log: INutritionLogDocument): Promise<INutritionLogDocument> {
    this.recalculateTotals(log);
    return log.save();
  }
}

export const nutritionRepository = new NutritionRepository();
