'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useLanguage } from '../../lib/i18n/LanguageContext';
import { ProtectedRoute } from '../../components/auth/ProtectedRoute';
import { AppHeader } from '../../components/layout/AppHeader';
import { Sidebar } from '../../components/layout/Sidebar';
import { MobileNav } from '../../components/layout/MobileNav';
import { FoodSearchBox } from '../../features/nutrition/FoodSearchBox';
import { FoodResultCard } from '../../features/nutrition/FoodResultCard';
import { FoodDetailModal } from '../../features/nutrition/FoodDetailModal';
import { MealSlotSection } from '../../features/nutrition/MealSlotSection';
import { DisclaimerBadge } from '../../components/ui/DisclaimerBadge';
import { Skeleton } from '../../components/ui/Skeleton';
import { Button } from '../../components/ui/Button';
import { getNutritionAdapter } from '../../lib/api/nutrition.adapter';
import {
  FoodItemSummary,
  FoodItemDetail,
  DailyNutritionSummary,
  FoodCategory,
  MealSlotName,
} from '../../types/nutrition.types';
import { Utensils, Search, AlertCircle, RefreshCw } from 'lucide-react';

export default function NutritionPage() {
  const { t, language } = useLanguage();
  const [diary, setDiary] = useState<DailyNutritionSummary | null>(null);
  const [searchResults, setSearchResults] = useState<FoodItemSummary[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [activeQuery, setActiveQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<FoodCategory | undefined>('middle_eastern_dishes');
  const [selectedFoodId, setSelectedFoodId] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLoadingDiary, setIsLoadingDiary] = useState(true);

  // Request race-condition guardian (prevents stale responses from overwriting newer ones)
  const requestIdRef = useRef(0);

  // Core search execution function
  const executeSearch = useCallback(
    async (q: string, category?: FoodCategory) => {
      const requestId = ++requestIdRef.current;
      setActiveQuery(q);
      setActiveCategory(category);

      const hasQuery = typeof q === 'string' && q.trim().length >= 2;
      const hasCategory = Boolean(category);

      // If neither valid q nor category is active, return empty prompt state
      if (!hasQuery && !hasCategory) {
        setSearchResults([]);
        setSearchError(null);
        setIsSearching(false);
        return;
      }

      setIsSearching(true);
      setSearchError(null);

      try {
        const adapter = getNutritionAdapter();
        const res = await adapter.searchFoods({
          q: hasQuery ? q.trim() : undefined,
          category,
          limit: 15,
        });

        // Discard result if a newer request was dispatched while this was pending
        if (requestId === requestIdRef.current) {
          setSearchResults(res.items);
          setSearchError(null);
        }
      } catch (err: any) {
        if (requestId === requestIdRef.current) {
          console.error('Food search failed:', err);
          setSearchError(
            language === 'ar'
              ? 'تعذر البحث في قاعدة الأطعمة. يرجى التحقق من الاتصال وإعادة المحاولة.'
              : 'Unable to search food catalog. Please check your connection and try again.'
          );
          setSearchResults([]);
        }
      } finally {
        if (requestId === requestIdRef.current) {
          setIsSearching(false);
        }
      }
    },
    [language]
  );

  // Initial load: fetch diary (preview) and preload authentic regional dishes
  useEffect(() => {
    let isMounted = true;

    async function init() {
      try {
        const adapter = getNutritionAdapter();
        const data = await adapter.getDailySummary('2026-11-02');
        if (isMounted) {
          setDiary(data);
        }
      } catch (err) {
        console.error('Failed to initialize nutrition diary:', err);
      } finally {
        if (isMounted) {
          setIsLoadingDiary(false);
        }
      }

      // Initial curated preload with authentic Middle Eastern dishes
      if (isMounted) {
        executeSearch('', 'middle_eastern_dishes');
      }
    }

    init();

    return () => {
      isMounted = false;
      requestIdRef.current = 0; // Invalidate pending requests on unmount
    };
  }, [executeSearch]);

  const handleSearch = (q: string, category?: FoodCategory) => {
    executeSearch(q, category);
  };

  const handleRetrySearch = () => {
    executeSearch(activeQuery, activeCategory);
  };

  const handleSelectFood = (summary: FoodItemSummary) => {
    setSelectedFoodId(summary.id);
    setIsModalOpen(true);
  };

  const handleAddFoodToMeal = (slot: MealSlotName, food: FoodItemDetail, grams: number) => {
    if (!diary) return;

    const scale = grams / 100;
    const calories = Math.round(food.caloriesPer100g * scale);
    const proteinGrams = Math.round(food.proteinPer100g * scale * 10) / 10;
    const carbsGrams = Math.round(food.carbsPer100g * scale * 10) / 10;
    const fatGrams = Math.round(food.fatPer100g * scale * 10) / 10;

    const newItem = {
      id: `item_${Date.now()}`,
      foodItemId: food.id,
      catalogId: food.catalogId,
      nameEn: food.nameEn,
      nameAr: food.nameAr,
      servingWeightGrams: grams,
      portionMultiplier: scale,
      unitNameEn: `${grams}g`,
      unitNameAr: `${grams} جم`,
      calories,
      proteinGrams,
      carbsGrams,
      fatGrams,
      isQuickAdd: false,
      isEstimated: true as const,
      loggedAt: new Date().toISOString(),
    };

    const currentSlot = diary.slots[slot];
    const updatedSlot = {
      ...currentSlot,
      calories: currentSlot.calories + calories,
      proteinGrams: Math.round((currentSlot.proteinGrams + proteinGrams) * 10) / 10,
      carbsGrams: Math.round((currentSlot.carbsGrams + carbsGrams) * 10) / 10,
      fatGrams: Math.round((currentSlot.fatGrams + fatGrams) * 10) / 10,
      items: [newItem, ...currentSlot.items],
    };

    setDiary({
      ...diary,
      caloriesConsumed: diary.caloriesConsumed + calories,
      remainingCalories: diary.remainingCalories - calories,
      proteinConsumedGrams: Math.round((diary.proteinConsumedGrams + proteinGrams) * 10) / 10,
      carbsConsumedGrams: Math.round((diary.carbsConsumedGrams + carbsGrams) * 10) / 10,
      fatConsumedGrams: Math.round((diary.fatConsumedGrams + fatGrams) * 10) / 10,
      slots: {
        ...diary.slots,
        [slot]: updatedSlot,
      },
    });
  };

  const hasNoActiveFilter = !activeQuery.trim() && !activeCategory;

  return (
    <ProtectedRoute>
      <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-surface-background">
        <AppHeader />

        <div className="flex flex-1">
          <Sidebar />

          <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full pb-24 md:pb-8">
            {/* Header */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-6 text-start">
              <div>
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-teal-50 dark:bg-teal-950/40 text-brand-600 dark:text-brand-400 flex items-center justify-center">
                    <Utensils className="w-4 h-4" />
                  </div>
                  <h1 className="text-2xl font-black text-gray-900 dark:text-white">
                    {t('nutrition.title')}
                  </h1>
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  {t('nutrition.subtitle')}
                </p>
              </div>

              <DisclaimerBadge />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Left Column (7 cols): Meal Slots Breakdown */}
              <div className="lg:col-span-7 space-y-4">
                <h2 className="text-sm font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300 text-start">
                  {t('dashboard.todaySummary')}
                </h2>

                {isLoadingDiary || !diary ? (
                  <div className="space-y-4">
                    <Skeleton className="h-28 rounded-lg" />
                    <Skeleton className="h-28 rounded-lg" />
                    <Skeleton className="h-28 rounded-lg" />
                  </div>
                ) : (
                  <MealSlotSection
                    slots={diary.slots}
                    onAddFoodClick={(_slot) => {
                      const el = document.getElementById('food-search-container');
                      el?.scrollIntoView({ behavior: 'smooth' });
                    }}
                  />
                )}
              </div>

              {/* Right Column (5 cols): Food Catalog Search */}
              <div id="food-search-container" className="lg:col-span-5 space-y-4 text-start">
                <div className="p-4 sm:p-5 rounded-lg bg-white dark:bg-surface-card border border-gray-200 dark:border-surface-border shadow-sm space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-bold uppercase tracking-wider text-gray-900 dark:text-white flex items-center gap-2">
                      <Search className="w-4 h-4 text-brand-500" />
                      <span>{t('nutrition.searchResults')}</span>
                    </h3>
                    <span className="text-[11px] text-gray-400">
                      {searchResults.length} {language === 'ar' ? 'عنصر' : 'items'}
                    </span>
                  </div>

                  <FoodSearchBox
                    onSearch={handleSearch}
                    isLoading={isSearching}
                    initialCategory="middle_eastern_dishes"
                  />

                  {/* Results List / Loading / Error / Empty States */}
                  <div className="space-y-2.5 max-h-[560px] overflow-y-auto pe-1">
                    {isSearching ? (
                      <div className="space-y-2 py-4">
                        <Skeleton className="h-20 rounded-lg" />
                        <Skeleton className="h-20 rounded-lg" />
                        <Skeleton className="h-20 rounded-lg" />
                      </div>
                    ) : searchError ? (
                      <div className="p-4 rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/50 text-center space-y-2 py-6">
                        <AlertCircle className="w-6 h-6 text-red-500 mx-auto" />
                        <p className="text-xs text-red-700 dark:text-red-300">{searchError}</p>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={handleRetrySearch}
                          className="gap-1.5 text-xs mx-auto"
                        >
                          <RefreshCw className="w-3.5 h-3.5" />
                          <span>{t('nutrition.retry')}</span>
                        </Button>
                      </div>
                    ) : hasNoActiveFilter ? (
                      <div className="text-center py-8 space-y-1">
                        <Search className="w-8 h-8 text-gray-300 dark:text-gray-600 mx-auto" />
                        <p className="text-xs text-gray-400">
                          {t('nutrition.searchPrompt')}
                        </p>
                      </div>
                    ) : searchResults.length === 0 ? (
                      <p className="text-xs text-gray-400 italic text-center py-8">
                        {t('nutrition.noResults')}
                      </p>
                    ) : (
                      searchResults.map((food) => (
                        <FoodResultCard
                          key={food.id}
                          food={food}
                          onSelect={handleSelectFood}
                        />
                      ))
                    )}
                  </div>
                </div>
              </div>
            </div>
          </main>
        </div>

        <MobileNav />

        {/* Food Detail Modal (Live EP-NUTR-006 & Serving Calculator) */}
        <FoodDetailModal
          foodId={selectedFoodId}
          isOpen={isModalOpen}
          onClose={() => {
            setIsModalOpen(false);
            setSelectedFoodId(null);
          }}
          onAddToMeal={handleAddFoodToMeal}
        />
      </div>
    </ProtectedRoute>
  );
}
