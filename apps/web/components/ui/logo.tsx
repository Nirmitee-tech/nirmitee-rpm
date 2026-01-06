import { cn } from '@nirmitee/ui';

interface LogoProps {
  className?: string;
  variant?: 'light' | 'dark';
  size?: 'sm' | 'md' | 'lg';
}

const sizeClasses = {
  sm: 'text-lg',
  md: 'text-xl',
  lg: 'text-2xl',
};

export function Logo({ className, variant = 'dark', size = 'md' }: LogoProps) {
  return (
    <div
      className={cn(
        'font-brand font-bold tracking-tight',
        sizeClasses[size],
        variant === 'light' ? 'text-white' : 'text-brand',
        className
      )}
    >
      <span className="text-brand">Nirmitee</span>
      <span className={variant === 'light' ? 'text-white' : 'text-gray-600'}>RPM</span>
    </div>
  );
}
