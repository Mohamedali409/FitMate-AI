'use client';

import React from 'react';
import { useLanguage } from '../../lib/i18n/LanguageContext';
import { Info, Sparkles } from 'lucide-react';

export const PreviewBanner: React.FC = () => {
  const { t, language } = useLanguage();

  return (
    <div className="rounded-lg bg-gradient-to-r from-teal-900/10 via-brand-500/10 to-blue-500/10 border border-brand-500/20 p-4 mb-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-start">
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-lg bg-brand-500/20 text-brand-600 dark:text-brand-400 flex items-center justify-center shrink-0">
          <Sparkles className="w-5 h-5" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-brand-700 dark:text-brand-300">
              {t('app.previewNotice')}
            </span>
          </div>
          <p className="text-xs text-gray-600 dark:text-gray-400 mt-0.5">
            {t('app.previewDisclaimer')}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-1.5 text-[11px] font-medium text-gray-500 dark:text-gray-400 bg-white/60 dark:bg-surface-elevated/60 px-3 py-1 rounded-full border border-gray-200 dark:border-surface-border">
        <Info className="w-3.5 h-3.5 text-brand-500" />
        <span>FitMate AI Alpha v0.1.0</span>
      </div>
    </div>
  );
};

