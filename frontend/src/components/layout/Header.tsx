import { useLocation, Link } from 'react-router-dom';
import { Bot, Menu, ShieldCheck } from 'lucide-react';
import { useHealth } from '../../hooks/use-health';
import { cn } from '../../lib/utils';

const pageTitles: Record<string, { title: string; subtitle: string }> = {
  '/': { title: 'Business Overview', subtitle: 'Live metrics, recent deliveries, and collection status' },
  '/assistant': { title: 'AI Business Assistant', subtitle: 'Natural-language delivery parsing & interactive confirmation' },
  '/customers': { title: 'Customer Management', subtitle: 'Profiles, areas, addresses, and transaction balances' },
  '/deliveries': { title: 'Deliveries & Logistics', subtitle: 'Itemized and bulk deliveries with payment tracking' },
  '/payments': { title: 'Payments & Collections', subtitle: 'Cash and UPI receipts with real-time balance reconciliation' },
  '/products': { title: 'Products & Pricing', subtitle: 'Catalog specifications and date-effective price schedules' },
  '/reports': { title: 'Financial Reports', subtitle: 'Revenue analytics, customer credits, and payment methods' },
  '/settings': { title: 'System Settings', subtitle: 'Local Ollama runtime, connection health, and environment' },
};

export function Header({ onToggleMobileNav }: { onToggleMobileNav: () => void }) {
  const location = useLocation();
  const currentPath = location.pathname;
  const currentInfo = pageTitles[currentPath] || {
    title: 'MST Tengapal',
    subtitle: 'Coconut Milk Business Assistant',
  };

  const { data: health } = useHealth();
  const isHealthy = health?.status === 'ok';

  return (
    <header className="sticky top-0 z-30 flex min-h-[4rem] items-center justify-between border-b border-stone-200 bg-white/80 backdrop-blur-md px-4 sm:px-8 pt-[env(safe-area-inset-top)]">
      {/* Mobile Drawer Trigger & Title */}
      <div className="flex items-center gap-3">
        <button
          onClick={onToggleMobileNav}
          className="lg:hidden p-2 rounded-lg text-stone-600 hover:bg-stone-100"
          aria-label="Open Navigation"
        >
          <Menu className="h-5 w-5" />
        </button>

        <div>
          <h2 className="text-base sm:text-lg font-bold text-brand-dark leading-tight">
            {currentInfo.title}
          </h2>
          <p className="hidden sm:block text-xs text-stone-500">
            {currentInfo.subtitle}
          </p>
        </div>
      </div>

      {/* Header Actions */}
      <div className="flex items-center gap-3">
        {/* Backend & AI status indicator */}
        <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-stone-50 border border-stone-200 text-xs">
          <ShieldCheck className={cn('h-4 w-4', isHealthy ? 'text-emerald-600' : 'text-amber-500')} />
          <span className="font-medium text-stone-700">
            Backend: {isHealthy ? 'Healthy' : 'Connecting'}
          </span>
        </div>

        {/* Quick Launch AI Assistant button */}
        {currentPath !== '/assistant' && (
          <Link
            to="/assistant"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-brand-primary text-white text-xs font-semibold hover:bg-brand-primary-hover shadow-sm transition-colors"
          >
            <Bot className="h-3.5 w-3.5" />
            <span>AI Assistant</span>
          </Link>
        )}
      </div>
    </header>
  );
}
