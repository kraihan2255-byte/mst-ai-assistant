import { AlertCircle, RefreshCw } from 'lucide-react';
import { Button } from '../ui/button';

export interface ErrorBannerProps {
  message: string;
  onRetry?: () => void;
}

export function ErrorBanner({ message, onRetry }: ErrorBannerProps) {
  return (
    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-4 rounded-xl border border-rose-200 bg-rose-50 text-rose-900 text-sm">
      <div className="flex items-center gap-2.5">
        <AlertCircle className="h-5 w-5 text-rose-600 shrink-0" />
        <span className="font-medium">{message}</span>
      </div>
      {onRetry && (
        <Button
          onClick={onRetry}
          variant="outline"
          size="sm"
          className="bg-white border-rose-300 text-rose-800 hover:bg-rose-100"
        >
          <RefreshCw className="h-3.5 w-3.5 mr-1" />
          Retry
        </Button>
      )}
    </div>
  );
}
