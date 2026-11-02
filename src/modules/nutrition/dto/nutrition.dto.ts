import { z } from 'zod';
import { FOOD_CATEGORIES, FoodCategory } from '../models/foodItem.model.js';

// MongoDB ObjectId validation regex (24 hexadecimal characters)
const OBJECT_ID_REGEX = /^[0-9a-fA-F]{24}$/;

/**
 * Query schema for EP-NUTR-005: Search Curated Food Catalog
 * Satisfies Condition AUD-004: Allows category browsing without requiring query 'q'.
 */
export const searchFoodsQuerySchema = z
  .object({
    q: z
      .string()
      .trim()
      .max(100, 'Search query cannot exceed 100 characters')
      .optional(),
    category: z
      .enum(FOOD_CATEGORIES as [FoodCategory, ...FoodCategory[]], {
        invalid_type_error: 'Invalid food category',
      })
      .optional(),
    page: z.coerce
      .number()
      .int('Page must be an integer')
      .min(1, 'Page must be at least 1')
      .default(1),
    limit: z.coerce
      .number()
      .int('Limit must be an integer')
      .min(1, 'Limit must be at least 1')
      .max(50, 'Limit cannot exceed 50 items per page')
      .default(20),
  })
  .refine(
    (data) => {
      const hasValidQ = typeof data.q === 'string' && data.q.trim().length >= 2;
      const hasCategory = Boolean(data.category);
      return hasValidQ || hasCategory;
    },
    {
      message: "Either search query 'q' (min 2 characters) or 'category' must be provided",
      path: ['q'],
    }
  );

export type SearchFoodsQueryInput = z.infer<typeof searchFoodsQuerySchema>;

/**
 * Path parameter schema for EP-NUTR-006: Get Food Item Details & Provenance
 */
export const foodIdParamSchema = z.object({
  id: z
    .string()
    .trim()
    .regex(OBJECT_ID_REGEX, 'Invalid food item ID format. Must be a 24-character hexadecimal ObjectId'),
});

export type FoodIdParamInput = z.infer<typeof foodIdParamSchema>;

/**
 * Portions & Details response structure interfaces
 */
export interface DefaultPortionDto {
  portionId?: string;
  unitNameEn: string;
  unitNameAr: string;
  gramWeight: number;
}

export interface FoodItemSummaryDto {
  id: string;
  catalogId: string;
  nameEn: string;
  nameAr: string;
  category: FoodCategory;
  servingSizeGrams: number;
  caloriesPer100g: number;
  proteinPer100g: number;
  carbsPer100g: number;
  fatPer100g: number;
  confidenceLevel: 'high' | 'medium';
  isVerified: boolean;
  isEstimated: boolean;
  defaultPortion?: DefaultPortionDto | null;
}

export interface FoodItemProvenanceDto {
  sourceOrganization: string;
  sourceDataset: string;
  sourceRecordId?: string | null;
  reviewDate: string;
  preparationState: string;
  preparationAssumptions?: string | null;
  confidenceLevel: 'high' | 'medium';
  isVerified: boolean;
  isEstimated: boolean;
}

export interface FoodItemDetailDto {
  id: string;
  catalogId: string;
  nameEn: string;
  nameAr: string;
  category: FoodCategory;
  servingSizeGrams: number;
  caloriesPer100g: number;
  proteinPer100g: number;
  carbsPer100g: number;
  fatPer100g: number;
  fiberPer100g?: number;
  standardPortions: Array<{
    portionId: string;
    unitNameEn: string;
    unitNameAr: string;
    gramWeight: number;
    isDefault?: boolean;
  }>;
  provenance: FoodItemProvenanceDto;
}

