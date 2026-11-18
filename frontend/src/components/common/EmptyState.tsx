import { PackageOpen } from 'lucide-react';
import { Button } from '../ui/button';

export interface EmptyStateProps {
  title: string;
  description: string;
  icon?: React.ReactNode;
  actionLabel?: string;
  onAction?: () => void;
}

export function EmptyState({
  title,
  description,
  icon,
  actionLabel,
  onAction,
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center p-8 sm:p-12 text-center rounded-2xl border border-dashed border-stone-200 bg-white/60">
      <div className="rounded-2xl bg-teal-50/80 p-4 text-brand-primary mb-4">
        {icon || <PackageOpen className="h-8 w-8 text-brand-primary" />}
      </div>
      <h4 className="text-base font-bold text-brand-dark mb-1">{title}</h4>
      <p className="text-sm text-stone-500 max-w-sm mb-6 leading-relaxed">
        {description}
      </p>
      {actionLabel && onAction && (
        <Button onClick={onAction} variant="primary" size="md">
          {actionLabel}
        </Button>
      )}
    </div>
  );
}
