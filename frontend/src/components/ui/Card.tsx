import React, { HTMLAttributes, forwardRef } from 'react';
import { cn } from '../../lib/utils';

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'elevated' | 'bordered';
}

export const Card = forwardRef<HTMLDivElement, CardProps>(
  ({ className, variant = 'default', children, ...props }, ref) => {
    const variants = {
      default: 'bg-white dark:bg-surface-card border border-gray-200 dark:border-surface-border shadow-sm',
      elevated: 'bg-white dark:bg-surface-elevated border border-gray-200 dark:border-surface-border shadow-md',
      bordered: 'bg-transparent border border-gray-300 dark:border-surface-border',
    };

    return (
      <div
        ref={ref}
        className={cn('rounded-lg p-5 transition-shadow', variants[variant], className)}
        {...props}
      >
        {children}
      </div>
    );
  }
);

Card.displayName = 'Card';

