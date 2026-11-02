import React, { InputHTMLAttributes, forwardRef, useId } from 'react';
import { cn } from '../../lib/utils';

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, helperText, id, ...props }, ref) => {
    const generatedId = useId();
    const inputId = id || generatedId;

    return (
      <div className="w-full flex flex-col gap-1.5 text-start">
        {label && (
          <label htmlFor={inputId} className="text-xs font-semibold text-gray-700 dark:text-gray-300">
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={inputId}
          className={cn(
            'flex h-11 w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-surface-card px-3.5 py-2 text-sm text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:border-transparent transition-colors disabled:cursor-not-allowed disabled:opacity-50 min-h-[44px]',
            error && 'border-red-500 focus-visible:ring-red-500',
            className
          )}
          {...props}
        />
        {error && <span className="text-xs text-red-500 font-medium">{error}</span>}
        {helperText && !error && <span className="text-xs text-gray-500 dark:text-gray-400">{helperText}</span>}
      </div>
    );
  }
);

Input.displayName = 'Input';

