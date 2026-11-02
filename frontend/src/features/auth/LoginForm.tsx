'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useLanguage } from '../../lib/i18n/LanguageContext';
import { useAuth } from './AuthContext';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { LogIn, Sparkles, AlertCircle } from 'lucide-react';
import { ApiClientError } from '../../lib/api/client';

export const LoginForm: React.FC = () => {
  const { t, language } = useLanguage();
  const { login, isMock } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectPath = searchParams?.get('redirect') || '/dashboard';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fieldErrors, setFieldErrors] = useState<{ email?: string; password?: string }>({});
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const validate = (): boolean => {
    const errors: { email?: string; password?: string } = {};
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!email.trim()) {
      errors.email = language === 'ar' ? 'البريد الإلكتروني مطلوب' : 'Email address is required';
    } else if (!emailRegex.test(email.trim())) {
      errors.email = language === 'ar' ? 'صيغة البريد الإلكتروني غير صالحة' : 'Invalid email address format';
    }

    if (!password) {
      errors.password = language === 'ar' ? 'كلمة المرور مطلوبة' : 'Password is required';
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!validate()) {
      return;
    }

    setIsLoading(true);

    try {
      await login(email.trim().toLowerCase(), password);
      router.push(redirectPath);
    } catch (err: any) {
      if (err instanceof ApiClientError) {
        if (err.code === 'INVALID_CREDENTIALS') {
          setError(
            language === 'ar'
              ? 'البريد الإلكتروني أو كلمة المرور غير صحيحة. يرجى التحقق وإعادة المحاولة.'
              : 'Invalid email or password. Please verify your credentials and try again.'
          );
        } else if (err.code === 'RATE_LIMIT_EXCEEDED') {
          setError(
            language === 'ar'
              ? 'تم تجاوز الحد الأقصى للمحاولات (5 محاولات / 15 دقيقة). يرجى الانتظار ثم إعادة المحاولة.'
              : 'Too many authentication attempts. Please try again in 15 minutes.'
          );
        } else if (err.code === 'NETWORK_ERROR') {
          setError(
            language === 'ar'
              ? 'تعذر الاتصال بالخادم الخلفي. يرجى التأكد من تشغيل السيرفر على المنفذ 3000.'
              : 'Network request failed. Is the backend server running on port 3000?'
          );
        } else {
          setError(err.message || (language === 'ar' ? 'فشل تسجيل الدخول' : 'Sign in failed'));
        }
      } else {
        setError(err.message || 'An unexpected error occurred.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleDemoLogin = async () => {
    setError(null);

    if (!isMock) {
      setError(
        language === 'ar'
          ? 'الدخول التجريبي السريع متاح فقط في وضع المعاينة (NEXT_PUBLIC_USE_MOCKS=true).'
          : 'Quick Demo Login is only available in mock preview mode (NEXT_PUBLIC_USE_MOCKS=true).'
      );
      return;
    }

    setIsLoading(true);
    try {
      await login('demo@fitmate.ai', 'DemoPassword123!');
      router.push(redirectPath);
    } catch (err: any) {
      setError(err.message || 'Demo login failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-md p-6 sm:p-8 bg-white dark:bg-surface-card border border-gray-200 dark:border-surface-border shadow-xl">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-black text-gray-900 dark:text-white">
          {t('auth.loginTitle')}
        </h2>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
          {t('auth.loginSubtitle')}
        </p>
      </div>

      {error && (
        <div
          role="alert"
          className="mb-4 p-3 rounded-lg bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-xs text-red-600 dark:text-red-400 flex items-start gap-2 text-start"
        >
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} noValidate className="space-y-4">
        <Input
          type="email"
          label={t('auth.email')}
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            if (fieldErrors.email) setFieldErrors((prev) => ({ ...prev, email: undefined }));
          }}
          error={fieldErrors.email}
          placeholder="athlete@fitmate.ai"
          autoComplete="email"
          required
        />

        <Input
          type="password"
          label={t('auth.password')}
          value={password}
          onChange={(e) => {
            setPassword(e.target.value);
            if (fieldErrors.password) setFieldErrors((prev) => ({ ...prev, password: undefined }));
          }}
          error={fieldErrors.password}
          placeholder="••••••••"
          autoComplete="current-password"
          required
        />

        <Button type="submit" isLoading={isLoading} disabled={isLoading} className="w-full">
          <LogIn className="w-4 h-4" />
          <span>{t('auth.signInButton')}</span>
        </Button>
      </form>

      {/* Or Divider */}
      <div className="relative my-6 text-center">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-gray-200 dark:border-surface-border" />
        </div>
        <span className="relative bg-white dark:bg-surface-card px-3 text-[11px] font-semibold text-gray-400 uppercase">
          {t('auth.orDivider')}
        </span>
      </div>

      {/* Quick Demo Login Button */}
      <Button
        type="button"
        variant="secondary"
        onClick={handleDemoLogin}
        disabled={isLoading}
        className="w-full gap-2 text-xs"
      >
        <Sparkles className="w-4 h-4 text-brand-500" />
        <span>
          {t('auth.demoLogin')} {isMock ? '' : '(Preview Only)'}
        </span>
      </Button>

      {/* Footer Link */}
      <div className="text-center mt-6 text-xs text-gray-500 dark:text-gray-400">
        <span>{t('auth.dontHaveAccount')} </span>
        <Link
          href="/auth/register"
          className="font-bold text-brand-600 dark:text-brand-400 hover:underline"
        >
          {t('auth.signUpButton')}
        </Link>
      </div>
    </Card>
  );
};
