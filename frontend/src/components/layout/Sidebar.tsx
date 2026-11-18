import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Bot,
  Users,
  Truck,
  CreditCard,
  Package,
  BarChart3,
  Settings,
  Sparkles,
  LogOut,
  UserCheck,
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { useHealth } from '../../hooks/use-health';
import { useAuth } from '../../features/auth/AuthContext';

const navItems = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/assistant', label: 'AI Assistant', icon: Bot, isPrimary: true },
  { to: '/customers', label: 'Customers', icon: Users },
  { to: '/deliveries', label: 'Deliveries', icon: Truck },
  { to: '/payments', label: 'Payments', icon: CreditCard },
  { to: '/products', label: 'Products & Pricing', icon: Package },
  { to: '/reports', label: 'Reports', icon: BarChart3 },
  { to: '/settings', label: 'Settings', icon: Settings },
];

export function Sidebar() {
  const { data: health } = useHealth();
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const isOllamaReachable = health?.ollama.status === 'reachable';

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <aside className="hidden lg:flex w-64 flex-col bg-white border-r border-stone-200 shrink-0 h-screen sticky top-0 select-none">
      {/* Brand Header */}
      <div className="p-6 border-b border-stone-100 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-teal-50 border border-teal-100 flex items-center justify-center text-brand-primary">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              width="24"
              height="24"
              fill="none"
              stroke="#107B6C"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="12" cy="12" r="9" />
              <path d="M12 3a9 9 0 0 1 9 9" />
              <circle cx="9" cy="10" r="1.2" fill="#107B6C" />
              <circle cx="15" cy="10" r="1.2" fill="#107B6C" />
              <circle cx="12" cy="14" r="1.2" fill="#107B6C" />
            </svg>
          </div>
          <div>
            <h1 className="text-base font-extrabold text-brand-dark tracking-tight leading-none">
              MST Tengapal
            </h1>
            <p className="text-[11px] font-medium text-stone-400 mt-1">
              Coconut Milk Assistant
            </p>
          </div>
        </div>
      </div>

      {/* Navigation List */}
      <nav className="flex-1 p-4 space-y-1.5 overflow-y-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) =>
                cn(
                  'flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-semibold transition-all group',
                  item.isPrimary
                    ? isActive
                      ? 'bg-brand-primary text-white shadow-sm'
                      : 'bg-brand-accent/40 text-brand-dark hover:bg-brand-accent/70'
                    : isActive
                      ? 'bg-stone-100 text-brand-primary'
                      : 'text-stone-600 hover:bg-stone-50 hover:text-brand-dark',
                )
              }
            >
              <div className="flex items-center gap-3">
                <Icon
                  className={cn(
                    'h-4 w-4 shrink-0 transition-transform group-hover:scale-110',
                    item.isPrimary ? 'text-brand-primary' : 'text-stone-400',
                  )}
                />
                <span>{item.label}</span>
              </div>
              {item.isPrimary && (
                <span className="flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-teal-100 text-teal-800 uppercase tracking-wider">
                  <Sparkles className="h-2.5 w-2.5" /> AI
                </span>
              )}
            </NavLink>
          );
        })}
      </nav>

      {/* User Session & Logout */}
      {user && (
        <div className="px-3 pb-1">
          <div className="p-3 bg-stone-50 rounded-xl border border-stone-200/60 flex items-center justify-between">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="h-8 w-8 rounded-lg bg-brand-primary/10 text-brand-primary flex items-center justify-center shrink-0">
                <UserCheck className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <span className="block text-xs font-bold text-brand-dark truncate">
                  {user.username}
                </span>
                <span className="block text-[10px] text-stone-500 font-medium uppercase tracking-wider">
                  {user.role}
                </span>
              </div>
            </div>
            <button
              onClick={handleLogout}
              title="Sign Out"
              className="p-1.5 text-stone-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors shrink-0"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* System Status Footer */}
      <div className="p-4 border-t border-stone-100 bg-stone-50/60 m-3 rounded-xl border">
        <div className="flex items-center justify-between text-xs">
          <span className="text-stone-500 font-medium">Local AI (Qwen3)</span>
          <span className="flex items-center gap-1.5">
            <span
              className={cn(
                'h-2 w-2 rounded-full',
                isOllamaReachable ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500',
              )}
            />
            <span className="font-semibold text-stone-700">
              {isOllamaReachable ? 'Online' : 'Offline'}
            </span>
          </span>
        </div>
        <p className="text-[10px] text-stone-400 mt-1">100% On-device Privacy</p>
      </div>
    </aside>
  );
}
