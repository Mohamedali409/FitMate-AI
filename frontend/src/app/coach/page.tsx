'use client';

import React from 'react';
import { AppHeader } from '../../components/layout/AppHeader';
import { Sidebar } from '../../components/layout/Sidebar';
import { MobileNav } from '../../components/layout/MobileNav';
import { ComingSoon } from '../../components/layout/ComingSoon';
import { useLanguage } from '../../lib/i18n/LanguageContext';

export default function CoachPage() {
  const { t, language } = useLanguage();

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-surface-background">
      <AppHeader />
      <div className="flex flex-1">
        <Sidebar />
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full pb-24 md:pb-8">
          <ComingSoon
            title={t('nav.coach')}
            modulePhase="Phase 5.5"
            description={
              language === 'ar'
                ? 'المدرب الذكي FitMate AI Coach قيد التطوير للمرحلة 5.5. سيقدم نصائح مخصصة، إجابات على أسئلة التمرين والتغذية، بدون تقديم أي تشخيصات طبية (Core Invariant 1).'
                : 'The AI Coach is scheduled for Phase 5.5. It will provide context-aware fitness guidance, habit check-ins, and exercise tips with strict non-medical boundaries (Core Invariant 1).'
            }
          />
        </main>
      </div>
      <MobileNav />
    </div>
  );
}

