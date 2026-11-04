import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { FoodDetailModal } from '../src/features/nutrition/FoodDetailModal';
import { RealNutritionAdapter, MockNutritionAdapter } from '../src/lib/api/nutrition.adapter';
import {
  calculateServingNutrition,
  validateServingWeight,
  getDefaultServingWeight,
  MAX_SERVING_WEIGHT_GRAMS,
  MIN_SERVING_WEIGHT_GRAMS,
  ReferenceNutrients,
} from '../src/lib/nutrition/servingCalculator';
import { ApiClientError, setAccessTokenProvider, setTokenRefreshHandler } from '../src/lib/api/client';
import { config } from '../src/lib/config/env';
import { LanguageProvider } from '../src/lib/i18n/LanguageContext';
import { FoodItemDetail } from '../src/types/nutrition.types';

// Real Backend Detail Response Fixture (matching EP-NUTR-006 contract)
const MOCK_DETAIL_FIXTURE: FoodItemDetail = {
  id: '654321000000000000000001',
  catalogId: 'food_eg_koshari_001',
  nameEn: 'Egyptian Koshari',
  nameAr: 'كشري مصري',
  category: 'middle_eastern_dishes',
  servingSizeGrams: 100.0,
  caloriesPer100g: 165,
  proteinPer100g: 5.2,
  carbsPer100g: 31.0,
  fatPer100g: 2.5,
  fiberPer100g: 3.8,
  standardPortions: [
    {
      portionId: 'portion_koshari_small_plate',
      unitNameEn: 'Small Plate',
      unitNameAr: 'طبق صغير',
      gramWeight: 250.0,
      isDefault: true,
    },
    {
      portionId: 'portion_koshari_large_plate',
      unitNameEn: 'Large Plate',
      unitNameAr: 'طبق كبير',
      gramWeight: 450.0,
      isDefault: false,
    },
  ],
  provenance: {
    sourceOrganization: 'National Nutrition Institute (NNI) Egypt',
    sourceDataset: 'Food Composition Tables for Egypt (2006)',
    sourceRecordId: null,
    reviewDate: '2026-01-15T00:00:00.000Z',
    preparationState: 'cooked',
    preparationAssumptions: 'Cooked with lentils, rice, pasta and spiced tomato sauce.',
    confidenceLevel: 'medium',
    isVerified: false,
    isEstimated: true,
  },
};

const MOCK_CHICKEN_FIXTURE: FoodItemDetail = {
  id: '654321000000000000000002',
  catalogId: 'food_intl_chicken_breast_raw_001',
  nameEn: 'Chicken Breast (Raw)',
  nameAr: 'صدور دجاج نيئة',
  category: 'protein',
  servingSizeGrams: 100.0,
  caloriesPer100g: 120,
  proteinPer100g: 22.5,
  carbsPer100g: 0.0,
  fatPer100g: 2.6,
  fiberPer100g: undefined,
  standardPortions: [
    {
      portionId: 'portion_chicken_small_fillet',
      unitNameEn: 'Small Fillet',
      unitNameAr: 'شريحة صغيرة',
      gramWeight: 150.0,
      isDefault: true,
    },
  ],
  provenance: {
    sourceOrganization: 'USDA FoodData Central',
    sourceDataset: 'Foundation Foods',
    sourceRecordId: '171077',
    reviewDate: '2026-11-01T00:00:00.000Z',
    preparationState: 'raw',
    preparationAssumptions: 'Boneless, skinless raw breast meat.',
    confidenceLevel: 'high',
    isVerified: true,
    isEstimated: true,
  },
};

describe('Phase FE 3.2: Food Details & Serving Calculator Integration', () => {
  let originalFetch: typeof globalThis.fetch;
  let originalUseMocks: boolean;

  beforeEach(() => {
    vi.clearAllMocks();
    originalFetch = globalThis.fetch;
    originalUseMocks = config.useMocks;
    config.useMocks = false;
    setAccessTokenProvider(null);
    setTokenRefreshHandler(null);
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    config.useMocks = originalUseMocks;
    setAccessTokenProvider(null);
    setTokenRefreshHandler(null);
  });

  // =========================================================================
  // SUITE 1: Serving Nutrition Calculator (Pure Arithmetic & Validation)
  // =========================================================================
  describe('Serving Nutrition Calculator', () => {
    const koshariBaseline: ReferenceNutrients = {
      caloriesPer100g: 165,
      proteinPer100g: 5.2,
      carbsPer100g: 31.0,
      fatPer100g: 2.5,
      fiberPer100g: 3.8,
    };

    it('1. correctly calculates 100g baseline without rounding distortion', () => {
      const result = calculateServingNutrition(koshariBaseline, 100);

      expect(result.servingWeightGrams).toBe(100);
      expect(result.calories).toBe(165);
      expect(result.proteinGrams).toBe(5.2);
      expect(result.carbsGrams).toBe(31.0);
      expect(result.fatGrams).toBe(2.5);
      expect(result.fiberGrams).toBe(3.8);
      expect(result.isEstimated).toBe(true);
    });

    it('2. correctly scales 50g half serving (multiplier = 0.5)', () => {
      const result = calculateServingNutrition(koshariBaseline, 50);

      expect(result.servingWeightGrams).toBe(50);
      // 165 * 0.5 = 82.5 -> rounds to 83
      expect(result.calories).toBe(83);
      // 5.2 * 0.5 = 2.6
      expect(result.proteinGrams).toBe(2.6);
      // 31.0 * 0.5 = 15.5
      expect(result.carbsGrams).toBe(15.5);
      // 2.5 * 0.5 = 1.25 -> 1.3
      expect(result.fatGrams).toBe(1.3);
      // 3.8 * 0.5 = 1.9
      expect(result.fiberGrams).toBe(1.9);
    });

    it('3. correctly scales 150g serving (multiplier = 1.5)', () => {
      const result = calculateServingNutrition(koshariBaseline, 150);

      expect(result.servingWeightGrams).toBe(150);
      // 165 * 1.5 = 247.5 -> 248
      expect(result.calories).toBe(248);
      // 5.2 * 1.5 = 7.8
      expect(result.proteinGrams).toBe(7.8);
      // 31.0 * 1.5 = 46.5
      expect(result.carbsGrams).toBe(46.5);
      // 2.5 * 1.5 = 3.75 -> 3.8
      expect(result.fatGrams).toBe(3.8);
      // 3.8 * 1.5 = 5.7
      expect(result.fiberGrams).toBe(5.7);
    });

    it('4. handles fractional decimal weights accurately (e.g. 75.5g)', () => {
      const result = calculateServingNutrition(koshariBaseline, 75.5);

      expect(result.servingWeightGrams).toBe(75.5);
      // 165 * 0.755 = 124.575 -> 125
      expect(result.calories).toBe(125);
      // 5.2 * 0.755 = 3.926 -> 3.9
      expect(result.proteinGrams).toBe(3.9);
      // 31.0 * 0.755 = 23.405 -> 23.4
      expect(result.carbsGrams).toBe(23.4);
      // 2.5 * 0.755 = 1.8875 -> 1.9
      expect(result.fatGrams).toBe(1.9);
      // 3.8 * 0.755 = 2.869 -> 2.9
      expect(result.fiberGrams).toBe(2.9);
    });

    it('5. handles missing optional fiber (null or undefined) safely', () => {
      const chickenBaseline: ReferenceNutrients = {
        caloriesPer100g: 120,
        proteinPer100g: 22.5,
        carbsPer100g: 0.0,
        fatPer100g: 2.6,
        fiberPer100g: undefined,
      };

      const result = calculateServingNutrition(chickenBaseline, 150);
      expect(result.fiberGrams).toBeNull();
      expect(result.calories).toBe(180);
      expect(result.proteinGrams).toBe(33.8);
    });

    it('6. rejects zero, negative, and non-numeric weights via validation utility', () => {
      expect(validateServingWeight(0).isValid).toBe(false);
      expect(validateServingWeight(-10).isValid).toBe(false);
      expect(validateServingWeight('invalid').isValid).toBe(false);
      expect(validateServingWeight(NaN).isValid).toBe(false);
      expect(validateServingWeight(null).isValid).toBe(false);
      expect(validateServingWeight(undefined).isValid).toBe(false);

      expect(() => calculateServingNutrition(koshariBaseline, 0)).toThrow();
      expect(() => calculateServingNutrition(koshariBaseline, -50)).toThrow();
    });

    it('7. validates maximum weight threshold (5000g upper bound)', () => {
      expect(validateServingWeight(5000).isValid).toBe(true);
      expect(validateServingWeight(5000.1).isValid).toBe(false);
      expect(validateServingWeight(99999).isValid).toBe(false);

      expect(() => calculateServingNutrition(koshariBaseline, 5001)).toThrow(/cannot exceed 5000g/i);
    });

    it('8. does NOT mutate the source food nutrients object (Immutability guarantee)', () => {
      const frozenFood: ReferenceNutrients = Object.freeze({
        caloriesPer100g: 165,
        proteinPer100g: 5.2,
        carbsPer100g: 31.0,
        fatPer100g: 2.5,
        fiberPer100g: 3.8,
      });

      expect(() => calculateServingNutrition(frozenFood, 250)).not.toThrow();
      expect(frozenFood.caloriesPer100g).toBe(165);
    });

    it('9. selects correct default serving weight from food structure', () => {
      // 1. Prefers isDefault portion
      expect(getDefaultServingWeight(MOCK_DETAIL_FIXTURE)).toBe(250.0);

      // 2. Falls back to first standard portion if none has isDefault
      const noDefaultPortionFood = {
        standardPortions: [{ portionId: 'p1', gramWeight: 180.0, isDefault: false }],
        servingSizeGrams: 100.0,
      };
      expect(getDefaultServingWeight(noDefaultPortionFood)).toBe(180.0);

      // 3. Falls back to servingSizeGrams if standard portions is empty
      const noPortionsFood = { standardPortions: [], servingSizeGrams: 125.0 };
      expect(getDefaultServingWeight(noPortionsFood)).toBe(125.0);

      // 4. Default 100g fallback
      expect(getDefaultServingWeight({})).toBe(100.0);
    });
  });

  // =========================================================================
  // SUITE 2: Nutrition Adapter (EP-NUTR-006 Real & Mock Integration)
  // =========================================================================
  describe('Nutrition Adapter (EP-NUTR-006)', () => {
    it('10. RealNutritionAdapter fetches food details by valid 24-char ObjectId', async () => {
      let capturedUrl = '';
      let capturedHeaders: any = null;

      globalThis.fetch = vi.fn().mockImplementation(async (url: string, opts: any) => {
        capturedUrl = url;
        capturedHeaders = opts.headers;
        return {
          ok: true,
          status: 200,
          json: async () => ({
            success: true,
            data: MOCK_DETAIL_FIXTURE,
          }),
        };
      });

      const adapter = new RealNutritionAdapter();
      const result = await adapter.getFoodById('654321000000000000000001', 'active_jwt_token');

      expect(capturedUrl).toContain('/nutrition/foods/654321000000000000000001');
      expect(capturedHeaders.Authorization).toBe('Bearer active_jwt_token');
      expect(result.nameEn).toBe('Egyptian Koshari');
      expect(result.provenance.sourceOrganization).toBe('National Nutrition Institute (NNI) Egypt');
      expect(result.standardPortions).toHaveLength(2);
    });

    it('11. RealNutritionAdapter rejects invalid ObjectId format without issuing HTTP request', async () => {
      const fetchSpy = vi.fn();
      globalThis.fetch = fetchSpy;

      const adapter = new RealNutritionAdapter();

      await expect(adapter.getFoodById('invalid-short-id')).rejects.toThrow(ApiClientError);
      await expect(adapter.getFoodById('')).rejects.toThrow(ApiClientError);
      expect(fetchSpy).not.toHaveBeenCalled();
    });

    it('12. RealNutritionAdapter surfaces 404 NOT_FOUND correctly', async () => {
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 404,
        json: async () => ({
          success: false,
          error: { code: 'NOT_FOUND', message: 'Food item not found' },
        }),
      });

      const adapter = new RealNutritionAdapter();

      let errorCaught: ApiClientError | null = null;
      try {
        await adapter.getFoodById('507f1f77bcf86cd799439011', 'valid_token');
      } catch (err: any) {
        errorCaught = err;
      }

      expect(errorCaught).toBeInstanceOf(ApiClientError);
      expect(errorCaught?.statusCode).toBe(404);
      expect(errorCaught?.code).toBe('NOT_FOUND');
    });

    it('13. RealNutritionAdapter surfaces network failure without falling back to mock data', async () => {
      globalThis.fetch = vi.fn().mockRejectedValue(new Error('Network offline ECONNREFUSED'));

      const adapter = new RealNutritionAdapter();

      let errorCaught: ApiClientError | null = null;
      try {
        await adapter.getFoodById('654321000000000000000001', 'valid_token');
      } catch (err: any) {
        errorCaught = err;
      }

      expect(errorCaught).toBeInstanceOf(ApiClientError);
      expect(errorCaught?.code).toBe('NETWORK_ERROR');
    });

    it('14. MockNutritionAdapter throws 404 for unknown food ID', async () => {
      const mockAdapter = new MockNutritionAdapter();

      await expect(mockAdapter.getFoodById('000000000000000000000000')).rejects.toThrow(ApiClientError);
    });

    it('15. automatically coordinates 401 refresh on getFoodById and retries once', async () => {
      let callCount = 0;
      let secondCallHeader = '';

      globalThis.fetch = vi.fn().mockImplementation(async (_url: string, opts: any) => {
        callCount++;
        if (callCount === 1) {
          return {
            ok: false,
            status: 401,
            json: async () => ({
              success: false,
              error: { code: 'UNAUTHORIZED', message: 'Token expired' },
            }),
          };
        } else {
          secondCallHeader = opts.headers.Authorization;
          return {
            ok: true,
            status: 200,
            json: async () => ({
              success: true,
              data: MOCK_DETAIL_FIXTURE,
            }),
          };
        }
      });

      // Register mock refresh handler
      setTokenRefreshHandler(async () => 'renewed_jwt_token');

      const adapter = new RealNutritionAdapter();
      const result = await adapter.getFoodById('654321000000000000000001', 'initial_stale_token');

      expect(callCount).toBe(2);
      expect(secondCallHeader).toBe('Bearer renewed_jwt_token');
      expect(result.nameEn).toBe('Egyptian Koshari');
    });
  });

  // =========================================================================
  // SUITE 3: FoodDetailModal UI & Interaction
  // =========================================================================
  describe('FoodDetailModal Component UI', () => {
    it('16. renders loading skeleton while details are being fetched', async () => {
      // Simulate delayed fetch
      globalThis.fetch = vi.fn().mockImplementation(async () => {
        return new Promise((resolve) => {
          setTimeout(() => {
            resolve({
              ok: true,
              status: 200,
              json: async () => ({
                success: true,
                data: MOCK_DETAIL_FIXTURE,
              }),
            });
          }, 300);
        });
      });

      render(
        <LanguageProvider>
          <FoodDetailModal
            foodId="654321000000000000000001"
            isOpen={true}
            onClose={vi.fn()}
          />
        </LanguageProvider>
      );

      // Loading skeleton must be displayed immediately
      expect(screen.getByTestId('food-detail-loading-skeleton')).toBeInTheDocument();

      // After fetch resolves, content appears
      await waitFor(() => {
        expect(screen.getByTestId('food-detail-content')).toBeInTheDocument();
      });
    });

    it('17. renders real backend food details and authentic provenance', async () => {
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          success: true,
          data: MOCK_DETAIL_FIXTURE,
        }),
      });

      render(
        <LanguageProvider>
          <FoodDetailModal
            foodId="654321000000000000000001"
            isOpen={true}
            onClose={vi.fn()}
          />
        </LanguageProvider>
      );

      await waitFor(() => {
        expect(screen.getByText('Egyptian Koshari')).toBeInTheDocument();
      });

      // Provenance organization and dataset from real response
      expect(screen.getByText('National Nutrition Institute (NNI) Egypt')).toBeInTheDocument();
      expect(screen.getByText('Food Composition Tables for Egypt (2006)')).toBeInTheDocument();
      expect(screen.getAllByText(/cooked/i).length).toBeGreaterThanOrEqual(1);

      // Standard portions: default 250g small plate
      expect(screen.getByText('Small Plate')).toBeInTheDocument();
      expect(screen.getByText('Large Plate')).toBeInTheDocument();
    });

    it('18. handles API error and enables retry action', async () => {
      let attempt = 0;
      globalThis.fetch = vi.fn().mockImplementation(async () => {
        attempt++;
        if (attempt === 1) {
          return {
            ok: false,
            status: 500,
            json: async () => ({
              success: false,
              error: { code: 'SERVER_ERROR', message: 'Internal database error' },
            }),
          };
        } else {
          return {
            ok: true,
            status: 200,
            json: async () => ({
              success: true,
              data: MOCK_DETAIL_FIXTURE,
            }),
          };
        }
      });

      render(
        <LanguageProvider>
          <FoodDetailModal
            foodId="654321000000000000000001"
            isOpen={true}
            onClose={vi.fn()}
          />
        </LanguageProvider>
      );

      // Wait for error state
      await waitFor(() => {
        expect(screen.getByTestId('food-detail-error')).toBeInTheDocument();
      });

      // Click Retry button
      const retryBtn = screen.getByRole('button', { name: /retry/i });
      fireEvent.click(retryBtn);

      // Resolves to content on retry
      await waitFor(() => {
        expect(screen.getByTestId('food-detail-content')).toBeInTheDocument();
      });
      expect(attempt).toBe(2);
    });

    it('19. ignores stale response when switching foodId rapidly', async () => {
      let resolveFirst: (val: any) => void;
      let resolveSecond: (val: any) => void;

      let callIdx = 0;
      globalThis.fetch = vi.fn().mockImplementation(async () => {
        callIdx++;
        if (callIdx === 1) {
          return new Promise((res) => {
            resolveFirst = () =>
              res({
                ok: true,
                status: 200,
                json: async () => ({ success: true, data: MOCK_DETAIL_FIXTURE }),
              });
          });
        } else {
          return new Promise((res) => {
            resolveSecond = () =>
              res({
                ok: true,
                status: 200,
                json: async () => ({ success: true, data: MOCK_CHICKEN_FIXTURE }),
              });
          });
        }
      });

      const { rerender } = render(
        <LanguageProvider>
          <FoodDetailModal
            foodId="654321000000000000000001"
            isOpen={true}
            onClose={vi.fn()}
          />
        </LanguageProvider>
      );

      // Fast food ID switch to Chicken
      rerender(
        <LanguageProvider>
          <FoodDetailModal
            foodId="654321000000000000000002"
            isOpen={true}
            onClose={vi.fn()}
          />
        </LanguageProvider>
      );

      // Wait until second fetch has been initiated
      await waitFor(() => {
        expect(callIdx).toBe(2);
      });

      // Second request resolves first
      resolveSecond!(null);
      await waitFor(() => {
        expect(screen.getByText('Chicken Breast (Raw)')).toBeInTheDocument();
      });

      // Stale first request resolves second
      resolveFirst!(null);

      // Chicken Breast must remain displayed, NOT overwritten by stale Koshari response!
      expect(screen.getByText('Chicken Breast (Raw)')).toBeInTheDocument();
      expect(screen.queryByText('Egyptian Koshari')).not.toBeInTheDocument();
    });

    it('20. clicking standard portion updates gram weight and recalculates macros in real-time', async () => {
      render(
        <LanguageProvider>
          <FoodDetailModal
            food={MOCK_DETAIL_FIXTURE}
            isOpen={true}
            onClose={vi.fn()}
          />
        </LanguageProvider>
      );

      // Default portion is Small Plate (250g) -> 165 * 2.5 = 413 kcal
      expect(screen.getByText('413')).toBeInTheDocument();

      // Click Large Plate (450g) -> 165 * 4.5 = 743 kcal
      const largePlateBtn = screen.getByRole('button', { name: /Large Plate/i });
      fireEvent.click(largePlateBtn);

      expect(screen.getByText('743')).toBeInTheDocument();
      // Protein: 5.2 * 4.5 = 23.4g
      expect(screen.getByText('23.4g')).toBeInTheDocument();
    });

    it('21. allows manual gram input editing with immediate live recalculation', () => {
      render(
        <LanguageProvider>
          <FoodDetailModal
            food={MOCK_DETAIL_FIXTURE}
            isOpen={true}
            onClose={vi.fn()}
          />
        </LanguageProvider>
      );

      const input = screen.getByLabelText(/Custom Grams/i);

      // Change weight to 200g -> 165 * 2 = 330 kcal
      fireEvent.change(input, { target: { value: '200' } });

      expect(screen.getByText('330')).toBeInTheDocument();
      // Protein: 5.2 * 2 = 10.4g
      expect(screen.getByText('10.4g')).toBeInTheDocument();
    });

    it('22. displays validation warning when weight is out of allowed range (> 5000g)', () => {
      render(
        <LanguageProvider>
          <FoodDetailModal
            food={MOCK_DETAIL_FIXTURE}
            isOpen={true}
            onClose={vi.fn()}
          />
        </LanguageProvider>
      );

      const input = screen.getByLabelText(/Custom Grams/i);

      // Enter 6000g (> 5000g max)
      fireEvent.change(input, { target: { value: '6000' } });

      expect(screen.getByText(/cannot exceed 5000g/i)).toBeInTheDocument();
    });

    it('23. renders correctly in Arabic RTL mode', () => {
      localStorage.setItem('fitmate_lang', 'ar');

      render(
        <LanguageProvider>
          <FoodDetailModal
            food={MOCK_DETAIL_FIXTURE}
            isOpen={true}
            onClose={vi.fn()}
          />
        </LanguageProvider>
      );

      expect(screen.getByText('كشري مصري')).toBeInTheDocument();
      expect(screen.getByText('طبق صغير')).toBeInTheDocument();
      expect(screen.getByText('طبق كبير')).toBeInTheDocument();
      expect(screen.getByText('مصدر البيانات والاعتماد')).toBeInTheDocument();
    });
  });
});

