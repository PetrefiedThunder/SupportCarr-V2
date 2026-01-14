import React from 'react';
import { cn } from '@/lib/utils';

/**
 * TextArea Props
 */
export interface TextAreaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  helperText?: string;
  error?: string;
  isFullWidth?: boolean;
  showCharCount?: boolean;
}

/**
 * TextArea Component
 *
 * Multi-line text input with labels and validation states
 */
export const TextArea = React.forwardRef<HTMLTextAreaElement, TextAreaProps>(
  (
    {
      label,
      helperText,
      error,
      isFullWidth = false,
      showCharCount = false,
      maxLength,
      value,
      className,
      id,
      ...props
    },
    ref,
  ) => {
    const textareaId = id || `textarea-${Math.random().toString(36).substring(2, 9)}`;
    const hasError = !!error;

    const baseStyles =
      'block px-3 py-2 border rounded-lg text-gray-900 placeholder-gray-400 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed resize-y';

    const variantStyles = hasError
      ? 'border-red-500 focus:border-red-500 focus:ring-red-500'
      : 'border-gray-300 focus:border-blue-500 focus:ring-blue-500';

    const widthStyles = isFullWidth ? 'w-full' : '';

    const charCount = typeof value === 'string' ? value.length : 0;
    const showCounter = showCharCount && maxLength;

    return (
      <div className={cn('flex flex-col', isFullWidth ? 'w-full' : '')}>
        {label && (
          <label
            htmlFor={textareaId}
            className="mb-1.5 text-sm font-medium text-gray-700"
          >
            {label}
          </label>
        )}

        <textarea
          ref={ref}
          id={textareaId}
          className={cn(baseStyles, variantStyles, widthStyles, className)}
          maxLength={maxLength}
          value={value}
          {...props}
        />

        <div className="mt-1.5 flex items-center justify-between">
          <div className="flex-1">
            {error && <p className="text-sm text-red-600">{error}</p>}
            {helperText && !error && (
              <p className="text-sm text-gray-500">{helperText}</p>
            )}
          </div>

          {showCounter && (
            <p
              className={cn(
                'text-sm',
                charCount > maxLength! * 0.9 ? 'text-red-600' : 'text-gray-500',
              )}
            >
              {charCount}/{maxLength}
            </p>
          )}
        </div>
      </div>
    );
  },
);

TextArea.displayName = 'TextArea';
