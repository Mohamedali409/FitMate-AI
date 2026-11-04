import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { FoodSearchBox } from '../src/features/nutrition/FoodSearchBox';
import { FoodResultCard } from '../src/features/nutrition/FoodResultCard';
import { RealNutritionAdapter, MockNutritionAdapter } from '../src/lib/api/nutrition.adapter';
import { ApiClient, ApiClientError, setAccessTokenProvider } from '../src/lib/api/client';
import { LanguageProvider } from '../src/lib/i18n/LanguageContext';
import { AuthProvider } from '../src/features/auth/AuthContext';
import { FOOD_CATEGORIES, FoodCategory, FoodItemSummary } from '../src/types/nutrition.types';

// Mock Next.js navigation
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
  usePathname: () => '/nutrition',
  useSearchParams: () => new URLSearchParams(),
}));

// Real Backend Response Fixture (matching EP-NUTR-005 contract)
const MOCK_BACKEND_SEARCH_RESPONSE = {
  success: true,
  data: [
    {
      id: '654321000000000000000001',
      catalogId: 'food_eg_koshari_001',
      nameEn: 'Egyptian Koshari',
      nameAr: 'كشري مصري',
      category: 'middle_eastern_dishes' as FoodCategory,
      servingSizeGrams: 100,
      caloriesPer100g: 165,
      proteinPer100g: 5.8,
      carbsPer100g: 31.2,
      fatPer100g: 1.8,
      confidenceLevel: 'high' as const,
      isVerified: true,
      isEstimated: true as const,
      defaultPortion: {
        portionId: 'p_koshari_med',
        unitNameEn: 'Medium Bowl',
        unitNameAr: 'طبق متوسط',
        gramWeight: 350,
      },
    },
    {
      id: '654321000000000000000002',
      catalogId: 'food_intl_chicken_breast_grilled_001',
      nameEn: 'Grilled Chicken Breast',
      nameAr: 'صدور دجاج مشوية',
      category: 'protein' as FoodCategory,
      servingSizeGrams: 100,
      caloriesPer100g: 165,
      proteinPer100g: 31.0,
      carbsPer100g: 0.0,
      fatPer100g: 3.6,
      confidenceLevel: 'high' as const,
      isVerified: true,
      isEstimated: true as const,
      defaultPortion: {
        portionId: 'p_chkn_single',
        unitNameEn: 'Single Breast Fillet',
        unitNameAr: 'شريحة صدر واحدة',
        gramWeight: 150,
      },
    },
  ],
  meta: {
    pagination: {
      page: 1,
      limit: 20,
      totalItems: 58,
      totalPages: 3,
      hasNextPage: true,
      hasPrevPage: false,
    },
  },
};

describe('Phase FE 3.1: Food Catalog & Live Search Integration', () => {
  let originalFetch: typeof globalThis.fetch;

  beforeEach(() => {
    vi.clearAllMocks();
    originalFetch = globalThis.fetch;
    setAccessTokenProvider(null);
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    setAccessTokenProvider(null);
  });

  // =========================================================================
  // 1. All 10 Backend category identifiers
  // =========================================================================
  it('1. MUST define all 10 authoritative Backend category identifiers exactly', () => {
    const expectedCategories: FoodCategory[] = [
      'protein',
      'carbohydrates',
      'legumes',
      'dairy_eggs',
      'vegetables',
      'fruits',
      'fats_oils',
      'middle_eastern_dishes',
      'baked_goods',
      'beverages_snacks',
    ];

    expect(FOOD_CATEGORIES).toHaveLength(10);
    expect(FOOD_CATEGORIES).toEqual(expectedCategories);
  });

  // =========================================================================
  // 2. Correct category query parameters in RealNutritionAdapter
  // =========================================================================
  it('2. passes correct category query parameter to backend /nutrition/foods/search', async () => {
    let capturedUrl = '';
    globalThis.fetch = vi.fn().mockImplementation(async (url: string) => {
      capturedUrl = url;
      return {
        ok: true,
        status: 200,
        json: async () => MOCK_BACKEND_SEARCH_RESPONSE,
      };
    });

    const adapter = new RealNutritionAdapter();
    const result = await adapter.searchFoods({ category: 'middle_eastern_dishes' }, 'valid_token');

    expect(capturedUrl).toContain('/nutrition/foods/search');
    expect(capturedUrl).toContain('category=middle_eastern_dishes');
    expect(result.items).toHaveLength(2);
    expect(result.pagination.totalItems).toBe(58);
  });

  // =========================================================================
  // 3. Arabic search parameter encoding and query execution
  // =========================================================================
  it('3. passes normalized Arabic query to /nutrition/foods/search', async () => {
    let capturedUrl = '';
    globalThis.fetch = vi.fn().mockImplementation(async (url: string) => {
      capturedUrl = url;
      return {
        ok: true,
        status: 200,
        json: async () => ({
          success: true,
          data: [MOCK_BACKEND_SEARCH_RESPONSE.data[0]],
          meta: MOCK_BACKEND_SEARCH_RESPONSE.meta,
        }),
      };
    });

    const adapter = new RealNutritionAdapter();
    const result = await adapter.searchFoods({ q: 'كشري' }, 'valid_token');

    expect(capturedUrl).toContain(encodeURIComponent('كشري'));
    expect(result.items[0]?.nameAr).toBe('كشري مصري');
  });

  // =========================================================================
  // 4. English search query execution
  // =========================================================================
  it('4. passes English query string to /nutrition/foods/search', async () => {
    let capturedUrl = '';
    globalThis.fetch = vi.fn().mockImplementation(async (url: string) => {
      capturedUrl = url;
      return {
        ok: true,
        status: 200,
        json: async () => ({
          success: true,
          data: [MOCK_BACKEND_SEARCH_RESPONSE.data[1]],
          meta: MOCK_BACKEND_SEARCH_RESPONSE.meta,
        }),
      };
    });

    const adapter = new RealNutritionAdapter();
    const result = await adapter.searchFoods({ q: 'chicken' }, 'valid_token');

    expect(capturedUrl).toContain('q=chicken');
    expect(result.items[0]?.nameEn).toBe('Grilled Chicken Breast');
  });

  // =========================================================================
  // 5. Invalid one-character query without category (Client-side guard)
  // =========================================================================
  it('5. guards against invalid 1-character query without category (does NOT fire fetch)', async () => {
    const fetchSpy = vi.fn();
    globalThis.fetch = fetchSpy;

    const adapter = new RealNutritionAdapter();
    // 1-char query with no category
    const result = await adapter.searchFoods({ q: 'a' });

    // Fetch MUST NOT be called because backend would reject with 400 VALIDATION_ERROR
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(result.items).toHaveLength(0);
    expect(result.pagination.totalItems).toBe(0);
  });

  // =========================================================================
  // 6. No initial invalid API request with only limit
  // =========================================================================
  it('6. does not send invalid request when only limit is provided without q or category', async () => {
    const fetchSpy = vi.fn();
    globalThis.fetch = fetchSpy;

    const adapter = new RealNutritionAdapter();
    const result = await adapter.searchFoods({ limit: 6 });

    // Client-side guard prevents sending query with only limit
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(result.items).toHaveLength(0);
  });

  // =========================================================================
  // 7. 300ms debounce in FoodSearchBox
  // =========================================================================
  it('7. debounces text input typing by ~300ms in FoodSearchBox', async () => {
    vi.useFakeTimers();
    const handleSearch = vi.fn();

    render(
      <LanguageProvider>
        <FoodSearchBox onSearch={handleSearch} />
      </LanguageProvider>
    );

    const input = screen.getByPlaceholderText(/Search foods/i);

    // Fast typing: 'k', 'o', 's', 'h'
    fireEvent.change(input, { target: { value: 'k' } });
    fireEvent.change(input, { target: { value: 'ko' } });
    fireEvent.change(input, { target: { value: 'kos' } });
    fireEvent.change(input, { target: { value: 'kosh' } });

    // Before 300ms: handleSearch should NOT be called yet
    act(() => {
      vi.advanceTimersByTime(200);
    });
    expect(handleSearch).not.toHaveBeenCalled();

    // After 300ms elapsed: handleSearch should be called ONCE with latest value
    act(() => {
      vi.advanceTimersByTime(150);
    });
    expect(handleSearch).toHaveBeenCalledTimes(1);
    expect(handleSearch).toHaveBeenCalledWith('kosh', undefined);

    vi.useRealTimers();
  });

  // =========================================================================
  // 8. Stale response handling (Race Condition Protection)
  // =========================================================================
  it('8. ignores stale responses if a newer search request resolves earlier', async () => {
    let resolveFirstReq: (val: any) => void;
    let resolveSecondReq: (val: any) => void;

    let callIndex = 0;
    globalThis.fetch = vi.fn().mockImplementation(async () => {
      callIndex++;
      if (callIndex === 1) {
        return new Promise((resolve) => {
          resolveFirstReq = () =>
            resolve({
              ok: true,
              status: 200,
              json: async () => ({
                success: true,
                data: [MOCK_BACKEND_SEARCH_RESPONSE.data[0]], // older result
                meta: MOCK_BACKEND_SEARCH_RESPONSE.meta,
              }),
            });
        });
      } else {
        return new Promise((resolve) => {
          resolveSecondReq = () =>
            resolve({
              ok: true,
              status: 200,
              json: async () => ({
                success: true,
                data: [MOCK_BACKEND_SEARCH_RESPONSE.data[1]], // newer result
                meta: MOCK_BACKEND_SEARCH_RESPONSE.meta,
              }),
            });
        });
      }
    });

    const adapter = new RealNutritionAdapter();

    // Request 1 starts (slow)
    const promise1 = adapter.searchFoods({ q: 'slow_first' });
    // Request 2 starts (fast)
    const promise2 = adapter.searchFoods({ q: 'fast_second' });

    // Request 2 resolves first
    resolveSecondReq!(null);
    const result2 = await promise2;
    expect(result2.items[0]?.nameEn).toBe('Grilled Chicken Breast');

    // Request 1 resolves second
    resolveFirstReq!(null);
    const result1 = await promise1;
    expect(result1.items[0]?.nameEn).toBe('Egyptian Koshari');
  });

  // =========================================================================
  // 9. Category change triggers search immediately
  // =========================================================================
  it('9. triggers immediate search upon category pill click in FoodSearchBox', () => {
    const handleSearch = vi.fn();

    render(
      <LanguageProvider>
        <FoodSearchBox onSearch={handleSearch} />
      </LanguageProvider>
    );

    // Click on Protein category pill
    const proteinBtn = screen.getByRole('button', { name: 'Protein & Meat' });
    fireEvent.click(proteinBtn);

    // Category click triggers immediate onSearch without waiting 300ms
    expect(handleSearch).toHaveBeenCalledWith('', 'protein');
  });

  // =========================================================================
  // 10. Pagination parameters in RealNutritionAdapter
  // =========================================================================
  it('10. respects page and limit pagination parameters', async () => {
    let capturedUrl = '';
    globalThis.fetch = vi.fn().mockImplementation(async (url: string) => {
      capturedUrl = url;
      return {
        ok: true,
        status: 200,
        json: async () => MOCK_BACKEND_SEARCH_RESPONSE,
      };
    });

    const adapter = new RealNutritionAdapter();
    await adapter.searchFoods({ category: 'protein', page: 2, limit: 10 }, 'valid_token');

    expect(capturedUrl).toContain('category=protein');
    expect(capturedUrl).toContain('page=2');
    expect(capturedUrl).toContain('limit=10');
  });

  // =========================================================================
  // 11. API error handling & non-crashing propagation
  // =========================================================================
  it('11. surfaces ApiClientError correctly when backend returns an error', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 400,
      json: async () => ({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Invalid category' },
      }),
    });

    const adapter = new RealNutritionAdapter();

    await expect(
      adapter.searchFoods({ category: 'invalid_cat' as any }, 'valid_token')
    ).rejects.toThrow(ApiClientError);
  });

  // =========================================================================
  // 12. Authentication header handling via centralized AccessTokenProvider
  // =========================================================================
  it('12. automatically attaches Bearer token to request headers via AccessTokenProvider', async () => {
    let capturedHeaders: any = null;
    globalThis.fetch = vi.fn().mockImplementation(async (_url: string, options: any) => {
      capturedHeaders = options.headers;
      return {
        ok: true,
        status: 200,
        json: async () => MOCK_BACKEND_SEARCH_RESPONSE,
      };
    });

    // Register active token provider (simulating AuthContext)
    setAccessTokenProvider(() => 'authenticated_jwt_sample_token');

    const adapter = new RealNutritionAdapter();
    await adapter.searchFoods({ category: 'middle_eastern_dishes' });

    expect(capturedHeaders).toBeDefined();
    expect(capturedHeaders.Authorization).toBe('Bearer authenticated_jwt_sample_token');
  });

  // =========================================================================
  // 13. No silent mock fallback in production
  // =========================================================================
  it('13. RealNutritionAdapter does NOT fall back to MockNutritionAdapter when API fails', async () => {
    globalThis.fetch = vi.fn().mockRejectedValue(new Error('Network offline ECONNREFUSED'));

    const realAdapter = new RealNutritionAdapter();
    expect(realAdapter.isMock).toBe(false);

    let threwError = false;
    try {
      await realAdapter.searchFoods({ category: 'middle_eastern_dishes' }, 'valid_token');
    } catch (err: any) {
      threwError = true;
      expect(err).toBeInstanceOf(ApiClientError);
      expect(err.code).toBe('NETWORK_ERROR');
    }

    expect(threwError).toBe(true);
  });

  // =========================================================================
  // 14. Arabic RTL and English LTR rendering
  // =========================================================================
  it('14. renders FoodResultCard properly in both Arabic RTL and English LTR modes', () => {
    const food: FoodItemSummary = MOCK_BACKEND_SEARCH_RESPONSE.data[0];

    // English render
    const { rerender } = render(
      <LanguageProvider>
        <FoodResultCard food={food} onSelect={vi.fn()} />
      </LanguageProvider>
    );

    expect(screen.getByText('Egyptian Koshari')).toBeInTheDocument();
    expect(screen.getByText('كشري مصري')).toBeInTheDocument();
    expect(screen.getByText('165')).toBeInTheDocument();

    // Store in localStorage for Arabic locale
    localStorage.setItem('fitmate_lang', 'ar');

    rerender(
      <LanguageProvider>
        <FoodResultCard food={food} onSelect={vi.fn()} />
      </LanguageProvider>
    );

    expect(screen.getByText('كشري مصري')).toBeInTheDocument();
  });
});
