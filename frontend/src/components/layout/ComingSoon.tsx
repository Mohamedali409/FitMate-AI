'use client';

import React from 'react';
import Link from 'next/link';
import { useLanguage } from '../../lib/i18n/LanguageContext';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { Construction, ArrowLeft, ArrowRight } from 'lucide-react';

interface ComingSoonProps {
  title: string;
  modulePhase?: string;
  description?: string;
}

export const ComingSoon: React.FC<ComingSoonProps> = ({
  title,
  modulePhase = 'Phase 5.3',
  description,
}) => {
  const { t, language } = useLanguage();
  const Arrow = language === 'ar' ? ArrowLeft : ArrowRight;

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] p-6 text-center">
      <Card className="max-w-md w-full flex flex-col items-center p-8 bg-white dark:bg-surface-card border-dashed border-2 border-gray-300 dark:border-gray-700">
        <div className="w-16 h-16 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 flex items-center justify-center text-amber-600 dark:text-amber-400 mb-4">
          <Construction className="w-8 h-8 animate-bounce" />
        </div>

        <span className="text-xs font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400 bg-amber-100 dark:bg-amber-950/60 px-3 py-1 rounded-full mb-3">
          {modulePhase} Roadmap
        </span>

        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">{title}</h2>

        <p className="text-sm text-gray-600 dark:text-gray-400 mb-6 leading-relaxed">
          {description || t('common.comingSoonDesc')}
        </p>

        <Link href="/dashboard" className="w-full">
          <Button variant="outline" className="w-full gap-2">
            <span>{t('common.backHome')}</span>
            <Arrow className="w-4 h-4" />
          </Button>
        </Link>
      </Card>
    </div>
  );
};

