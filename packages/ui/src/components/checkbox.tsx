import * as React from 'react';
import { Check } from 'lucide-react';
import { cn } from '../utils/cn';

export interface CheckboxProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
}

const Checkbox = React.forwardRef<HTMLInputElement, CheckboxProps>(
  ({ className, label, id, ...props }, ref) => {
    const checkboxId = id || React.useId();

    return (
      <label htmlFor={checkboxId} className="flex items-center gap-2 cursor-pointer">
        <div className="relative">
          <input
            type="checkbox"
            id={checkboxId}
            className={cn(
              'peer h-4 w-4 shrink-0 rounded border border-[#D7D7D7] dark:border-[#212121]',
              'focus:outline-none focus:ring-2 focus:ring-brand focus:ring-offset-2',
              'disabled:cursor-not-allowed disabled:opacity-50',
              'checked:bg-brand checked:border-brand',
              'appearance-none cursor-pointer',
              className
            )}
            ref={ref}
            {...props}
          />
          <Check
            className="absolute top-0 left-0 h-4 w-4 text-white pointer-events-none hidden peer-checked:block"
          />
        </div>
        {label && <span className="text-sm text-secondary">{label}</span>}
      </label>
    );
  }
);
Checkbox.displayName = 'Checkbox';

export { Checkbox };
