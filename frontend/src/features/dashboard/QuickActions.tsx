'use client';

import React from 'react';
import Link from 'next/link';
import { useLanguage } from '../../lib/i18n/LanguageContext';
import { Card } from '../../components/ui/Card';
import { Utensils, PlusCircle, Dumbbell, Scale } from 'lucide-react';

export const QuickActions: React.FC = () => {
  const { t } = useLanguage();

  const actions = [
    {
      title: t('dashboard.logFood'),
      href: '/nutrition',
      icon: Utensils,
      bg: 'bg-teal-50 dark:bg-teal-950/40 text-brand-600 dark:text-brand-400 border-teal-200 dark:border-teal-800',
    },
    {
      title: t('dashboard.quickAdd'),
      href: '/nutrition?action=quick-add',
      icon: PlusCircle,
      bg: 'bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-800',
    },
    {
      title: t('dashboard.startWorkout'),
      href: '/workouts',
      icon: Dumbbell,
      bg: 'bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400 border-purple-200 dark:border-purple-800',
    },
    {
      title: t('dashboard.updateWeight'),
      href: '/progress',
      icon: Scale,
      bg: 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800',
    },
  ];

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
        {t('dashboard.quickActions')}
      </h3>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {actions.map((act) => {
          const Icon = act.icon;
          return (
            <Link key={act.title} href={act.href}>
              <Card
                className={`flex flex-col items-center justify-center p-4 text-center cursor-pointer transition-all hover:scale-102 hover:shadow-md border ${act.bg} min-h-[96px]`}
              >
                <Icon className="w-6 h-6 mb-2" />
                <span className="text-xs font-bold">{act.title}</span>
              </Card>
            </Link>
          );
        })}
      </div>
    </div>
  );
};

