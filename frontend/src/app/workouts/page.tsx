'use client';

import React from 'react';
import { ProtectedRoute } from '../../components/auth/ProtectedRoute';
import { AppHeader } from '../../components/layout/AppHeader';
import { Sidebar } from '../../components/layout/Sidebar';
import { MobileNav } from '../../components/layout/MobileNav';
import { ComingSoon } from '../../components/layout/ComingSoon';
import { useLanguage } from '../../lib/i18n/LanguageContext';

export default function WorkoutsPage() {
  const { t, language } = useLanguage();

  return (
    <ProtectedRoute>
      <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-surface-background">
        <AppHeader />
        <div className="flex flex-1">
          <Sidebar />
          <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full pb-24 md:pb-8">
            <ComingSoon
              title={t('nav.workouts')}
              modulePhase="Phase 5.3"
              description={
                language === 'ar'
                  ? 'وحدة التمارين قيد التطوير وستشمل: مكتبة التمارين بدون اتصال، متتبع الجلسات النشطة، تسجيل الأوزان والتكرارات، ومؤقتات الراحة.'
                  : 'The Workouts module is under active development for Phase 5.3. It will feature offline exercise libraries, active session tracking, set/rep logging, and smart rest timers.'
              }
            />
          </main>
        </div>
        <MobileNav />
      </div>
    </ProtectedRoute>
  );
}

