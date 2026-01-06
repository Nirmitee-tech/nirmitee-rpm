import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../../utils/cn';

const alertBadgeVariants = cva(
  'inline-flex items-center justify-center rounded-full text-xs font-bold',
  {
    variants: {
      variant: {
        critical: 'bg-red-500 text-white',
        significant: 'bg-yellow-500 text-white',
        informational: 'bg-blue-500 text-white',
        default: 'bg-gray-500 text-white',
      },
      size: {
        sm: 'h-5 min-w-5 px-1.5',
        md: 'h-6 min-w-6 px-2',
        lg: 'h-7 min-w-7 px-2.5',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'md',
    },
  }
);

export interface AlertBadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof alertBadgeVariants> {
  count: number;
}

function AlertBadge({ className, variant, size, count, ...props }: AlertBadgeProps) {
  if (count <= 0) return null;

  return (
    <span
      className={cn(alertBadgeVariants({ variant, size }), className)}
      {...props}
    >
      {count > 99 ? '99+' : count}
    </span>
  );
}

export { AlertBadge, alertBadgeVariants };
