import { Loader2 } from 'lucide-react';
import { cn } from '../../lib/utils';

export function LoadingSpinner({
  className,
  label = 'Loading...',
}: {
  className?: string;
  label?: string;
}) {
  return (
    <div className={cn('flex flex-col items-center justify-center p-8 text-stone-400 gap-3', className)}>
      <Loader2 className="h-8 w-8 animate-spin text-brand-primary" />
      {label && <p className="text-xs font-medium text-stone-500">{label}</p>}
    </div>
  );
}
