'use client';

import React from 'react';
import Link from 'next/link';
import { useLanguage } from '../../lib/i18n/LanguageContext';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { TrendingUp, Scale, ArrowRight, ArrowLeft } from 'lucide-react';

export const ProgressOverviewCard: React.FC = () => {
  const { t, language } = useLanguage();
  const Arrow = language === 'ar' ? ArrowLeft : ArrowRight;

  return (
    <Card className="flex flex-col justify-between p-5 border border-gray-200 dark:border-surface-border">
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <Scale className="w-4 h-4" />
            </div>
            <h3 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wider">
              {t('dashboard.progressSection')}
            </h3>
          </div>
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400">
            Preview
          </span>
        </div>

        <div className="flex items-center justify-between p-3.5 rounded-lg bg-gray-50 dark:bg-surface-elevated/40 border border-gray-100 dark:border-surface-border">
          <div>
            <span className="text-xs text-gray-500 dark:text-gray-400">{t('dashboard.currentWeight')}</span>
            <div className="text-xl font-black text-gray-900 dark:text-white tabular-nums">
              82.4 <span className="text-xs font-normal text-gray-500">kg</span>
            </div>
          </div>
          <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50 px-2 py-1 rounded-md">
            <TrendingUp className="w-3.5 h-3.5" />
            <span>-1.2 kg this month</span>
          </div>
        </div>
      </div>

      <div className="pt-4 border-t border-gray-100 dark:border-surface-border mt-3">
        <Link href="/progress">
          <Button variant="outline" size="sm" className="w-full gap-2 text-xs">
            <span>{t('dashboard.weightTrend')}</span>
            <Arrow className="w-3.5 h-3.5" />
          </Button>
        </Link>
      </div>
    </Card>
  );
};

