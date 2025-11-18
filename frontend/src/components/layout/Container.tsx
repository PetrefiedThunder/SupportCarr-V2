import React from 'react';
import { cn } from '@/lib/utils';

/**
 * Container Sizes
 */
type ContainerSize = 'sm' | 'md' | 'lg' | 'xl' | 'full';

/**
 * Container Props
 */
export interface ContainerProps extends React.HTMLAttributes<HTMLDivElement> {
  size?: ContainerSize;
  centered?: boolean;
}

/**
 * Container Component
 *
 * Responsive container with max-width constraints
 */
export const Container = React.forwardRef<HTMLDivElement, ContainerProps>(
  ({ size = 'lg', centered = true, className, children, ...props }, ref) => {
    const sizeStyles: Record<ContainerSize, string> = {
      sm: 'max-w-2xl',
      md: 'max-w-4xl',
      lg: 'max-w-7xl',
      xl: 'max-w-[1400px]',
      full: 'max-w-full',
    };

    return (
      <div
        ref={ref}
        className={cn(
          'w-full px-4 sm:px-6 lg:px-8',
          centered && 'mx-auto',
          sizeStyles[size],
          className,
        )}
        {...props}
      >
        {children}
      </div>
    );
  },
);

Container.displayName = 'Container';
