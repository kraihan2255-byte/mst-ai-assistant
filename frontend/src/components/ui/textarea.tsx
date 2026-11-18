import React, { useId } from 'react';
import { cn } from '../../lib/utils';

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  error?: string;
  label?: string;
  helperText?: string;
}

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, error, label, helperText, id, ...props }, ref) => {
    const autoId = useId();
    const inputId = id || props.name || autoId;

    return (
      <div className="w-full">
        {label && (
          <label
            htmlFor={inputId}
            className="block text-xs font-semibold uppercase tracking-wider text-stone-600 mb-1"
          >
            {label}
          </label>
        )}
        <textarea
          id={inputId}
          ref={ref}
          className={cn(
            'flex min-h-[80px] w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm text-stone-900 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-brand-primary focus:border-brand-primary disabled:cursor-not-allowed disabled:bg-stone-50 disabled:text-stone-500 transition-colors',
            error && 'border-rose-500 focus:ring-rose-500 focus:border-rose-500',
            className,
          )}
          {...props}
        />
        {helperText && !error && (
          <p className="mt-1 text-xs text-stone-500">{helperText}</p>
        )}
        {error && <p className="mt-1 text-xs text-rose-600 font-medium">{error}</p>}
      </div>
    );
  },
);

Textarea.displayName = 'Textarea';
