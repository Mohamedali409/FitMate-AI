'use client';

import React from 'react';
import Link from 'next/link';
import { useLanguage } from '../../lib/i18n/LanguageContext';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Dumbbell, Calendar, ArrowRight, ArrowLeft } from 'lucide-react';

export const WorkoutOverviewCard: React.FC = () => {
  const { t, language } = useLanguage();
  const Arrow = language === 'ar' ? ArrowLeft : ArrowRight;

  return (
    <Card className="flex flex-col justify-between p-5 border border-gray-200 dark:border-surface-border">
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400 flex items-center justify-center">
              <Dumbbell className="w-4 h-4" />
            </div>
            <h3 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wider">
              {t('dashboard.workoutSection')}
            </h3>
          </div>
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-100 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400">
            Preview
          </span>
        </div>

        <div className="p-3.5 rounded-lg bg-gray-50 dark:bg-surface-elevated/40 border border-gray-100 dark:border-surface-border text-start">
          <div className="flex items-center gap-2 text-xs font-semibold text-gray-800 dark:text-gray-200 mb-1">
            <Calendar className="w-3.5 h-3.5 text-purple-500" />
            <span>Upper Body Hypertrophy (Routine A)</span>
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            5 exercises • Bench Press, Incline DB, Lat Pulldown, Lateral Raise, Triceps
          </p>
        </div>
      </div>

      <div className="pt-4 border-t border-gray-100 dark:border-surface-border mt-3">
        <Link href="/workouts">
          <Button variant="outline" size="sm" className="w-full gap-2 text-xs">
            <span>{t('dashboard.startWorkout')}</span>
            <Arrow className="w-3.5 h-3.5" />
          </Button>
        </Link>
      </div>
    </Card>
  );
};

