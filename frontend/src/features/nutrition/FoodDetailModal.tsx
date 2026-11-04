'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useLanguage } from '../../lib/i18n/LanguageContext';
import { Modal } from '../../components/ui/Modal';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Skeleton } from '../../components/ui/Skeleton';
import { DisclaimerBadge } from '../../components/ui/DisclaimerBadge';
import { FoodItemDetail, MealSlotName } from '../../types/nutrition.types';
import { getNutritionAdapter } from '../../lib/api/nutrition.adapter';
import {
  calculateServingNutrition,
  validateServingWeight,
  getDefaultServingWeight,
  ScaledServingNutrition,
  MAX_SERVING_WEIGHT_GRAMS,
  MIN_SERVING_WEIGHT_GRAMS,
} from '../../lib/nutrition/servingCalculator';
import {
  ShieldCheck,
  AlertCircle,
  CheckCircle2,
  Check,
  Plus,
  RefreshCw,
  Info,
} from 'lucide-react';

interface FoodDetailModalProps {
  foodId?: string | null;
  food?: FoodItemDetail | null;
  isOpen: boolean;
  onClose: () => void;
  onAddToMeal?: (slot: MealSlotName, food: FoodItemDetail, grams: number) => void;
}

export const FoodDetailModal: React.FC<FoodDetailModalProps> = ({
  foodId,
  food,
  isOpen,
  onClose,
  onAddToMeal,
}) => {
  const { t, language } = useLanguage();

  const [activeFood, setActiveFood] = useState<FoodItemDetail | null>(food || null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [selectedPortionId, setSelectedPortionId] = useState<string>('custom');
  const [gramWeightInput, setGramWeightInput] = useState<string>('100');
  const [validGramWeight, setValidGramWeight] = useState<number>(100);
  const [weightValidationError, setWeightValidationError] = useState<string | null>(null);

  const [selectedSlot, setSelectedSlot] = useState<MealSlotName>('lunch');
  const [isAdded, setIsAdded] = useState(false);

  // Stale request race-condition guard
  const fetchSequenceRef = useRef(0);

  // Fetch food details from backend EP-NUTR-006
  const fetchFoodDetail = useCallback(
    async (id: string) => {
      const currentSeq = ++fetchSequenceRef.current;
      setIsLoading(true);
      setError(null);

      try {
        const adapter = getNutritionAdapter();
        const data = await adapter.getFoodById(id);

        if (currentSeq === fetchSequenceRef.current) {
          setActiveFood(data);
          const initialWeight = getDefaultServingWeight(data);
          setValidGramWeight(initialWeight);
          setGramWeightInput(String(initialWeight));
          setWeightValidationError(null);

          // Find matching portion id
          const defaultPortion =
            data.standardPortions?.find((p) => p.isDefault) ||
            data.standardPortions?.find((p) => p.gramWeight === initialWeight);
          setSelectedPortionId(defaultPortion ? defaultPortion.portionId : 'custom');
        }
      } catch (err: any) {
        if (currentSeq === fetchSequenceRef.current) {
          const isNotFound = err?.statusCode === 404 || err?.code === 'NOT_FOUND';
          setError(
            isNotFound
              ? language === 'ar'
                ? 'لم يتم العثور على بيانات هذا العنصر في قاعدة البيانات.'
                : 'Food item not found in catalog.'
              : t('nutrition.loadFoodError')
          );
        }
      } finally {
        if (currentSeq === fetchSequenceRef.current) {
          setIsLoading(false);
        }
      }
    },
    [language, t]
  );

  // Effect to load food data on modal open or foodId change
  useEffect(() => {
    if (!isOpen) {
      // Invalidate in-flight requests on modal close
      fetchSequenceRef.current = 0;
      setIsLoading(false);
      setError(null);
      setIsAdded(false);
      return;
    }

    if (food) {
      // Use provided food object
      setActiveFood(food);
      const initialWeight = getDefaultServingWeight(food);
      setValidGramWeight(initialWeight);
      setGramWeightInput(String(initialWeight));
      setWeightValidationError(null);

      const defaultPortion =
        food.standardPortions?.find((p) => p.isDefault) ||
        food.standardPortions?.find((p) => p.gramWeight === initialWeight);
      setSelectedPortionId(defaultPortion ? defaultPortion.portionId : 'custom');
      setIsLoading(false);
      setError(null);
    } else if (foodId) {
      fetchFoodDetail(foodId);
    }
  }, [isOpen, foodId, food, fetchFoodDetail]);

  // Handle standard portion click
  const handlePortionClick = (portionId: string, gramWeight: number) => {
    setSelectedPortionId(portionId);
    setGramWeightInput(String(gramWeight));
    setValidGramWeight(gramWeight);
    setWeightValidationError(null);
  };

  // Handle custom weight selection button
  const handleCustomPortionClick = () => {
    setSelectedPortionId('custom');
  };

  // Handle manual input change
  const handleWeightInputChange = (val: string) => {
    setGramWeightInput(val);
    setSelectedPortionId('custom');

    const validation = validateServingWeight(val);
    if (validation.isValid && validation.weight !== undefined) {
      setValidGramWeight(validation.weight);
      setWeightValidationError(null);
    } else {
      setWeightValidationError(
        validation.error || t('nutrition.weightValidationRange')
      );
    }
  };

  // Calculate live nutrition values using pure calculator
  let calculatedNutrition: ScaledServingNutrition | null = null;
  if (activeFood && validGramWeight > 0) {
    try {
      calculatedNutrition = calculateServingNutrition(
        {
          caloriesPer100g: activeFood.caloriesPer100g,
          proteinPer100g: activeFood.proteinPer100g,
          carbsPer100g: activeFood.carbsPer100g,
          fatPer100g: activeFood.fatPer100g,
          fiberPer100g: activeFood.fiberPer100g,
        },
        validGramWeight
      );
    } catch {
      calculatedNutrition = null;
    }
  }

  const handleAdd = () => {
    if (onAddToMeal && activeFood && calculatedNutrition) {
      onAddToMeal(selectedSlot, activeFood, validGramWeight);
      setIsAdded(true);
      setTimeout(() => {
        setIsAdded(false);
        onClose();
      }, 700);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={t('nutrition.detailsModalTitle')}>
      <div className="space-y-5 text-start">
        {/* Loading State Skeleton */}
        {isLoading && (
          <div className="space-y-4 py-2" data-testid="food-detail-loading-skeleton">
            <div className="flex items-center justify-between gap-4">
              <div className="space-y-2 flex-1">
                <Skeleton className="h-6 w-3/4 rounded" />
                <Skeleton className="h-4 w-1/2 rounded" />
              </div>
              <Skeleton className="h-6 w-24 rounded-full" />
            </div>
            <Skeleton className="h-28 rounded-lg" />
            <div className="grid grid-cols-4 gap-2">
              <Skeleton className="h-16 rounded-lg" />
              <Skeleton className="h-16 rounded-lg" />
              <Skeleton className="h-16 rounded-lg" />
              <Skeleton className="h-16 rounded-lg" />
            </div>
            <Skeleton className="h-28 rounded-lg" />
          </div>
        )}

        {/* Error State */}
        {!isLoading && error && (
          <div
            className="p-4 rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/50 text-center space-y-3 py-6"
            data-testid="food-detail-error"
          >
            <AlertCircle className="w-8 h-8 text-red-500 mx-auto" />
            <p className="text-sm font-semibold text-red-800 dark:text-red-200">{error}</p>
            <div className="flex justify-center gap-2 pt-2">
              {foodId && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => fetchFoodDetail(foodId)}
                  className="gap-1.5 text-xs"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>{t('nutrition.retry')}</span>
                </Button>
              )}
              <Button size="sm" variant="secondary" onClick={onClose} className="text-xs">
                {t('nutrition.close')}
              </Button>
            </div>
          </div>
        )}

        {/* Loaded Detail State */}
        {!isLoading && !error && activeFood && (
          <div className="space-y-5" data-testid="food-detail-content">
            {/* Title & Category Banner */}
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                  {language === 'ar' ? activeFood.nameAr : activeFood.nameEn}
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {language === 'ar' ? activeFood.nameEn : activeFood.nameAr}
                </p>
                <div className="mt-1 flex items-center gap-1.5">
                  <span className="text-[11px] font-semibold text-brand-600 dark:text-brand-400 bg-brand-50 dark:bg-brand-950/50 px-2 py-0.5 rounded">
                    {t(`nutrition.categories.${activeFood.category}`)}
                  </span>
                </div>
              </div>
              <DisclaimerBadge />
            </div>

            {/* Serving Calculator & Portion Selector */}
            <div className="p-4 rounded-lg bg-gray-50 dark:bg-surface-elevated border border-gray-200 dark:border-surface-border space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wide">
                  {t('nutrition.portionSelector')}
                </label>
                <span className="text-[11px] text-gray-500 dark:text-gray-400">
                  {validGramWeight}g
                </span>
              </div>

              {/* Standard Portions Grid (if available from API) */}
              {activeFood.standardPortions && activeFood.standardPortions.length > 0 && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {activeFood.standardPortions.map((portion) => {
                    const isSelected = selectedPortionId === portion.portionId;
                    return (
                      <button
                        key={portion.portionId}
                        type="button"
                        onClick={() => handlePortionClick(portion.portionId, portion.gramWeight)}
                        aria-pressed={isSelected}
                        className={`flex items-center justify-between p-2.5 rounded-md border text-xs font-medium transition-colors ${
                          isSelected
                            ? 'border-brand-500 bg-brand-50 dark:bg-brand-950/40 text-brand-700 dark:text-brand-300 font-semibold'
                            : 'border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300'
                        }`}
                      >
                        <span>{language === 'ar' ? portion.unitNameAr : portion.unitNameEn}</span>
                        <span className="text-gray-400 font-normal">({portion.gramWeight}g)</span>
                      </button>
                    );
                  })}

                  <button
                    type="button"
                    onClick={handleCustomPortionClick}
                    aria-pressed={selectedPortionId === 'custom'}
                    className={`flex items-center justify-between p-2.5 rounded-md border text-xs font-medium transition-colors ${
                      selectedPortionId === 'custom'
                        ? 'border-brand-500 bg-brand-50 dark:bg-brand-950/40 text-brand-700 dark:text-brand-300 font-semibold'
                        : 'border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300'
                    }`}
                  >
                    <span>{t('nutrition.customPortion')}</span>
                  </button>
                </div>
              )}

              {/* Manual Gram Weight Input */}
              <div className="pt-1">
                <Input
                  type="number"
                  min={MIN_SERVING_WEIGHT_GRAMS}
                  max={MAX_SERVING_WEIGHT_GRAMS}
                  step={1}
                  label={t('nutrition.customGrams')}
                  value={gramWeightInput}
                  onChange={(e) => handleWeightInputChange(e.target.value)}
                  error={weightValidationError || undefined}
                  aria-label={t('nutrition.customGrams')}
                />
              </div>
            </div>

            {/* Calculated Nutrient Profile Display */}
            {calculatedNutrition && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 px-1">
                  <span className="font-semibold text-gray-700 dark:text-gray-300">
                    {t('nutrition.servingProfile')} ({validGramWeight}g)
                  </span>
                  <span className="text-[10px] text-gray-400">
                    ({activeFood.caloriesPer100g} kcal / 100g)
                  </span>
                </div>

                <div className="grid grid-cols-4 gap-2 text-center p-3 rounded-lg bg-teal-50/50 dark:bg-surface-elevated border border-teal-100 dark:border-surface-border">
                  <div>
                    <span className="text-[11px] text-gray-500">{t('dashboard.calories')}</span>
                    <div className="text-lg font-black text-brand-600 dark:text-brand-400 tabular-nums">
                      {calculatedNutrition.calories}
                    </div>
                  </div>
                  <div>
                    <span className="text-[11px] text-red-500">{t('dashboard.protein')}</span>
                    <div className="text-lg font-black text-red-600 tabular-nums">
                      {calculatedNutrition.proteinGrams}g
                    </div>
                  </div>
                  <div>
                    <span className="text-[11px] text-amber-500">{t('dashboard.carbs')}</span>
                    <div className="text-lg font-black text-amber-600 tabular-nums">
                      {calculatedNutrition.carbsGrams}g
                    </div>
                  </div>
                  <div>
                    <span className="text-[11px] text-emerald-500">{t('dashboard.fat')}</span>
                    <div className="text-lg font-black text-emerald-600 tabular-nums">
                      {calculatedNutrition.fatGrams}g
                    </div>
                  </div>

                  {/* Optional Fiber display if available */}
                  {calculatedNutrition.fiberGrams !== null && (
                    <div className="col-span-4 pt-1 border-t border-teal-100/60 dark:border-surface-border flex items-center justify-between px-2 text-xs text-gray-500">
                      <span>{t('nutrition.fiber')}:</span>
                      <span className="font-bold text-gray-700 dark:text-gray-300">
                        {calculatedNutrition.fiberGrams}g
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Real Data Provenance Box */}
            <div className="p-3.5 rounded-lg border border-gray-200 dark:border-surface-border bg-gray-50/50 dark:bg-surface-card space-y-2 text-xs">
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-1.5 font-bold text-gray-800 dark:text-gray-200">
                  <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0" />
                  <span>{t('nutrition.provenanceTitle')}</span>
                </div>

                <div className="flex items-center gap-1.5">
                  {activeFood.provenance.isVerified ? (
                    <span
                      title={t('nutrition.verified')}
                      className="inline-flex items-center gap-1 text-[11px] text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded font-medium"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>{language === 'ar' ? 'معتمد' : 'Verified'}</span>
                    </span>
                  ) : (
                    <span
                      title={t('nutrition.unverified')}
                      className="inline-flex items-center gap-1 text-[11px] text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 px-2 py-0.5 rounded font-medium"
                    >
                      <Info className="w-3.5 h-3.5" />
                      <span>{language === 'ar' ? 'استرشادي' : 'Reference'}</span>
                    </span>
                  )}

                  <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded bg-gray-200 dark:bg-surface-border text-gray-600 dark:text-gray-300">
                    {activeFood.provenance.confidenceLevel === 'high'
                      ? t('nutrition.confidenceHigh')
                      : t('nutrition.confidenceMedium')}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 text-gray-600 dark:text-gray-400 pt-1">
                <div>
                  <span className="text-gray-400">{t('nutrition.sourceOrg')}: </span>
                  <span className="font-medium text-gray-700 dark:text-gray-300">
                    {activeFood.provenance.sourceOrganization}
                  </span>
                </div>
                <div>
                  <span className="text-gray-400">{t('nutrition.sourceDataset')}: </span>
                  <span className="font-medium text-gray-700 dark:text-gray-300">
                    {activeFood.provenance.sourceDataset}
                  </span>
                </div>
                <div>
                  <span className="text-gray-400">{t('nutrition.prepState')}: </span>
                  <span className="font-medium text-gray-700 dark:text-gray-300 capitalize">
                    {activeFood.provenance.preparationState}
                  </span>
                </div>
                <div>
                  <span className="text-gray-400">{t('nutrition.reviewDate')}: </span>
                  <span className="font-medium text-gray-700 dark:text-gray-300">
                    {activeFood.provenance.reviewDate?.substring(0, 10) || '—'}
                  </span>
                </div>
                {activeFood.provenance.sourceRecordId && (
                  <div className="col-span-2">
                    <span className="text-gray-400">{t('nutrition.sourceRecordId')}: </span>
                    <span className="font-medium text-gray-700 dark:text-gray-300 font-mono">
                      {activeFood.provenance.sourceRecordId}
                    </span>
                  </div>
                )}
                {activeFood.provenance.preparationAssumptions && (
                  <div className="col-span-2 bg-white dark:bg-surface-elevated/40 p-2 rounded border border-gray-100 dark:border-surface-border">
                    <span className="text-gray-400 font-medium block mb-0.5">
                      {t('nutrition.prepAssumptions')}:
                    </span>
                    <p className="text-gray-600 dark:text-gray-300 italic">
                      "{activeFood.provenance.preparationAssumptions}"
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Target Meal Slot & Action */}
            <div className="pt-2 space-y-3">
              {onAddToMeal && (
                <>
                  <div className="flex items-center gap-2">
                    {(['breakfast', 'lunch', 'dinner', 'snack'] as MealSlotName[]).map((slot) => (
                      <button
                        key={slot}
                        type="button"
                        onClick={() => setSelectedSlot(slot)}
                        className={`flex-1 py-1.5 px-2 rounded text-xs font-semibold border transition-colors ${
                          selectedSlot === slot
                            ? 'border-brand-500 bg-brand-500 text-white'
                            : 'border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300'
                        }`}
                      >
                        {t(`nutrition.meals.${slot}`)}
                      </button>
                    ))}
                  </div>

                  <Button
                    onClick={handleAdd}
                    disabled={!calculatedNutrition || Boolean(weightValidationError)}
                    className="w-full gap-2"
                    variant={isAdded ? 'secondary' : 'primary'}
                  >
                    {isAdded ? (
                      <>
                        <Check className="w-4 h-4 text-emerald-500" />
                        <span>{language === 'ar' ? 'تمت الإضافة بنجاح!' : 'Added Successfully!'}</span>
                      </>
                    ) : (
                      <>
                        <Plus className="w-4 h-4" />
                        <span>
                          {t('nutrition.addToMeal')} {t(`nutrition.meals.${selectedSlot}`)} (
                          {calculatedNutrition?.calories || 0} {t('dashboard.calories')})
                        </span>
                      </>
                    )}
                  </Button>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
};
