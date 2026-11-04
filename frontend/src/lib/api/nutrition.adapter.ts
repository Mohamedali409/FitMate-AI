import { apiClient, ApiClientError } from './client';
import { config } from '../config/env';
import {
  FoodItemSummary,
  FoodItemDetail,
  DailyNutritionSummary,
  FoodCategory,
} from '../../types/nutrition.types';
import { PaginationMeta } from '../../types/api.types';

export interface NutritionApiAdapter {
  readonly isMock: boolean;
  searchFoods(
    params: { q?: string; category?: string; page?: number; limit?: number },
    token?: string
  ): Promise<{ items: FoodItemSummary[]; pagination: PaginationMeta }>;
  getFoodById(id: string, token?: string): Promise<FoodItemDetail>;
  getDailySummary(date: string, token?: string): Promise<DailyNutritionSummary>;
}

// Curated authentic seed mock dataset for rich preview
const MOCK_FOODS: FoodItemDetail[] = [
  {
    id: '654321000000000000000001',
    catalogId: 'food_eg_koshari_001',
    nameEn: 'Egyptian Koshari',
    nameAr: 'كشري مصري',
    category: 'middle_eastern_dishes',
    servingSizeGrams: 100,
    caloriesPer100g: 165,
    proteinPer100g: 5.8,
    carbsPer100g: 31.2,
    fatPer100g: 1.8,
    fiberPer100g: 3.5,
    standardPortions: [
      { portionId: 'p_koshari_med', unitNameEn: 'Medium Bowl', unitNameAr: 'طبق متوسط', gramWeight: 350, isDefault: true },
      { portionId: 'p_koshari_lrg', unitNameEn: 'Large Bowl', unitNameAr: 'طبق كبير', gramWeight: 500, isDefault: false },
    ],
    provenance: {
      sourceOrganization: 'National Nutrition Institute (NNI) Egypt',
      sourceDataset: 'Egyptian Food Composition Tables',
      reviewDate: '2026-01-15',
      preparationState: 'Cooked with lentils, rice, pasta and tomato sauce',
      confidenceLevel: 'high',
      isVerified: true,
      isEstimated: true,
    },
  },
  {
    id: '654321000000000000000002',
    catalogId: 'food_eg_foul_mudammas_oil_001',
    nameEn: 'Foul Mudammas with Olive Oil',
    nameAr: 'فول مدمس بزيت الزيتون',
    category: 'legumes',
    servingSizeGrams: 100,
    caloriesPer100g: 135,
    proteinPer100g: 7.2,
    carbsPer100g: 16.5,
    fatPer100g: 4.5,
    fiberPer100g: 5.1,
    standardPortions: [
      { portionId: 'p_foul_plate', unitNameEn: 'Standard Plate (4 tbsp)', unitNameAr: 'صحن متوسط (4 ملاعق)', gramWeight: 200, isDefault: true },
      { portionId: 'p_foul_sand', unitNameEn: 'Baladi Sandwich', unitNameAr: 'ساندوتش بلدي', gramWeight: 140, isDefault: false },
    ],
    provenance: {
      sourceOrganization: 'National Nutrition Institute (NNI) Egypt',
      sourceDataset: 'Egyptian Food Composition Tables',
      reviewDate: '2026-01-15',
      preparationState: 'Stewed fava beans with 1 tsp olive oil and cumin',
      confidenceLevel: 'high',
      isVerified: true,
      isEstimated: true,
    },
  },
  {
    id: '654321000000000000000003',
    catalogId: 'food_intl_chicken_breast_grilled_001',
    nameEn: 'Grilled Chicken Breast',
    nameAr: 'صدور دجاج مشوية',
    category: 'protein',
    servingSizeGrams: 100,
    caloriesPer100g: 165,
    proteinPer100g: 31.0,
    carbsPer100g: 0.0,
    fatPer100g: 3.6,
    fiberPer100g: 0.0,
    standardPortions: [
      { portionId: 'p_chkn_single', unitNameEn: 'Single Breast Fillet', unitNameAr: 'شريحة صدر واحدة', gramWeight: 150, isDefault: true },
      { portionId: 'p_chkn_palm', unitNameEn: 'Palm Sized Portion', unitNameAr: 'حصة بحجم راحة اليد', gramWeight: 100, isDefault: false },
    ],
    provenance: {
      sourceOrganization: 'USDA FoodData Central',
      sourceDataset: 'SR Legacy / Foundation',
      sourceRecordId: '171077',
      reviewDate: '2026-01-10',
      preparationState: 'Skinless, boneless, grilled without added oil',
      confidenceLevel: 'high',
      isVerified: true,
      isEstimated: true,
    },
  },
  {
    id: '654321000000000000000004',
    catalogId: 'food_intl_oats_cooked_water_001',
    nameEn: 'Rolled Oats (Cooked in Water)',
    nameAr: 'شوفان مطبوخ بالماء',
    category: 'carbohydrates',
    servingSizeGrams: 100,
    caloriesPer100g: 71,
    proteinPer100g: 2.5,
    carbsPer100g: 12.0,
    fatPer100g: 1.5,
    fiberPer100g: 1.7,
    standardPortions: [
      { portionId: 'p_oats_cup', unitNameEn: '1 Cup Cooked', unitNameAr: 'كوب مطبوخ', gramWeight: 234, isDefault: true },
      { portionId: 'p_oats_bowl', unitNameEn: 'Breakfast Bowl', unitNameAr: 'صحن إفطار', gramWeight: 300, isDefault: false },
    ],
    provenance: {
      sourceOrganization: 'USDA FoodData Central',
      sourceDataset: 'SR Legacy',
      sourceRecordId: '173904',
      reviewDate: '2026-01-10',
      preparationState: 'Boiled with water, no added sugar',
      confidenceLevel: 'high',
      isVerified: true,
      isEstimated: true,
    },
  },
  {
    id: '654321000000000000000005',
    catalogId: 'food_eg_baladi_bread_001',
    nameEn: 'Egyptian Baladi Flatbread',
    nameAr: 'عيش بلدي مصري',
    category: 'baked_goods',
    servingSizeGrams: 100,
    caloriesPer100g: 252,
    proteinPer100g: 8.5,
    carbsPer100g: 52.0,
    fatPer100g: 1.2,
    fiberPer100g: 4.2,
    standardPortions: [
      { portionId: 'p_bread_loaf', unitNameEn: '1 Whole Loaf', unitNameAr: 'رغيف كامل', gramWeight: 90, isDefault: true },
      { portionId: 'p_bread_half', unitNameEn: 'Half Loaf', unitNameAr: 'نصف رغيف', gramWeight: 45, isDefault: false },
    ],
    provenance: {
      sourceOrganization: 'National Nutrition Institute (NNI) Egypt',
      sourceDataset: 'Egyptian Food Composition Tables',
      reviewDate: '2026-01-15',
      preparationState: 'Baked with whole wheat and bran',
      confidenceLevel: 'high',
      isVerified: true,
      isEstimated: true,
    },
  },
  {
    id: '654321000000000000000006',
    catalogId: 'food_intl_greek_yogurt_plain_001',
    nameEn: 'Greek Yogurt (Nonfat, Plain)',
    nameAr: 'زبادي يوناني خالي الدسم',
    category: 'dairy_eggs',
    servingSizeGrams: 100,
    caloriesPer100g: 59,
    proteinPer100g: 10.2,
    carbsPer100g: 3.6,
    fatPer100g: 0.4,
    fiberPer100g: 0.0,
    standardPortions: [
      { portionId: 'p_yogurt_cup', unitNameEn: 'Standard Cup', unitNameAr: 'كوب زبادي', gramWeight: 170, isDefault: true },
    ],
    provenance: {
      sourceOrganization: 'USDA FoodData Central',
      sourceDataset: 'Foundation Foods',
      sourceRecordId: '170903',
      reviewDate: '2026-01-10',
      preparationState: 'Pasteurized, strained, no added sugar',
      confidenceLevel: 'high',
      isVerified: true,
      isEstimated: true,
    },
  },
];

export class RealNutritionAdapter implements NutritionApiAdapter {
  readonly isMock = false;

  async searchFoods(
    params: { q?: string; category?: string; page?: number; limit?: number },
    token?: string
  ): Promise<{ items: FoodItemSummary[]; pagination: PaginationMeta }> {
    const hasQuery = typeof params.q === 'string' && params.q.trim().length >= 2;
    const hasCategory = Boolean(params.category);

    if (!hasQuery && !hasCategory) {
      return {
        items: [],
        pagination: {
          page: params.page || 1,
          limit: params.limit || 20,
          totalItems: 0,
          totalPages: 1,
          hasNextPage: false,
          hasPrevPage: false,
        },
      };
    }

    const queryParams: Record<string, string | number | undefined> = {};
    if (hasQuery) queryParams.q = params.q!.trim();
    if (hasCategory) queryParams.category = params.category;
    if (params.page) queryParams.page = params.page;
    if (params.limit) queryParams.limit = params.limit;

    const res = await apiClient.requestPaginated<FoodItemSummary>('/nutrition/foods/search', {
      token,
      params: queryParams,
    });
    return {
      items: res.data,
      pagination: res.meta.pagination,
    };
  }

  async getFoodById(id: string, token?: string): Promise<FoodItemDetail> {
    if (!id || typeof id !== 'string' || !/^[0-9a-fA-F]{24}$/.test(id.trim())) {
      throw new ApiClientError(400, {
        code: 'VALIDATION_ERROR',
        message: 'Invalid food item ID format. Must be a 24-character hexadecimal ObjectId',
      });
    }

    return apiClient.get<FoodItemDetail>(`/nutrition/foods/${id.trim()}`, { token });
  }

  async getDailySummary(date: string, token?: string): Promise<DailyNutritionSummary> {
    return apiClient.get<DailyNutritionSummary>('/nutrition/summary', {
      token,
      params: { date },
    });
  }
}

export class MockNutritionAdapter implements NutritionApiAdapter {
  readonly isMock = true;

  async searchFoods(
    params: { q?: string; category?: string; page?: number; limit?: number },
    _token?: string
  ): Promise<{ items: FoodItemSummary[]; pagination: PaginationMeta }> {
    await new Promise((resolve) => setTimeout(resolve, 200));

    const hasQuery = typeof params.q === 'string' && params.q.trim().length >= 2;
    const hasCategory = Boolean(params.category);

    if (!hasQuery && !hasCategory) {
      return {
        items: [],
        pagination: {
          page: params.page || 1,
          limit: params.limit || 10,
          totalItems: 0,
          totalPages: 1,
          hasNextPage: false,
          hasPrevPage: false,
        },
      };
    }

    let filtered = [...MOCK_FOODS];

    if (params.category) {
      filtered = filtered.filter((f) => f.category === params.category);
    }

    if (params.q && params.q.trim().length >= 2) {
      const q = params.q.toLowerCase().trim();
      filtered = filtered.filter(
        (f) =>
          f.nameEn.toLowerCase().includes(q) ||
          f.nameAr.includes(q) ||
          f.category.includes(q)
      );
    }

    const page = params.page || 1;
    const limit = params.limit || 10;
    const startIndex = (page - 1) * limit;
    const paginatedItems = filtered.slice(startIndex, startIndex + limit);

    const summaries: FoodItemSummary[] = paginatedItems.map((f) => ({
      id: f.id,
      catalogId: f.catalogId,
      nameEn: f.nameEn,
      nameAr: f.nameAr,
      category: f.category,
      servingSizeGrams: f.servingSizeGrams,
      caloriesPer100g: f.caloriesPer100g,
      proteinPer100g: f.proteinPer100g,
      carbsPer100g: f.carbsPer100g,
      fatPer100g: f.fatPer100g,
      confidenceLevel: f.provenance.confidenceLevel,
      isVerified: f.provenance.isVerified,
      isEstimated: true,
      defaultPortion: f.standardPortions[0] || null,
    }));

    return {
      items: summaries,
      pagination: {
        page,
        limit,
        totalItems: filtered.length,
        totalPages: Math.ceil(filtered.length / limit) || 1,
        hasNextPage: startIndex + limit < filtered.length,
        hasPrevPage: page > 1,
      },
    };
  }

  async getFoodById(id: string, _token?: string): Promise<FoodItemDetail> {
    await new Promise((resolve) => setTimeout(resolve, 150));
    const food = MOCK_FOODS.find((f) => f.id === id || f.catalogId === id);
    if (!food) {
      throw new ApiClientError(404, {
        code: 'NOT_FOUND',
        message: 'Food item not found',
      });
    }
    return food;
  }

  async getDailySummary(date: string, _token?: string): Promise<DailyNutritionSummary> {
    await new Promise((resolve) => setTimeout(resolve, 200));

    // Realistic demo snapshot of today's logged meals
    return {
      date: date || '2026-11-02',
      dailyCalorieTarget: 2150,
      caloriesConsumed: 1680,
      remainingCalories: 470,
      proteinTargetGrams: 160.0,
      proteinConsumedGrams: 128.0,
      carbsTargetGrams: 215.0,
      carbsConsumedGrams: 172.0,
      fatTargetGrams: 60.0,
      fatConsumedGrams: 48.0,
      isEstimated: true,
      slots: {
        breakfast: {
          slot: 'breakfast',
          calories: 460,
          proteinGrams: 32.0,
          carbsGrams: 58.0,
          fatGrams: 12.0,
          items: [
            {
              id: 'item_b1',
              catalogId: 'food_intl_oats_cooked_water_001',
              nameEn: 'Rolled Oats (Cooked in Water)',
              nameAr: 'شوفان مطبوخ بالماء',
              servingWeightGrams: 234,
              portionMultiplier: 1,
              unitNameEn: '1 Cup Cooked',
              unitNameAr: 'كوب مطبوخ',
              calories: 166,
              proteinGrams: 5.9,
              carbsGrams: 28.1,
              fatGrams: 3.5,
              isQuickAdd: false,
              isEstimated: true,
              loggedAt: '2026-11-02T08:30:00Z',
            },
            {
              id: 'item_b2',
              catalogId: 'food_intl_greek_yogurt_plain_001',
              nameEn: 'Greek Yogurt (Nonfat, Plain)',
              nameAr: 'زبادي يوناني خالي الدسم',
              servingWeightGrams: 170,
              portionMultiplier: 1,
              unitNameEn: 'Standard Cup',
              unitNameAr: 'كوب زبادي',
              calories: 100,
              proteinGrams: 17.3,
              carbsGrams: 6.1,
              fatGrams: 0.7,
              isQuickAdd: false,
              isEstimated: true,
              loggedAt: '2026-11-02T08:35:00Z',
            },
          ],
        },
        lunch: {
          slot: 'lunch',
          calories: 680,
          proteinGrams: 58.0,
          carbsGrams: 65.0,
          fatGrams: 18.0,
          items: [
            {
              id: 'item_l1',
              catalogId: 'food_intl_chicken_breast_grilled_001',
              nameEn: 'Grilled Chicken Breast',
              nameAr: 'صدور دجاج مشوية',
              servingWeightGrams: 150,
              portionMultiplier: 1,
              unitNameEn: 'Single Breast Fillet',
              unitNameAr: 'شريحة صدر واحدة',
              calories: 248,
              proteinGrams: 46.5,
              carbsGrams: 0.0,
              fatGrams: 5.4,
              isQuickAdd: false,
              isEstimated: true,
              loggedAt: '2026-11-02T13:45:00Z',
            },
            {
              id: 'item_l2',
              catalogId: 'food_eg_koshari_001',
              nameEn: 'Egyptian Koshari',
              nameAr: 'كشري مصري',
              servingWeightGrams: 250,
              portionMultiplier: 0.71,
              unitNameEn: 'Custom Grams',
              unitNameAr: 'وزن مخصص',
              calories: 412,
              proteinGrams: 14.5,
              carbsGrams: 78.0,
              fatGrams: 4.5,
              isQuickAdd: false,
              isEstimated: true,
              loggedAt: '2026-11-02T13:50:00Z',
            },
          ],
        },
        dinner: {
          slot: 'dinner',
          calories: 380,
          proteinGrams: 26.0,
          carbsGrams: 39.0,
          fatGrams: 14.0,
          items: [
            {
              id: 'item_d1',
              catalogId: 'food_eg_foul_mudammas_oil_001',
              nameEn: 'Foul Mudammas with Olive Oil',
              nameAr: 'فول مدمس بزيت الزيتون',
              servingWeightGrams: 200,
              portionMultiplier: 1,
              unitNameEn: 'Standard Plate',
              unitNameAr: 'صحن متوسط',
              calories: 270,
              proteinGrams: 14.4,
              carbsGrams: 33.0,
              fatGrams: 9.0,
              isQuickAdd: false,
              isEstimated: true,
              loggedAt: '2026-11-02T20:00:00Z',
            },
          ],
        },
        snack: {
          slot: 'snack',
          calories: 160,
          proteinGrams: 12.0,
          carbsGrams: 10.0,
          fatGrams: 4.0,
          items: [
            {
              id: 'item_s1',
              nameEn: 'Protein Shake (Quick-Add)',
              nameAr: 'مخفوق بروتين (إضافة سريعة)',
              servingWeightGrams: 250,
              portionMultiplier: 1,
              unitNameEn: 'Serving',
              unitNameAr: 'حصة',
              calories: 160,
              proteinGrams: 12.0,
              carbsGrams: 10.0,
              fatGrams: 4.0,
              isQuickAdd: true,
              isEstimated: true,
              loggedAt: '2026-11-02T16:30:00Z',
            },
          ],
        },
      },
    };
  }
}

export function getNutritionAdapter(): NutritionApiAdapter {
  return config.useMocks ? new MockNutritionAdapter() : new RealNutritionAdapter();
}

