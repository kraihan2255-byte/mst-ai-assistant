import { Card } from '../ui/card';
import { cn } from '../../lib/utils';

export interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: React.ReactNode;
  trend?: {
    value: string;
    isPositive?: boolean;
  };
  variant?: 'default' | 'primary' | 'warning' | 'danger' | 'success';
}

export function StatCard({
  title,
  value,
  subtitle,
  icon,
  trend,
  variant = 'default',
}: StatCardProps) {
  const iconBgs = {
    default: 'bg-stone-100 text-stone-700',
    primary: 'bg-teal-50 text-brand-primary',
    warning: 'bg-amber-50 text-amber-700',
    danger: 'bg-rose-50 text-rose-700',
    success: 'bg-emerald-50 text-emerald-700',
  };

  return (
    <Card className="flex flex-col justify-between hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-stone-500">
            {title}
          </p>
          <div className="mt-2 text-2xl sm:text-3xl font-extrabold text-brand-dark tracking-tight">
            {value}
          </div>
        </div>
        {icon && (
          <div className={cn('rounded-xl p-3 flex items-center justify-center shrink-0', iconBgs[variant])}>
            {icon}
          </div>
        )}
      </div>

      {(subtitle || trend) && (
        <div className="mt-4 flex items-center text-xs text-stone-500 gap-1.5 pt-3 border-t border-stone-100">
          {trend && (
            <span
              className={cn(
                'font-bold',
                trend.isPositive ? 'text-emerald-600' : 'text-rose-600',
              )}
            >
              {trend.value}
            </span>
          )}
          {subtitle && <span>{subtitle}</span>}
        </div>
      )}
    </Card>
  );
}
