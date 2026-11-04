'use client';

import React from 'react';
import { ProtectedRoute } from '../../components/auth/ProtectedRoute';
import { AppHeader } from '../../components/layout/AppHeader';
import { Sidebar } from '../../components/layout/Sidebar';
import { MobileNav } from '../../components/layout/MobileNav';
import { ComingSoon } from '../../components/layout/ComingSoon';
import { useLanguage } from '../../lib/i18n/LanguageContext';

export default function ProgressPage() {
  const { t, language } = useLanguage();

  return (
    <ProtectedRoute>
      <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-surface-background">
        <AppHeader />
        <div className="flex flex-1">
          <Sidebar />
          <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full pb-24 md:pb-8">
            <ComingSoon
              title={t('nav.progress')}
              modulePhase="Phase 5.4"
              description={
                language === 'ar'
                  ? 'وحدة متابعة التقدم قيد التطوير وستشمل: منحنيات الوزن والدهون، قياسات محيط الجسم، وسجلات التاريخ التدريبي والغذائي.'
                  : 'The Progress module is scheduled for Phase 5.4. It will feature interactive weight trend charts, body circumference tracking, and historical adherence analytics.'
              }
            />
          </main>
        </div>
        <MobileNav />
      </div>
    </ProtectedRoute>
  );
}

