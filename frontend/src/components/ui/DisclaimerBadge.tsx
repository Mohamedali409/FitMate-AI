import React from 'react';
import { Sparkles } from 'lucide-react';
import { useLanguage } from '../../lib/i18n/LanguageContext';
import { cn } from '../../lib/utils';

export interface DisclaimerBadgeProps {
  text?: string;
  className?: string;
  size?: 'sm' | 'md';
}

export const DisclaimerBadge: React.FC<DisclaimerBadgeProps> = ({
  text,
  className,
  size = 'sm',
}) => {
  const { t, language } = useLanguage();
  const label = text || (language === 'ar' ? 'قيمة تقديرية' : 'Estimated');

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 font-medium rounded-full bg-cyan-50 dark:bg-cyan-950/40 text-cyan-800 dark:text-cyan-300 border border-cyan-200 dark:border-cyan-800/60 select-none',
        size === 'sm' ? 'text-[11px] px-2 py-0.5' : 'text-xs px-2.5 py-1',
        className
      )}
      title={
        language === 'ar'
          ? 'تنبيه: جميع القيم الغذائية والحسابية تقديرية مبنية على معادلات استرشادية.'
          : 'Note: All nutrition values and calculations are estimates.'
      }
    >
      <Sparkles className={size === 'sm' ? 'w-3 h-3 text-cyan-500' : 'w-3.5 h-3.5 text-cyan-500'} />
      {label}
    </span>
  );
};

