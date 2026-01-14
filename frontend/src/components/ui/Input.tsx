import React from 'react';
import { cn } from '@/lib/utils';

/**
 * Input Variants
 */
type InputVariant = 'default' | 'error' | 'success';

/**
 * Input Props
 */
export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  variant?: InputVariant;
  label?: string;
  helperText?: string;
  error?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  isFullWidth?: boolean;
}

/**
 * Input Component
 *
 * Production-grade input with labels, icons, and validation states
 */
export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  (
    {
      variant = 'default',
      label,
      helperText,
      error,
      leftIcon,
      rightIcon,
      isFullWidth = false,
      className,
      id,
      ...props
    },
    ref,
  ) => {
    const inputId = id || `input-${Math.random().toString(36).substring(2, 9)}`;
    const hasError = !!error;
    const finalVariant = hasError ? 'error' : variant;

    const baseStyles =
      'block px-3 py-2 border rounded-lg text-gray-900 placeholder-gray-400 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed';

    const variantStyles: Record<InputVariant, string> = {
      default: 'border-gray-300 focus:border-blue-500 focus:ring-blue-500',
      error: 'border-red-500 focus:border-red-500 focus:ring-red-500',
      success: 'border-green-500 focus:border-green-500 focus:ring-green-500',
    };

    const widthStyles = isFullWidth ? 'w-full' : '';
    const iconPaddingStyles = leftIcon ? 'pl-10' : rightIcon ? 'pr-10' : '';

    return (
      <div className={cn('flex flex-col', isFullWidth ? 'w-full' : '')}>
        {label && (
          <label
            htmlFor={inputId}
            className="mb-1.5 text-sm font-medium text-gray-700"
          >
            {label}
          </label>
        )}

        <div className="relative">
          {leftIcon && (
            <div className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
              {leftIcon}
            </div>
          )}

          <input
            ref={ref}
            id={inputId}
            className={cn(
              baseStyles,
              variantStyles[finalVariant],
              widthStyles,
              iconPaddingStyles,
              className,
            )}
            {...props}
          />

          {rightIcon && (
            <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
              {rightIcon}
            </div>
          )}
        </div>

        {error && <p className="mt-1.5 text-sm text-red-600">{error}</p>}

        {helperText && !error && (
          <p className="mt-1.5 text-sm text-gray-500">{helperText}</p>
        )}
      </div>
    );
  },
);

Input.displayName = 'Input';
