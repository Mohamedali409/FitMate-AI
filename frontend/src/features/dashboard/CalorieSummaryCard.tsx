'use client';

import React from 'react';
import { useLanguage } from '../../lib/i18n/LanguageContext';
import { Card } from '../../components/ui/Card';
import { DisclaimerBadge } from '../../components/ui/DisclaimerBadge';
import { Flame, Target, TrendingDown } from 'lucide-react';

interface CalorieSummaryCardProps {
  target: number;
  consumed: number;
  remaining: number;
}

export const CalorieSummaryCard: React.FC<CalorieSummaryCardProps> = ({
  target,
  consumed,
  remaining,
}) => {
  const { t, language } = useLanguage();
  const percentage = target > 0 ? Math.min(Math.round((consumed / target) * 100), 100) : 0;
  const isOver = remaining < 0;

  const locale = language === 'ar' ? 'ar-EG' : 'en-US';

  return (
    <Card className="flex flex-col gap-5 border border-gray-200 dark:border-surface-border">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-teal-50 dark:bg-teal-950/40 text-brand-600 dark:text-brand-400 flex items-center justify-center">
            <Flame className="w-4 h-4" />
          </div>
          <h2 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wider">
            {t('dashboard.dailyBudget')}
          </h2>
        </div>
        <DisclaimerBadge />
      </div>

      {/* Main Numbers Grid */}
      <div className="grid grid-cols-3 gap-3 text-center py-2 border-y border-gray-100 dark:border-surface-border">
        {/* Daily Target */}
        <div className="flex flex-col items-center">
          <span className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
            <Target className="w-3.5 h-3.5 text-gray-400" />
            {t('dashboard.target')}
          </span>
          <span className="text-xl sm:text-2xl font-black text-gray-800 dark:text-gray-200 mt-1 tabular-nums">
            {target.toLocaleString(locale)}
          </span>
          <span className="text-[11px] text-gray-400">{t('dashboard.calories')}</span>
        </div>

        {/* Consumed */}
        <div className="flex flex-col items-center border-x border-gray-100 dark:border-surface-border px-2">
          <span className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
            <Flame className="w-3.5 h-3.5 text-amber-500" />
            {t('dashboard.consumed')}
          </span>
          <span className="text-xl sm:text-2xl font-black text-amber-600 dark:text-amber-400 mt-1 tabular-nums">
            {consumed.toLocaleString(locale)}
          </span>
          <span className="text-[11px] text-gray-400">{t('dashboard.calories')}</span>
        </div>

        {/* Remaining */}
        <div className="flex flex-col items-center">
          <span className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
            <TrendingDown className="w-3.5 h-3.5 text-brand-500" />
            {t('dashboard.remaining')}
          </span>
          <span
            className={`text-xl sm:text-2xl font-black mt-1 tabular-nums ${
              isOver ? 'text-red-500' : 'text-brand-600 dark:text-brand-400'
            }`}
          >
            {Math.abs(remaining).toLocaleString(locale)}
          </span>
          <span className="text-[11px] text-gray-400">
            {isOver ? (language === 'ar' ? 'فائض' : 'over') : t('dashboard.calories')}
          </span>
        </div>
      </div>

      {/* Progress Bar & Status */}
      <div className="space-y-2">
        <div className="flex justify-between items-center text-xs text-gray-500 dark:text-gray-400">
          <span>{percentage}% {language === 'ar' ? 'من الهدف اليومي' : 'of daily target'}</span>
          <span>
            {remaining > 0
              ? `${remaining} ${t('dashboard.calories')} ${language === 'ar' ? 'متبقية' : 'left'}`
              : `${Math.abs(remaining)} ${t('dashboard.calories')} ${language === 'ar' ? 'تجاوز' : 'exceeded'}`}
          </span>
        </div>
        <div className="h-3 w-full rounded-full bg-gray-100 dark:bg-gray-800 overflow-hidden">
          <div
            className={`h-full transition-all duration-700 rounded-full ${
              isOver ? 'bg-red-500' : 'bg-gradient-to-r from-teal-500 to-brand-500'
            }`}
            style={{ width: `${percentage}%` }}
          />
        </div>
      </div>
    </Card>
  );
};
