import { useEffect } from 'react';
import { cn } from '../../lib/utils';
import { X } from 'lucide-react';

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  children: React.ReactNode;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl';
  /**
   * Whether the modal presents as a bottom sheet on mobile screens (< sm).
   * Defaults to true for optimal touch/mobile UX.
   */
  mobileBottomSheet?: boolean;
}

export function Modal({
  isOpen,
  onClose,
  title,
  description,
  children,
  maxWidth = 'md',
  mobileBottomSheet = true,
}: ModalProps) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const maxWidths = {
    sm: 'sm:max-w-sm',
    md: 'sm:max-w-md',
    lg: 'sm:max-w-lg',
    xl: 'sm:max-w-xl',
  };

  return (
    <div
      className={cn(
        'fixed inset-0 z-50 flex justify-center',
        mobileBottomSheet
          ? 'items-end sm:items-center p-0 sm:p-4'
          : 'items-center p-4',
      )}
    >
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-stone-900/50 backdrop-blur-sm transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Content / Bottom Sheet */}
      <div
        className={cn(
          'relative w-full bg-white shadow-2xl z-10 overflow-y-auto transition-all',
          mobileBottomSheet
            ? 'rounded-t-[1.75rem] sm:rounded-2xl border-t sm:border border-stone-100 p-5 sm:p-6 max-h-[90dvh] sm:max-h-[85vh] pb-[calc(1.5rem+env(safe-area-inset-bottom))] sm:pb-6 animate-in fade-in slide-in-from-bottom-5 duration-200 sm:slide-in-from-bottom-0 sm:zoom-in-95'
            : 'rounded-2xl p-6 border border-stone-100 max-h-[90vh] animate-in fade-in zoom-in-95 duration-150',
          maxWidths[maxWidth],
        )}
        role="dialog"
        aria-modal="true"
      >
        {/* Mobile Bottom Sheet Grab Handle */}
        {mobileBottomSheet && (
          <div className="w-12 h-1.5 bg-stone-300 rounded-full mx-auto mb-3.5 sm:hidden" />
        )}

        <div className="flex items-start justify-between pb-3">
          <div>
            {title && <h2 className="text-lg font-bold text-brand-dark">{title}</h2>}
            {description && (
              <p className="text-xs text-stone-500 mt-0.5">{description}</p>
            )}
          </div>
          <button
            onClick={onClose}
            className="rounded-xl p-2 text-stone-400 hover:bg-stone-100 hover:text-stone-700 transition-colors"
            aria-label="Close dialog"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="mt-2">{children}</div>
      </div>
    </div>
  );
}
