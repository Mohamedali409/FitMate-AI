'use client';

import React from 'react';
import Link from 'next/link';
import { useLanguage } from '../../lib/i18n/LanguageContext';
import { useAuth } from '../../features/auth/AuthContext';
import { DisclaimerBadge } from '../ui/DisclaimerBadge';
import { Globe, User, Dumbbell, LogOut } from 'lucide-react';

export const AppHeader: React.FC = () => {
  const { language, toggleLanguage, t } = useLanguage();
  const { user, isAuthenticated, logout } = useAuth();

  const displayName = user?.displayName || (user?.email ? user.email.split('@')[0] : 'Captain Fit');

  return (
    <header className="sticky top-0 z-40 w-full border-b border-gray-200 dark:border-surface-border bg-white/90 dark:bg-surface-card/90 backdrop-blur-md">
      <div className="flex h-16 items-center justify-between px-4 sm:px-6">
        {/* Brand / Logo */}
        <div className="flex items-center gap-3">
          <Link href="/dashboard" className="flex items-center gap-2.5 group">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-tr from-brand-600 to-teal-400 text-white shadow-sm group-hover:scale-105 transition-transform">
              <Dumbbell className="h-5 w-5" />
            </div>
            <div className="flex flex-col">
              <span className="font-extrabold text-lg tracking-tight text-gray-900 dark:text-white leading-none">
                FitMate<span className="text-brand-500">.AI</span>
              </span>
              <span className="text-[10px] text-gray-500 dark:text-gray-400 font-medium tracking-wide">
                FITNESS & NUTRITION
              </span>
            </div>
          </Link>

          {/* Preview / Demo Badge */}
          <div className="hidden sm:inline-flex items-center gap-1.5 ml-2 px-2.5 py-0.5 rounded-full bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-[11px] font-semibold text-amber-700 dark:text-amber-400">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
            {t('app.previewNotice')}
          </div>
        </div>

        {/* Header Actions */}
        <div className="flex items-center gap-2 sm:gap-4">
          {/* Global Core Invariant 2 Indicator */}
          <DisclaimerBadge className="hidden md:inline-flex" />

          {/* Bilingual Language Switcher */}
          <button
            onClick={toggleLanguage}
            aria-label="Toggle Language"
            className="flex items-center gap-1.5 h-9 px-3 rounded-md text-xs font-semibold text-gray-700 dark:text-gray-200 bg-gray-100 hover:bg-gray-200 dark:bg-surface-elevated dark:hover:bg-surface-border transition-colors border border-gray-200 dark:border-surface-border"
          >
            <Globe className="w-4 h-4 text-brand-600 dark:text-brand-400" />
            <span>{language === 'en' ? 'العربية' : 'English'}</span>
          </button>

          {/* User Profile Pill or Sign In Button */}
          {isAuthenticated ? (
            <div className="flex items-center gap-1.5">
              <Link
                href="/dashboard"
                className="flex items-center gap-2 p-1.5 sm:px-3 sm:py-1.5 rounded-full bg-gray-100 dark:bg-surface-elevated hover:bg-gray-200 dark:hover:bg-surface-border border border-gray-200 dark:border-surface-border transition-colors text-xs font-medium text-gray-800 dark:text-gray-200"
              >
                <div className="w-6 h-6 rounded-full bg-brand-500 text-white flex items-center justify-center font-bold text-xs">
                  <User className="w-3.5 h-3.5" />
                </div>
                <span className="hidden sm:inline truncate max-w-[120px]">{displayName}</span>
              </Link>
              <button
                onClick={() => logout()}
                title={t('nav.logout')}
                className="p-2 rounded-full text-gray-500 hover:text-red-500 hover:bg-gray-100 dark:hover:bg-surface-elevated transition-colors"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <Link
              href="/auth/login"
              className="flex items-center gap-1.5 h-9 px-3.5 rounded-md text-xs font-bold text-white bg-brand-600 hover:bg-brand-700 transition-colors shadow-sm"
            >
              <span>{t('nav.login')}</span>
            </Link>
          )}
        </div>
      </div>
    </header>
  );
};
