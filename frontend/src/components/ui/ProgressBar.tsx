import React from 'react';
import { cn } from '../../lib/utils';

export interface ProgressBarProps {
  current: number;
  target: number;
  label?: string;
  unit?: string;
  variant?: 'protein' | 'carbs' | 'fat' | 'brand' | 'neutral';
  showValues?: boolean;
  className?: string;
}

export const ProgressBar: React.FC<ProgressBarProps> = ({
  current,
  target,
  label,
  unit = 'g',
  variant = 'brand',
  showValues = true,
  className,
}) => {
  const percentage = target > 0 ? Math.min(Math.round((current / target) * 100), 100) : 0;
  const isOver = current > target && target > 0;

  const barColors = {
    protein: 'bg-red-500',
    carbs: 'bg-amber-500',
    fat: 'bg-emerald-500',
    brand: 'bg-brand-500',
    neutral: 'bg-gray-500',
  };

  const bgTrackColors = {
    protein: 'bg-red-100 dark:bg-red-950/30',
    carbs: 'bg-amber-100 dark:bg-amber-950/30',
    fat: 'bg-emerald-100 dark:bg-emerald-950/30',
    brand: 'bg-brand-100 dark:bg-brand-950/30',
    neutral: 'bg-gray-100 dark:bg-gray-800',
  };

  return (
    <div className={cn('w-full flex flex-col gap-1.5', className)}>
      {(label || showValues) && (
        <div className="flex justify-between items-center text-xs font-medium">
          {label && <span className="text-gray-700 dark:text-gray-300">{label}</span>}
          {showValues && (
            <span className={cn('tabular-nums', isOver ? 'text-red-600 dark:text-red-400 font-semibold' : 'text-gray-500 dark:text-gray-400')}>
              {current} / {target} {unit} ({percentage}%)
            </span>
          )}
        </div>
      )}
      <div className={cn('h-2.5 w-full rounded-full overflow-hidden', bgTrackColors[variant])}>
        <div
          className={cn('h-full transition-all duration-500 rounded-full', isOver ? 'bg-red-500' : barColors[variant])}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
};

