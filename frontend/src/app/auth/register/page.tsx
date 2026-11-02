'use client';

import React from 'react';
import Link from 'next/link';
import { OnboardingWizard } from '../../../features/auth/OnboardingWizard';
import { Dumbbell, Globe } from 'lucide-react';
import { useLanguage } from '../../../lib/i18n/LanguageContext';

export default function RegisterPage() {
  const { language, toggleLanguage } = useLanguage();

  return (
    <div className="min-h-screen flex flex-col justify-between bg-slate-50 dark:bg-surface-background p-4 sm:p-6">
      {/* Top Bar with Language toggle */}
      <div className="flex items-center justify-between max-w-5xl mx-auto w-full">
        <Link href="/dashboard" className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-600 text-white">
            <Dumbbell className="h-4 w-4" />
          </div>
          <span className="font-extrabold text-base tracking-tight text-gray-900 dark:text-white">
            FitMate<span className="text-brand-500">.AI</span>
          </span>
        </Link>

        <button
          onClick={toggleLanguage}
          className="flex items-center gap-1.5 h-8 px-2.5 rounded-md text-xs font-semibold text-gray-700 dark:text-gray-200 bg-white dark:bg-surface-elevated border border-gray-200 dark:border-surface-border"
        >
          <Globe className="w-3.5 h-3.5 text-brand-600" />
          <span>{language === 'en' ? 'العربية' : 'English'}</span>
        </button>
      </div>

      {/* Centered Form */}
      <div className="flex items-center justify-center py-6 sm:py-10">
        <OnboardingWizard />
      </div>

      {/* Footer */}
      <div className="text-center text-xs text-gray-400 py-4">
        FitMate AI © 2026. All rights reserved.
      </div>
    </div>
  );
}

