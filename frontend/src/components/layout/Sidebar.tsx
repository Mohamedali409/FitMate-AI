'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useLanguage } from '../../lib/i18n/LanguageContext';
import { useAuth } from '../../features/auth/AuthContext';
import {
  LayoutDashboard,
  Utensils,
  Dumbbell,
  TrendingUp,
  Bot,
  LogIn,
  UserPlus,
  LogOut,
  User,
} from 'lucide-react';
import { cn } from '../../lib/utils';

export const Sidebar: React.FC = () => {
  const pathname = usePathname();
  const { t, language } = useLanguage();
  const { user, isAuthenticated, logout } = useAuth();

  const navItems = [
    {
      name: t('nav.dashboard'),
      href: '/dashboard',
      icon: LayoutDashboard,
      status: 'active',
    },
    {
      name: t('nav.nutrition'),
      href: '/nutrition',
      icon: Utensils,
      status: 'active',
    },
    {
      name: t('nav.workouts'),
      href: '/workouts',
      icon: Dumbbell,
      status: 'coming_soon',
    },
    {
      name: t('nav.progress'),
      href: '/progress',
      icon: TrendingUp,
      status: 'coming_soon',
    },
    {
      name: t('nav.coach'),
      href: '/coach',
      icon: Bot,
      status: 'coming_soon',
    },
  ];

  const displayName = user?.displayName || (user?.email ? user.email.split('@')[0] : 'Athlete');

  return (
    <aside className="hidden md:flex flex-col w-64 border-e border-gray-200 dark:border-surface-border bg-white dark:bg-surface-card p-4 min-h-[calc(100vh-4rem)]">
      {/* Navigation Links */}
      <div className="space-y-1.5 flex-1">
        <div className="text-[11px] font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500 px-3 py-2">
          {language === 'ar' ? 'القائمة الرئيسية' : 'Main Menu'}
        </div>

        {navItems.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center justify-between px-3.5 py-2.5 rounded-lg text-sm font-medium transition-colors select-none',
                isActive
                  ? 'bg-brand-500/10 text-brand-600 dark:text-brand-400 font-semibold'
                  : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-surface-elevated hover:text-gray-900 dark:hover:text-gray-200'
              )}
            >
              <div className="flex items-center gap-3">
                <Icon
                  className={cn(
                    'w-5 h-5 shrink-0',
                    isActive ? 'text-brand-600 dark:text-brand-400' : 'text-gray-500 dark:text-gray-400'
                  )}
                />
                <span>{item.name}</span>
              </div>

              {item.status === 'coming_soon' && (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-gray-100 dark:bg-surface-elevated text-gray-500 dark:text-gray-400 border border-gray-200 dark:border-surface-border">
                  {language === 'ar' ? 'قريباً' : 'Soon'}
                </span>
              )}
            </Link>
          );
        })}
      </div>

      {/* Auth / Session Switcher */}
      <div className="pt-4 border-t border-gray-200 dark:border-surface-border space-y-1">
        <div className="text-[11px] font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500 px-3 py-1">
          {language === 'ar' ? 'الحساب' : 'Account'}
        </div>

        {isAuthenticated ? (
          <div className="space-y-2">
            <div className="flex items-center gap-2.5 px-3 py-2 rounded-lg bg-gray-50 dark:bg-surface-elevated/50 text-xs">
              <div className="w-7 h-7 rounded-full bg-brand-500 text-white flex items-center justify-center font-bold shrink-0">
                <User className="w-4 h-4" />
              </div>
              <div className="flex flex-col overflow-hidden text-start">
                <span className="font-semibold text-gray-900 dark:text-white truncate">{displayName}</span>
                <span className="text-[10px] text-gray-400 truncate">{user?.email}</span>
              </div>
            </div>

            <button
              onClick={() => logout()}
              className="w-full flex items-center gap-3 px-3.5 py-2 rounded-lg text-xs font-semibold text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors text-start"
            >
              <LogOut className="w-4 h-4" />
              <span>{t('nav.logout')}</span>
            </button>
          </div>
        ) : (
          <>
            <Link
              href="/auth/login"
              className="flex items-center gap-3 px-3.5 py-2 rounded-lg text-xs font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-surface-elevated transition-colors"
            >
              <LogIn className="w-4 h-4" />
              <span>{t('nav.login')}</span>
            </Link>
            <Link
              href="/auth/register"
              className="flex items-center gap-3 px-3.5 py-2 rounded-lg text-xs font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-surface-elevated transition-colors"
            >
              <UserPlus className="w-4 h-4" />
              <span>{t('nav.register')}</span>
            </Link>
          </>
        )}
      </div>
    </aside>
  );
};
