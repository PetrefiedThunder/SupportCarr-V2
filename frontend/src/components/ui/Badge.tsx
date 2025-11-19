import React from 'react';
import { cn } from '@/lib/utils';

/**
 * Badge Variants
 */
type BadgeVariant =
  | 'default'
  | 'primary'
  | 'success'
  | 'warning'
  | 'danger'
  | 'info'
  | 'outline';

/**
 * Badge Sizes
 */
type BadgeSize = 'sm' | 'md' | 'lg';

/**
 * Badge Props
 */
export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
  size?: BadgeSize;
}

/**
 * Badge Component
 *
 * Small status indicator or label
 */
export const Badge = React.forwardRef<HTMLSpanElement, BadgeProps>(
  ({ variant = 'default', size = 'md', className, children, ...props }, ref) => {
    const variantStyles: Record<BadgeVariant, string> = {
      default: 'bg-gray-100 text-gray-800',
      primary: 'bg-blue-100 text-blue-800',
      success: 'bg-green-100 text-green-800',
      warning: 'bg-yellow-100 text-yellow-800',
      danger: 'bg-red-100 text-red-800',
      info: 'bg-cyan-100 text-cyan-800',
      outline: 'bg-transparent border border-gray-300 text-gray-700',
    };

    const sizeStyles: Record<BadgeSize, string> = {
      sm: 'px-2 py-0.5 text-xs',
      md: 'px-2.5 py-1 text-sm',
      lg: 'px-3 py-1.5 text-base',
    };

    return (
      <span
        ref={ref}
        className={cn(
          'inline-flex items-center font-medium rounded-full',
          variantStyles[variant],
          sizeStyles[size],
          className,
        )}
        {...props}
      >
        {children}
      </span>
    );
  },
);

Badge.displayName = 'Badge';
