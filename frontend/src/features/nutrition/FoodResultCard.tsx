'use client';

import React from 'react';
import { useLanguage } from '../../lib/i18n/LanguageContext';
import { Card } from '../../components/ui/Card';
import { DisclaimerBadge } from '../../components/ui/DisclaimerBadge';
import { FoodItemSummary } from '../../types/nutrition.types';
import { CheckCircle2, ChevronRight, ChevronLeft } from 'lucide-react';

interface FoodResultCardProps {
  food: FoodItemSummary;
  onSelect: (food: FoodItemSummary) => void;
}

export const FoodResultCard: React.FC<FoodResultCardProps> = ({ food, onSelect }) => {
  const { language, t } = useLanguage();
  const Chevron = language === 'ar' ? ChevronLeft : ChevronRight;

  return (
    <Card
      onClick={() => onSelect(food)}
      className="p-4 cursor-pointer hover:border-brand-500/50 hover:shadow-md transition-all border border-gray-200 dark:border-surface-border text-start flex flex-col justify-between group"
    >
      <div>
        {/* Header: Name and Verified badge */}
        <div className="flex items-start justify-between gap-2 mb-2">
          <div>
            <h4 className="font-bold text-sm text-gray-900 dark:text-white group-hover:text-brand-600 dark:group-hover:text-brand-400 transition-colors">
              {language === 'ar' ? food.nameAr : food.nameEn}
            </h4>
            <span className="text-xs text-gray-500 dark:text-gray-400">
              {language === 'ar' ? food.nameEn : food.nameAr}
            </span>
          </div>

          <div className="flex items-center gap-1 shrink-0">
            {food.isVerified && (
              <span
                title={t('nutrition.verified')}
                className="text-emerald-500 flex items-center"
              >
                <CheckCircle2 className="w-4 h-4" />
              </span>
            )}
            <DisclaimerBadge size="sm" />
          </div>
        </div>

        {/* Portion hint */}
        {food.defaultPortion && (
          <div className="text-[11px] text-gray-500 dark:text-gray-400 mb-3 bg-gray-50 dark:bg-surface-elevated/60 px-2 py-0.5 rounded inline-block">
            {language === 'ar' ? food.defaultPortion.unitNameAr : food.defaultPortion.unitNameEn} ({food.defaultPortion.gramWeight}g)
          </div>
        )}
      </div>

      {/* Footer: 100g Macro Grid & Action */}
      <div className="pt-3 border-t border-gray-100 dark:border-surface-border flex items-center justify-between">
        <div className="flex items-center gap-3 text-xs tabular-nums">
          <div>
            <span className="font-black text-gray-800 dark:text-gray-200">{food.caloriesPer100g}</span>{' '}
            <span className="text-[10px] text-gray-400">{t('dashboard.calories')}</span>
          </div>
          <div className="text-red-500 font-semibold">
            <span>{food.proteinPer100g}</span>
            <span className="text-[10px] text-gray-400">P</span>
          </div>
          <div className="text-amber-500 font-semibold">
            <span>{food.carbsPer100g}</span>
            <span className="text-[10px] text-gray-400">C</span>
          </div>
          <div className="text-emerald-500 font-semibold">
            <span>{food.fatPer100g}</span>
            <span className="text-[10px] text-gray-400">F</span>
          </div>
        </div>

        <div className="text-brand-600 dark:text-brand-400 group-hover:translate-x-1 rtl:group-hover:-translate-x-1 transition-transform">
          <Chevron className="w-4 h-4" />
        </div>
      </div>
    </Card>
  );
};

