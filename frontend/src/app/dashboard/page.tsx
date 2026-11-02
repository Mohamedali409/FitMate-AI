'use client';

import React, { useEffect, useState } from 'react';
import { useLanguage } from '../../lib/i18n/LanguageContext';
import { useAuth } from '../../features/auth/AuthContext';
import { ProtectedRoute } from '../../components/auth/ProtectedRoute';
import { AppHeader } from '../../components/layout/AppHeader';
import { Sidebar } from '../../components/layout/Sidebar';
import { MobileNav } from '../../components/layout/MobileNav';
import { PreviewBanner } from '../../features/dashboard/PreviewBanner';
import { CalorieSummaryCard } from '../../features/dashboard/CalorieSummaryCard';
import { MacroProgressCard } from '../../features/dashboard/MacroProgressCard';
import { QuickActions } from '../../features/dashboard/QuickActions';
import { WorkoutOverviewCard } from '../../features/dashboard/WorkoutOverviewCard';
import { ProgressOverviewCard } from '../../features/dashboard/ProgressOverviewCard';
import { getNutritionAdapter } from '../../lib/api/nutrition.adapter';
import { DailyNutritionSummary } from '../../types/nutrition.types';
import { Skeleton } from '../../components/ui/Skeleton';

export default function DashboardPage() {
  const { t, language } = useLanguage();
  const { user } = useAuth();
  const [summary, setSummary] = useState<DailyNutritionSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const adapter = getNutritionAdapter();
        const data = await adapter.getDailySummary('2026-11-02');
        setSummary(data);
      } catch (err) {
        console.error('Failed to load dashboard summary:', err);
      } finally {
        setIsLoading(false);
      }
    }
    loadData();
  }, []);

  const displayName = user?.displayName || 'Captain Fit';

  return (
    <ProtectedRoute>
      <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-surface-background">
        <AppHeader />

        <div className="flex flex-1">
          <Sidebar />

          <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full pb-24 md:pb-8">
            <PreviewBanner />

            {/* Welcome Section */}
            <div className="mb-6 text-start">
              <h1 className="text-2xl sm:text-3xl font-black text-gray-900 dark:text-white">
                {t('dashboard.welcome')}, {displayName}! 👋
              </h1>
              <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-1">
                {language === 'ar'
                  ? 'إليك ملخص خطتك الغذائية والرياضية لليوم.'
                  : "Here is your nutrition and fitness summary for today."}
              </p>
            </div>

            {isLoading || !summary ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-6">
                <Skeleton className="h-64 rounded-xl" />
                <Skeleton className="h-64 rounded-xl" />
              </div>
            ) : (
              <>
                {/* Daily Calorie & Macro Target Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-6">
                  <CalorieSummaryCard
                    target={summary.dailyCalorieTarget}
                    consumed={summary.caloriesConsumed}
                    remaining={summary.remainingCalories}
                  />

                  <MacroProgressCard
                    proteinTarget={summary.proteinTargetGrams}
                    proteinConsumed={summary.proteinConsumedGrams}
                    carbsTarget={summary.carbsTargetGrams}
                    carbsConsumed={summary.carbsConsumedGrams}
                    fatTarget={summary.fatTargetGrams}
                    fatConsumed={summary.fatConsumedGrams}
                  />
                </div>

                {/* Quick Actions */}
                <div className="mb-6">
                  <QuickActions />
                </div>

                {/* Workout & Progress Placeholders */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <WorkoutOverviewCard />
                  <ProgressOverviewCard />
                </div>
              </>
            )}
          </main>
        </div>

        <MobileNav />
      </div>
    </ProtectedRoute>
  );
}

