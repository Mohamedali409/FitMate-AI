'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useLanguage } from '../../lib/i18n/LanguageContext';
import { useAuth } from './AuthContext';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import {
  OnboardingFormState,
  FitnessGoal,
  BiologicalSex,
  TrainingExperience,
  DietaryPreference,
} from '../../types/auth.types';
import { ArrowLeft, ArrowRight, ShieldAlert, Sparkles, CheckCircle2 } from 'lucide-react';
import { ApiClientError } from '../../lib/api/client';

export const OnboardingWizard: React.FC = () => {
  const { t, language } = useLanguage();
  const { register } = useAuth();
  const router = useRouter();

  const [step, setStep] = useState<number>(1);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const [form, setForm] = useState<OnboardingFormState>({
    // Step 1
    goal: 'fat_loss',
    biologicalSex: 'male',
    birthDate: '1998-05-15',

    // Step 2
    heightCm: 178,
    weightKg: 82.5,
    unitSystem: 'metric',

    // Step 3
    activityMultiplier: 1.55,
    trainingExperience: 'intermediate',

    // Step 4
    dietaryPreference: 'none',
    preferredLanguage: language === 'ar' ? 'ar' : 'en',

    // Step 5
    displayName: 'Fit Athlete',
    email: 'athlete@fitmate.ai',
    password: 'Password123!',
    hasAcceptedHealthDisclaimer: true,
    hasAcceptedTerms: true,
  });

  const updateField = <K extends keyof OnboardingFormState>(field: K, val: OnboardingFormState[K]) => {
    setForm((prev) => ({ ...prev, [field]: val }));
    if (fieldErrors[field]) {
      setFieldErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  };

  const validateCurrentStep = (): boolean => {
    const errors: Record<string, string> = {};

    if (step === 1) {
      if (!form.birthDate) {
        errors.birthDate = language === 'ar' ? 'تاريخ الميلاد مطلوب' : 'Birth date is required';
      } else {
        const date = new Date(form.birthDate);
        if (isNaN(date.getTime())) {
          errors.birthDate = language === 'ar' ? 'تاريخ غير صالح' : 'Invalid date format';
        } else {
          const age = new Date().getFullYear() - date.getFullYear();
          if (age < 13 || age > 100) {
            errors.birthDate =
              language === 'ar'
                ? 'يجب أن يكون العمر بين 13 و 100 عام'
                : 'User must be between 13 and 100 years of age';
          }
        }
      }
    }

    if (step === 2) {
      if (!form.heightCm || form.heightCm < 100 || form.heightCm > 250) {
        errors.heightCm =
          language === 'ar'
            ? 'الطول يجب أن يكون بين 100 سم و 250 سم'
            : 'Height must be between 100.0 and 250.0 cm';
      }
      if (!form.weightKg || form.weightKg < 30 || form.weightKg > 300) {
        errors.weightKg =
          language === 'ar'
            ? 'الوزن يجب أن يكون بين 30 كجم و 300 كجم'
            : 'Weight must be between 30.0 and 300.0 kg';
      }
    }

    if (step === 5) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!form.email || !emailRegex.test(form.email)) {
        errors.email = language === 'ar' ? 'بريد إلكتروني صالح مطلوب' : 'A valid email address is required';
      }

      const passwordRegex = /^(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]).{8,128}$/;
      if (!form.password || !passwordRegex.test(form.password)) {
        errors.password =
          language === 'ar'
            ? 'كلمة المرور يجب أن تحتوي على 8 أحرف على الأقل، حرف كبير، رقم، ورمز خاص'
            : 'Password must contain at least 8 characters, 1 uppercase letter, 1 number, and 1 special symbol';
      }

      if (!form.hasAcceptedHealthDisclaimer) {
        errors.hasAcceptedHealthDisclaimer =
          language === 'ar' ? 'الموافقة على إخلاء المسؤولية الصحية إلزامية' : 'Health disclaimer acceptance is mandatory';
      }

      if (!form.hasAcceptedTerms) {
        errors.hasAcceptedTerms =
          language === 'ar' ? 'الموافقة على شروط الخدمة إلزامية' : 'Terms of service acceptance is mandatory';
      }
    }

    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) {
      setError(Object.values(errors)[0]);
      return false;
    }

    setError(null);
    return true;
  };

  const handleNext = () => {
    if (!validateCurrentStep()) return;
    if (step < 5) {
      setStep(step + 1);
    }
  };

  const handlePrev = () => {
    setError(null);
    if (step > 1) {
      setStep(step - 1);
    }
  };

  const handleFinish = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateCurrentStep()) return;

    setIsLoading(true);
    setError(null);

    try {
      await register(form);
      router.push('/dashboard');
    } catch (err: any) {
      if (err instanceof ApiClientError) {
        if (err.code === 'EMAIL_ALREADY_EXISTS') {
          setError(
            language === 'ar'
              ? 'البريد الإلكتروني مسجل بالفعل في النظام. يرجى تسجيل الدخول.'
              : 'This email is already registered. Please sign in instead.'
          );
        } else if (err.code === 'VALIDATION_ERROR' && err.details) {
          const detailMsgs = err.details.map((d) => `${d.field}: ${d.message}`).join(', ');
          setError(
            language === 'ar'
              ? `خطأ في صحة البيانات المدخلة: ${detailMsgs}`
              : `Validation Error: ${detailMsgs}`
          );
        } else if (err.code === 'RATE_LIMIT_EXCEEDED') {
          setError(
            language === 'ar'
              ? 'تم تجاوز الحد المسموح به للتسجيل. يرجى المحاولة لاحقاً.'
              : 'Registration rate limit exceeded. Please try again later.'
          );
        } else if (err.code === 'NETWORK_ERROR') {
          setError(
            language === 'ar'
              ? 'تعذر الاتصال بالخادم. يرجى التحقق من تشغيل السيرفر.'
              : 'Network request failed. Is the backend server running?'
          );
        } else {
          setError(err.message || 'Registration failed.');
        }
      } else {
        setError(err.message || 'Registration failed.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const ArrowNext = language === 'ar' ? ArrowLeft : ArrowRight;
  const ArrowPrev = language === 'ar' ? ArrowRight : ArrowLeft;

  return (
    <Card className="w-full max-w-xl p-6 sm:p-8 bg-white dark:bg-surface-card border border-gray-200 dark:border-surface-border shadow-2xl">
      {/* Wizard Header & Progress Bar */}
      <div className="mb-6 text-start">
        <div className="flex items-center justify-between text-xs text-brand-600 dark:text-brand-400 font-bold uppercase tracking-wider mb-2">
          <span>{t('auth.onboardingStepOf', { current: step, total: 5 })}</span>
          <span>{step * 20}%</span>
        </div>
        <div className="h-2 w-full rounded-full bg-gray-100 dark:bg-gray-800 overflow-hidden mb-3">
          <div
            className="h-full bg-brand-500 rounded-full transition-all duration-300"
            style={{ width: `${step * 20}%` }}
          />
        </div>
        <h2 className="text-xl font-black text-gray-900 dark:text-white">
          {t(`auth.step${step}Title`)}
        </h2>
      </div>

      {error && (
        <div
          role="alert"
          className="mb-4 p-3 rounded-lg bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-xs text-red-600 dark:text-red-400 flex items-start gap-2 text-start"
        >
          <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {/* Step 1: Goal & Biological Profile */}
      {step === 1 && (
        <div className="space-y-4 text-start">
          <div>
            <label className="text-xs font-semibold text-gray-700 dark:text-gray-300 block mb-2">
              {language === 'ar' ? 'ما هو هدفك الأساسي؟' : 'Primary Fitness Goal'}
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {(
                [
                  'fat_loss',
                  'muscle_gain',
                  'recomposition',
                  'maintenance',
                  'general_fitness',
                  'undecided',
                ] as FitnessGoal[]
              ).map((g) => (
                <button
                  key={g}
                  type="button"
                  onClick={() => updateField('goal', g)}
                  className={`p-3 rounded-lg border text-xs font-semibold text-start transition-all ${
                    form.goal === g
                      ? 'border-brand-500 bg-brand-50 dark:bg-brand-950/40 text-brand-700 dark:text-brand-300 ring-2 ring-brand-500/20'
                      : 'border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300'
                  }`}
                >
                  {t(`auth.goals.${g}`)}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-gray-700 dark:text-gray-300 block mb-2">
              {language === 'ar'
                ? 'الجنس البيولوجي (لحساب معادلة الطاقة الاسترشادية)'
                : 'Biological Sex (For Energy Target Calculation)'}
            </label>
            <div className="grid grid-cols-3 gap-2">
              {(['male', 'female', 'prefer_not_to_say'] as BiologicalSex[]).map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => updateField('biologicalSex', s)}
                  className={`p-2.5 rounded-lg border text-xs font-semibold transition-all ${
                    form.biologicalSex === s
                      ? 'border-brand-500 bg-brand-50 dark:bg-brand-950/40 text-brand-700 dark:text-brand-300'
                      : 'border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300'
                  }`}
                >
                  {t(`auth.sex.${s}`)}
                </button>
              ))}
            </div>
          </div>

          <Input
            type="date"
            label={t('auth.birthDate')}
            value={form.birthDate}
            onChange={(e) => updateField('birthDate', e.target.value)}
            error={fieldErrors.birthDate}
            required
          />
        </div>
      )}

      {/* Step 2: Physical Metrics */}
      {step === 2 && (
        <div className="space-y-4 text-start">
          <div className="flex gap-2 mb-2">
            <button
              type="button"
              onClick={() => updateField('unitSystem', 'metric')}
              className={`flex-1 py-2 rounded-lg border text-xs font-semibold ${
                form.unitSystem === 'metric'
                  ? 'border-brand-500 bg-brand-50 dark:bg-brand-950/40 text-brand-700 dark:text-brand-300'
                  : 'border-gray-200 dark:border-gray-700 text-gray-600'
              }`}
            >
              {t('auth.metric')}
            </button>
            <button
              type="button"
              onClick={() => updateField('unitSystem', 'imperial')}
              className={`flex-1 py-2 rounded-lg border text-xs font-semibold ${
                form.unitSystem === 'imperial'
                  ? 'border-brand-500 bg-brand-50 dark:bg-brand-950/40 text-brand-700 dark:text-brand-300'
                  : 'border-gray-200 dark:border-gray-700 text-gray-600'
              }`}
            >
              {t('auth.imperial')}
            </button>
          </div>

          <Input
            type="number"
            min={100}
            max={250}
            step="0.5"
            label={`${t('auth.height')} (${form.unitSystem === 'metric' ? 'cm' : 'in'})`}
            value={form.heightCm}
            onChange={(e) => updateField('heightCm', Number(e.target.value))}
            error={fieldErrors.heightCm}
            required
          />

          <Input
            type="number"
            min={30}
            max={300}
            step="0.1"
            label={`${t('auth.weight')} (${form.unitSystem === 'metric' ? 'kg' : 'lbs'})`}
            value={form.weightKg}
            onChange={(e) => updateField('weightKg', Number(e.target.value))}
            error={fieldErrors.weightKg}
            required
          />
        </div>
      )}

      {/* Step 3: Activity Multiplier & Experience */}
      {step === 3 && (
        <div className="space-y-4 text-start">
          <div>
            <label className="text-xs font-semibold text-gray-700 dark:text-gray-300 block mb-2">
              {language === 'ar' ? 'مستوى النشاط اليومي' : 'Daily Activity Level'}
            </label>
            <div className="space-y-2">
              {[
                { mult: 1.2, key: 'sedentary' },
                { mult: 1.375, key: 'light' },
                { mult: 1.55, key: 'moderate' },
                { mult: 1.725, key: 'active' },
                { mult: 1.9, key: 'very_active' },
              ].map((item) => (
                <button
                  key={item.mult}
                  type="button"
                  onClick={() => updateField('activityMultiplier', item.mult as any)}
                  className={`w-full p-3 rounded-lg border text-xs font-semibold text-start flex justify-between items-center transition-all ${
                    form.activityMultiplier === item.mult
                      ? 'border-brand-500 bg-brand-50 dark:bg-brand-950/40 text-brand-700 dark:text-brand-300 ring-2 ring-brand-500/20'
                      : 'border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300'
                  }`}
                >
                  <span>{t(`auth.activityLevels.${item.key}`)}</span>
                  <span className="text-gray-400 font-mono">x{item.mult}</span>
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-gray-700 dark:text-gray-300 block mb-2">
              {language === 'ar' ? 'الخبرة التدريبية' : 'Training Experience'}
            </label>
            <div className="grid grid-cols-3 gap-2">
              {(['beginner', 'intermediate', 'advanced'] as TrainingExperience[]).map((exp) => (
                <button
                  key={exp}
                  type="button"
                  onClick={() => updateField('trainingExperience', exp)}
                  className={`p-2.5 rounded-lg border text-xs font-semibold transition-all ${
                    form.trainingExperience === exp
                      ? 'border-brand-500 bg-brand-50 dark:bg-brand-950/40 text-brand-700 dark:text-brand-300'
                      : 'border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300'
                  }`}
                >
                  {t(`auth.experience.${exp}`)}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Step 4: Dietary Preferences & Language */}
      {step === 4 && (
        <div className="space-y-4 text-start">
          <div>
            <label className="text-xs font-semibold text-gray-700 dark:text-gray-300 block mb-2">
              {language === 'ar' ? 'النظام الغذائي المفضل' : 'Dietary Preference'}
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {(
                [
                  'none',
                  'halal',
                  'vegetarian',
                  'vegan',
                  'pescatarian',
                  'keto',
                ] as DietaryPreference[]
              ).map((diet) => (
                <button
                  key={diet}
                  type="button"
                  onClick={() => updateField('dietaryPreference', diet)}
                  className={`p-2.5 rounded-lg border text-xs font-semibold transition-all ${
                    form.dietaryPreference === diet
                      ? 'border-brand-500 bg-brand-50 dark:bg-brand-950/40 text-brand-700 dark:text-brand-300'
                      : 'border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300'
                  }`}
                >
                  {t(`auth.dietary.${diet}`)}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-gray-700 dark:text-gray-300 block mb-2">
              {t('auth.preferredLanguage')}
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => updateField('preferredLanguage', 'en')}
                className={`p-2.5 rounded-lg border text-xs font-semibold ${
                  form.preferredLanguage === 'en'
                    ? 'border-brand-500 bg-brand-50 dark:bg-brand-950/40 text-brand-700 dark:text-brand-300'
                    : 'border-gray-200 dark:border-gray-700 text-gray-600'
                }`}
              >
                English
              </button>
              <button
                type="button"
                onClick={() => updateField('preferredLanguage', 'ar')}
                className={`p-2.5 rounded-lg border text-xs font-semibold ${
                  form.preferredLanguage === 'ar'
                    ? 'border-brand-500 bg-brand-50 dark:bg-brand-950/40 text-brand-700 dark:text-brand-300'
                    : 'border-gray-200 dark:border-gray-700 text-gray-600'
                }`}
              >
                العربية
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Step 5: Account Info & Legal Consents */}
      {step === 5 && (
        <form onSubmit={handleFinish} noValidate className="space-y-4 text-start">
          <Input
            label={t('auth.displayName')}
            value={form.displayName}
            onChange={(e) => updateField('displayName', e.target.value)}
            error={fieldErrors.displayName}
            autoComplete="name"
            required
          />

          <Input
            type="email"
            label={t('auth.email')}
            value={form.email}
            onChange={(e) => updateField('email', e.target.value)}
            error={fieldErrors.email}
            autoComplete="email"
            required
          />

          <Input
            type="password"
            label={t('auth.password')}
            value={form.password}
            onChange={(e) => updateField('password', e.target.value)}
            error={fieldErrors.password}
            helperText={
              language === 'ar'
                ? '8 أحرف على الأقل، حرف كبير، رقم، ورمز خاص'
                : 'At least 8 characters, 1 uppercase, 1 number, 1 symbol'
            }
            autoComplete="new-password"
            required
          />

          {/* Core Invariant 1 Disclaimer & Terms Checkboxes */}
          <div className="p-3.5 rounded-lg bg-teal-50/60 dark:bg-surface-elevated border border-teal-200 dark:border-surface-border space-y-3 mt-4">
            <label className="flex items-start gap-2.5 cursor-pointer">
              <input
                type="checkbox"
                checked={form.hasAcceptedHealthDisclaimer}
                onChange={(e) => updateField('hasAcceptedHealthDisclaimer', e.target.checked)}
                className="mt-0.5 rounded text-brand-600 focus:ring-brand-500 w-4 h-4 shrink-0"
                required
              />
              <span className="text-xs text-gray-700 dark:text-gray-300 leading-snug">
                <strong>{language === 'ar' ? 'إخلاء المسؤولية الصحية:' : 'Health Disclaimer:'}</strong>{' '}
                {t('auth.disclaimerText')}
              </span>
            </label>

            <label className="flex items-start gap-2.5 cursor-pointer">
              <input
                type="checkbox"
                checked={form.hasAcceptedTerms}
                onChange={(e) => updateField('hasAcceptedTerms', e.target.checked)}
                className="mt-0.5 rounded text-brand-600 focus:ring-brand-500 w-4 h-4 shrink-0"
                required
              />
              <span className="text-xs text-gray-700 dark:text-gray-300 leading-snug">
                {t('auth.termsText')}
              </span>
            </label>
          </div>
        </form>
      )}

      {/* Navigation Buttons */}
      <div className="flex items-center justify-between pt-6 border-t border-gray-100 dark:border-surface-border mt-6">
        {step > 1 ? (
          <Button type="button" variant="outline" onClick={handlePrev} disabled={isLoading} className="gap-2">
            <ArrowPrev className="w-4 h-4" />
            <span>{t('auth.prevStep')}</span>
          </Button>
        ) : (
          <Link href="/auth/login">
            <Button type="button" variant="ghost" className="text-xs">
              {t('auth.alreadyHaveAccount')}
            </Button>
          </Link>
        )}

        {step < 5 ? (
          <Button type="button" onClick={handleNext} className="gap-2">
            <span>{t('auth.nextStep')}</span>
            <ArrowNext className="w-4 h-4" />
          </Button>
        ) : (
          <Button
            type="button"
            onClick={handleFinish}
            isLoading={isLoading}
            disabled={isLoading}
            className="gap-2 bg-brand-600 hover:bg-brand-700"
          >
            <Sparkles className="w-4 h-4" />
            <span>{t('auth.finishRegistration')}</span>
          </Button>
        )}
      </div>
    </Card>
  );
};
