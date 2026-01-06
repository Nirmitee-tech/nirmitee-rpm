import * as React from 'react';
import { cn } from '../utils/cn';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: boolean;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, error, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          'flex h-11 w-full rounded-md border bg-white px-3 py-2 text-sm',
          'placeholder:text-gray-500 focus:outline-none focus:ring-1',
          'disabled:cursor-not-allowed disabled:opacity-50',
          'dark:bg-black dark:text-white',
          error
            ? 'border-danger focus:ring-danger'
            : 'border-[#D7D7D7] dark:border-[#212121] focus:ring-brand focus:border-brand',
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);
Input.displayName = 'Input';

export { Input };
