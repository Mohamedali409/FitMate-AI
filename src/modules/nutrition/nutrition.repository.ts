import { FilterQuery } from 'mongoose';
import { FoodItemModel, IFoodItem, IFoodItemDocument } from './models/foodItem.model.js';
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
  /**
   * Find a single food item by its MongoDB ObjectId.
   * Excludes archived items.
   */
  async findFoodById(id: string): Promise<IFoodItemDocument | null> {
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
}

export const nutritionRepository = new NutritionRepository();

