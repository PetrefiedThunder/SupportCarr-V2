import React from 'react';
import { cn } from '@/lib/utils';

/**
 * Spinner Sizes
 */
type SpinnerSize = 'sm' | 'md' | 'lg' | 'xl';

/**
 * Spinner Props
 */
export interface SpinnerProps {
  size?: SpinnerSize;
  className?: string;
  label?: string;
}

/**
 * Spinner Component
 *
 * Loading spinner with accessible label
 */
export const Spinner: React.FC<SpinnerProps> = ({ size = 'md', className, label }) => {
  const sizeStyles: Record<SpinnerSize, string> = {
    sm: 'h-4 w-4 border-2',
    md: 'h-8 w-8 border-2',
    lg: 'h-12 w-12 border-3',
    xl: 'h-16 w-16 border-4',
  };

  return (
    <div className="flex flex-col items-center justify-center gap-3">
      <div
        className={cn(
          'animate-spin rounded-full border-blue-600 border-t-transparent',
          sizeStyles[size],
          className,
        )}
        role="status"
        aria-label={label || 'Loading'}
      >
        <span className="sr-only">{label || 'Loading'}</span>
      </div>
      {label && <p className="text-sm text-gray-600">{label}</p>}
    </div>
  );
};

Spinner.displayName = 'Spinner';
