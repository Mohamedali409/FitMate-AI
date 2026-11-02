'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useLanguage } from '../../lib/i18n/LanguageContext';
import {
  LayoutDashboard,
  Utensils,
  Dumbbell,
  TrendingUp,
  Bot,
} from 'lucide-react';
import { cn } from '../../lib/utils';

export const MobileNav: React.FC = () => {
  const pathname = usePathname();
  const { t } = useLanguage();

  const navItems = [
    { name: t('nav.dashboard'), href: '/dashboard', icon: LayoutDashboard },
    { name: t('nav.nutrition'), href: '/nutrition', icon: Utensils },
    { name: t('nav.workouts'), href: '/workouts', icon: Dumbbell },
    { name: t('nav.progress'), href: '/progress', icon: TrendingUp },
    { name: t('nav.coach'), href: '/coach', icon: Bot },
  ];

  return (
    <nav className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-white/95 dark:bg-surface-card/95 backdrop-blur-md border-t border-gray-200 dark:border-surface-border safe-area-pb">
      <div className="grid grid-cols-5 h-16 items-center px-1">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex flex-col items-center justify-center h-full min-h-[48px] py-1 transition-colors select-none text-[10px] font-medium',
                isActive
                  ? 'text-brand-600 dark:text-brand-400 font-bold'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
              )}
            >
              <Icon className={cn('w-5 h-5 mb-1', isActive && 'scale-110 transition-transform')} />
              <span className="truncate max-w-[64px]">{item.name}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
};

