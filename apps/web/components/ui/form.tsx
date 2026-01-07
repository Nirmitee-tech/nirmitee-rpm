'use client';

import * as React from 'react';
import {
  Controller,
  FormProvider,
  useFormContext,
  type ControllerProps,
  type FieldPath,
  type FieldValues,
  type UseFormReturn,
} from 'react-hook-form';
import { cn } from '@nirmitee/ui';
import { Label } from './label';

// Form Root Component
interface FormProps<TFieldValues extends FieldValues> {
  form: UseFormReturn<TFieldValues>;
  onSubmit: (data: TFieldValues) => void | Promise<void>;
  children: React.ReactNode;
  className?: string;
}

export function Form<TFieldValues extends FieldValues>({
  form,
  onSubmit,
  children,
  className,
}: FormProps<TFieldValues>) {
  return (
    <FormProvider {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className={className}>
        {children}
      </form>
    </FormProvider>
  );
}

// Form Field Context
type FormFieldContextValue<
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>
> = {
  name: TName;
};

const FormFieldContext = React.createContext<FormFieldContextValue | null>(
  null
);

// Form Field Component
export function FormField<
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>
>({
  ...props
}: ControllerProps<TFieldValues, TName>) {
  return (
    <FormFieldContext.Provider value={{ name: props.name }}>
      <Controller {...props} />
    </FormFieldContext.Provider>
  );
}

// Hook to access field context
export function useFormField() {
  const fieldContext = React.useContext(FormFieldContext);
  const { getFieldState, formState } = useFormContext();

  if (!fieldContext) {
    throw new Error('useFormField must be used within FormField');
  }

  const fieldState = getFieldState(fieldContext.name, formState);

  return {
    name: fieldContext.name,
    error: fieldState.error,
    ...fieldState,
  };
}

// Form Item Component
export interface FormItemProps extends React.HTMLAttributes<HTMLDivElement> {}

export const FormItem = React.forwardRef<HTMLDivElement, FormItemProps>(
  ({ className, ...props }, ref) => {
    return (
      <div ref={ref} className={cn('space-y-2', className)} {...props} />
    );
  }
);
FormItem.displayName = 'FormItem';

// Form Label Component
export interface FormLabelProps
  extends React.LabelHTMLAttributes<HTMLLabelElement> {
  required?: boolean;
}

export const FormLabel = React.forwardRef<HTMLLabelElement, FormLabelProps>(
  ({ className, required, children, ...props }, ref) => {
    const { error } = useFormField();

    return (
      <Label
        ref={ref}
        className={cn(error && 'text-danger', className)}
        {...props}
      >
        {children}
        {required && <span className="text-danger ml-1">*</span>}
      </Label>
    );
  }
);
FormLabel.displayName = 'FormLabel';

// Form Control Component (wrapper for input elements)
export interface FormControlProps
  extends React.HTMLAttributes<HTMLDivElement> {}

export const FormControl = React.forwardRef<HTMLDivElement, FormControlProps>(
  ({ ...props }, ref) => {
    const { error } = useFormField();

    return <div ref={ref} aria-invalid={!!error} {...props} />;
  }
);
FormControl.displayName = 'FormControl';

// Form Description Component
export interface FormDescriptionProps
  extends React.HTMLAttributes<HTMLParagraphElement> {}

export const FormDescription = React.forwardRef<
  HTMLParagraphElement,
  FormDescriptionProps
>(({ className, ...props }, ref) => {
  return (
    <p
      ref={ref}
      className={cn('text-sm text-gray-500 dark:text-gray-400', className)}
      {...props}
    />
  );
});
FormDescription.displayName = 'FormDescription';

// Form Error Component
export interface FormErrorProps
  extends React.HTMLAttributes<HTMLParagraphElement> {}

export const FormError = React.forwardRef<
  HTMLParagraphElement,
  FormErrorProps
>(({ className, children, ...props }, ref) => {
  const { error } = useFormField();

  if (!error) return null;

  return (
    <p
      ref={ref}
      className={cn('text-sm font-medium text-danger', className)}
      {...props}
    >
      {error.message || children}
    </p>
  );
});
FormError.displayName = 'FormError';

// Form Message Component (shows error or description)
export interface FormMessageProps
  extends React.HTMLAttributes<HTMLParagraphElement> {}

export const FormMessage = React.forwardRef<
  HTMLParagraphElement,
  FormMessageProps
>(({ className, children, ...props }, ref) => {
  const { error } = useFormField();

  if (!error && !children) return null;

  return (
    <p
      ref={ref}
      className={cn(
        'text-sm font-medium',
        error ? 'text-danger' : 'text-gray-500 dark:text-gray-400',
        className
      )}
      {...props}
    >
      {error ? error.message : children}
    </p>
  );
});
FormMessage.displayName = 'FormMessage';
