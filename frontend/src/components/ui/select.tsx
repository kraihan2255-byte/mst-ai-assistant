import React, { useId } from 'react';
import { cn } from '../../lib/utils';

export interface SelectOption {
  value: string;
  label: string;
}

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  error?: string;
  label?: string;
  helperText?: string;
  options: SelectOption[];
  placeholder?: string;
}

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, error, label, helperText, options, placeholder, id, ...props }, ref) => {
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
        <select
          id={inputId}
          ref={ref}
          className={cn(
            'flex h-10 w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-brand-primary focus:border-brand-primary disabled:cursor-not-allowed disabled:bg-stone-50 disabled:text-stone-500 transition-colors',
            error && 'border-rose-500 focus:ring-rose-500 focus:border-rose-500',
            className,
          )}
          {...props}
        >
          {placeholder && <option value="">{placeholder}</option>}
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        {helperText && !error && (
          <p className="mt-1 text-xs text-stone-500">{helperText}</p>
        )}
        {error && <p className="mt-1 text-xs text-rose-600 font-medium">{error}</p>}
      </div>
    );
  },
);

Select.displayName = 'Select';
