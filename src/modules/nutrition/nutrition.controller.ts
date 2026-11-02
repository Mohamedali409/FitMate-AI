import { Request, Response, NextFunction } from 'express';
import { NutritionService, nutritionService } from './nutrition.service.js';
import { SearchFoodsQueryInput, FoodIdParamInput, FoodItemSummaryDto } from './dto/nutrition.dto.js';
import { ApiResponse, PaginatedResponse } from '../../shared/types/api.types.js';

export class NutritionController {
  constructor(private service: NutritionService = nutritionService) {}

  /**
   * EP-NUTR-005: Search Curated Food Catalog
   * GET /api/v1/nutrition/foods/search
   */
  searchFoods = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const query = req.query as unknown as SearchFoodsQueryInput;
      const result = await this.service.searchFoods(query);

      const response: PaginatedResponse<FoodItemSummaryDto> = {
        success: true,
        data: result.items,
        meta: {
          pagination: result.pagination,
        },
      };

      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  };

  /**
   * EP-NUTR-006: Get Food Item Details & Provenance
   * GET /api/v1/nutrition/foods/:id
   */
  getFoodById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params as unknown as FoodIdParamInput;
      const result = await this.service.getFoodById(id);

      const response: ApiResponse<typeof result> = {
        success: true,
        data: result,
      };

      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  };
}

export const nutritionController = new NutritionController();
