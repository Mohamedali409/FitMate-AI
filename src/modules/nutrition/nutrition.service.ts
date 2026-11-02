import { NutritionRepository, nutritionRepository } from './nutrition.repository.js';
import {
  SearchFoodsQueryInput,
  FoodItemSummaryDto,
  FoodItemDetailDto,
} from './dto/nutrition.dto.js';
import { AppError, ErrorCode } from '../../shared/errors/AppError.js';
import { IFoodItemDocument } from './models/foodItem.model.js';

export class NutritionService {
  constructor(private repository: NutritionRepository = nutritionRepository) {}

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
}

export const nutritionService = new NutritionService();

