'use client';

import React, { useState, useEffect } from 'react';
import { useLanguage } from '../../lib/i18n/LanguageContext';
import { Modal } from '../../components/ui/Modal';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { DisclaimerBadge } from '../../components/ui/DisclaimerBadge';
import { FoodItemDetail, MealSlotName } from '../../types/nutrition.types';
import { ShieldCheck, Info, Check, Plus } from 'lucide-react';

interface FoodDetailModalProps {
  food: FoodItemDetail | null;
  isOpen: boolean;
  onClose: () => void;
  onAddToMeal?: (slot: MealSlotName, food: FoodItemDetail, grams: number) => void;
}

export const FoodDetailModal: React.FC<FoodDetailModalProps> = ({
  food,
  isOpen,
  onClose,
  onAddToMeal,
}) => {
  const { t, language } = useLanguage();

  const [selectedPortionId, setSelectedPortionId] = useState<string>('custom');
  const [gramWeight, setGramWeight] = useState<number>(100);
  const [selectedSlot, setSelectedSlot] = useState<MealSlotName>('lunch');
  const [isAdded, setIsAdded] = useState(false);

  useEffect(() => {
    if (food) {
      if (food.standardPortions && food.standardPortions.length > 0) {
        const defaultPortion = food.standardPortions.find((p) => p.isDefault) || food.standardPortions[0];
        setSelectedPortionId(defaultPortion.portionId);
        setGramWeight(defaultPortion.gramWeight);
      } else {
        setSelectedPortionId('custom');
        setGramWeight(100);
      }
      setIsAdded(false);
    }
  }, [food]);

  if (!food) return null;

  // Handle portion change
  const handlePortionChange = (portionId: string) => {
    setSelectedPortionId(portionId);
    if (portionId === 'custom') {
      return;
    }
    const portion = food.standardPortions.find((p) => p.portionId === portionId);
    if (portion) {
      setGramWeight(portion.gramWeight);
    }
  };

  // Pure mathematical scaling for preview display
  const scale = gramWeight / 100;
  const scaledCalories = Math.round(food.caloriesPer100g * scale);
  const scaledProtein = Math.round(food.proteinPer100g * scale * 10) / 10;
  const scaledCarbs = Math.round(food.carbsPer100g * scale * 10) / 10;
  const scaledFat = Math.round(food.fatPer100g * scale * 10) / 10;

  const handleAdd = () => {
    if (onAddToMeal) {
      onAddToMeal(selectedSlot, food, gramWeight);
    }
    setIsAdded(true);
    setTimeout(() => {
      setIsAdded(false);
      onClose();
    }, 800);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={t('nutrition.detailsModalTitle')}>
      <div className="space-y-5 text-start">
        {/* Title & Category Banner */}
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="text-xl font-bold text-gray-900 dark:text-white">
              {language === 'ar' ? food.nameAr : food.nameEn}
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {language === 'ar' ? food.nameEn : food.nameAr}
            </p>
          </div>
          <DisclaimerBadge />
        </div>

        {/* Portion Selector & Custom Grams */}
        <div className="p-4 rounded-lg bg-gray-50 dark:bg-surface-elevated border border-gray-200 dark:border-surface-border space-y-3">
          <label className="text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wide">
            {t('nutrition.portionSelector')}
          </label>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {food.standardPortions.map((portion) => (
              <button
                key={portion.portionId}
                type="button"
                onClick={() => handlePortionChange(portion.portionId)}
                className={`flex items-center justify-between p-2.5 rounded-md border text-xs font-medium transition-colors ${
                  selectedPortionId === portion.portionId
                    ? 'border-brand-500 bg-brand-50 dark:bg-brand-950/40 text-brand-700 dark:text-brand-300 font-semibold'
                    : 'border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300'
                }`}
              >
                <span>{language === 'ar' ? portion.unitNameAr : portion.unitNameEn}</span>
                <span className="text-gray-400">({portion.gramWeight}g)</span>
              </button>
            ))}

            <button
              type="button"
              onClick={() => handlePortionChange('custom')}
              className={`flex items-center justify-between p-2.5 rounded-md border text-xs font-medium transition-colors ${
                selectedPortionId === 'custom'
                  ? 'border-brand-500 bg-brand-50 dark:bg-brand-950/40 text-brand-700 dark:text-brand-300 font-semibold'
                  : 'border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300'
              }`}
            >
              <span>{language === 'ar' ? 'وزن مخصص (جرام)' : 'Custom Weight (g)'}</span>
            </button>
          </div>

          {/* Gram input */}
          <div className="pt-2">
            <Input
              type="number"
              min={1}
              max={2000}
              label={t('nutrition.customGrams')}
              value={gramWeight}
              onChange={(e) => {
                setSelectedPortionId('custom');
                setGramWeight(Math.max(1, Number(e.target.value) || 0));
              }}
            />
          </div>
        </div>

        {/* Calculated Nutrient Summary Cards */}
        <div className="grid grid-cols-4 gap-2 text-center p-3 rounded-lg bg-teal-50/50 dark:bg-surface-elevated border border-teal-100 dark:border-surface-border">
          <div>
            <span className="text-[11px] text-gray-500">{t('dashboard.calories')}</span>
            <div className="text-lg font-black text-brand-600 dark:text-brand-400 tabular-nums">
              {scaledCalories}
            </div>
          </div>
          <div>
            <span className="text-[11px] text-red-500">{t('dashboard.protein')}</span>
            <div className="text-lg font-black text-red-600 tabular-nums">{scaledProtein}g</div>
          </div>
          <div>
            <span className="text-[11px] text-amber-500">{t('dashboard.carbs')}</span>
            <div className="text-lg font-black text-amber-600 tabular-nums">{scaledCarbs}g</div>
          </div>
          <div>
            <span className="text-[11px] text-emerald-500">{t('dashboard.fat')}</span>
            <div className="text-lg font-black text-emerald-600 tabular-nums">{scaledFat}g</div>
          </div>
        </div>

        {/* Provenance Box (Mandatory Phase 5.2.1 Audit Requirement) */}
        <div className="p-3.5 rounded-lg border border-gray-200 dark:border-surface-border bg-gray-50/50 dark:bg-surface-card space-y-1.5 text-xs">
          <div className="flex items-center gap-1.5 font-bold text-gray-700 dark:text-gray-300 mb-1">
            <ShieldCheck className="w-4 h-4 text-emerald-500" />
            <span>{t('nutrition.provenanceTitle')}</span>
          </div>
          <div className="grid grid-cols-2 gap-2 text-gray-600 dark:text-gray-400">
            <div>
              <span className="text-gray-400">{t('nutrition.sourceOrg')}: </span>
              <span className="font-medium text-gray-700 dark:text-gray-300">{food.provenance.sourceOrganization}</span>
            </div>
            <div>
              <span className="text-gray-400">{t('nutrition.sourceDataset')}: </span>
              <span className="font-medium text-gray-700 dark:text-gray-300">{food.provenance.sourceDataset}</span>
            </div>
            <div className="col-span-2">
              <span className="text-gray-400">{t('nutrition.prepState')}: </span>
              <span className="font-medium text-gray-700 dark:text-gray-300">{food.provenance.preparationState}</span>
            </div>
          </div>
        </div>

        {/* Target Meal Slot Selector & Add Button */}
        <div className="pt-2 space-y-3">
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

          <Button onClick={handleAdd} className="w-full gap-2" variant={isAdded ? 'secondary' : 'primary'}>
            {isAdded ? (
              <>
                <Check className="w-4 h-4 text-emerald-500" />
                <span>{language === 'ar' ? 'تمت الإضافة بنجاح!' : 'Added Successfully!'}</span>
              </>
            ) : (
              <>
                <Plus className="w-4 h-4" />
                <span>
                  {t('nutrition.addToMeal')} {t(`nutrition.meals.${selectedSlot}`)} ({scaledCalories} {t('dashboard.calories')})
                </span>
              </>
            )}
          </Button>
        </div>
      </div>
    </Modal>
  );
};

