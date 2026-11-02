'use client';

import React from 'react';
import { useLanguage } from '../../lib/i18n/LanguageContext';
import { Card } from '../../components/ui/Card';
import { ProgressBar } from '../../components/ui/ProgressBar';
import { DisclaimerBadge } from '../../components/ui/DisclaimerBadge';
import { PieChart } from 'lucide-react';

interface MacroProgressCardProps {
  proteinTarget: number;
  proteinConsumed: number;
  carbsTarget: number;
  carbsConsumed: number;
  fatTarget: number;
  fatConsumed: number;
}

export const MacroProgressCard: React.FC<MacroProgressCardProps> = ({
  proteinTarget,
  proteinConsumed,
  carbsTarget,
  carbsConsumed,
  fatTarget,
  fatConsumed,
}) => {
  const { t } = useLanguage();

  return (
    <Card className="flex flex-col gap-5 border border-gray-200 dark:border-surface-border">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 flex items-center justify-center">
            <PieChart className="w-4 h-4" />
          </div>
          <h2 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wider">
            {t('dashboard.macrosBreakdown')}
          </h2>
        </div>
        <DisclaimerBadge />
      </div>

      {/* 3 Macro Bars */}
      <div className="space-y-4">
        {/* Protein (Coral / Red-Orange per Design System) */}
        <ProgressBar
          label={t('dashboard.protein')}
          current={proteinConsumed}
          target={proteinTarget}
          variant="protein"
          unit={t('dashboard.grams')}
        />

        {/* Carbohydrates (Amber / Gold per Design System) */}
        <ProgressBar
          label={t('dashboard.carbs')}
          current={carbsConsumed}
          target={carbsTarget}
          variant="carbs"
          unit={t('dashboard.grams')}
        />

        {/* Fats (Emerald / Mint per Design System) */}
        <ProgressBar
          label={t('dashboard.fat')}
          current={fatConsumed}
          target={fatTarget}
          variant="fat"
          unit={t('dashboard.grams')}
        />
      </div>

      {/* Macro Legend / Caloric Ratio Summary */}
      <div className="pt-3 border-t border-gray-100 dark:border-surface-border grid grid-cols-3 gap-2 text-center text-xs">
        <div className="flex items-center justify-center gap-1.5 text-gray-600 dark:text-gray-400">
          <span className="w-2.5 h-2.5 rounded-full bg-red-500" />
          <span className="font-semibold text-gray-900 dark:text-white">{proteinConsumed}g</span>
        </div>
        <div className="flex items-center justify-center gap-1.5 text-gray-600 dark:text-gray-400">
          <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
          <span className="font-semibold text-gray-900 dark:text-white">{carbsConsumed}g</span>
        </div>
        <div className="flex items-center justify-center gap-1.5 text-gray-600 dark:text-gray-400">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
          <span className="font-semibold text-gray-900 dark:text-white">{fatConsumed}g</span>
        </div>
      </div>
    </Card>
  );
};

