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
  X,
  LogOut,
  UserCheck,
} from 'lucide-react';
import { cn } from '../../lib/utils';
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

export function MobileNav({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    onClose();
    await logout();
    navigate('/login');
  };
  return (
    <>
      {/* Mobile Drawer (When Opened) */}
      {isOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="fixed inset-0 bg-stone-900/40 backdrop-blur-sm"
            onClick={onClose}
          />
          <div className="fixed inset-y-0 left-0 w-72 bg-white p-6 shadow-xl flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between pb-6 border-b border-stone-100">
                <div className="flex items-center gap-2.5">
                  <div className="h-8 w-8 rounded-lg bg-teal-50 border border-teal-100 flex items-center justify-center text-brand-primary">
                    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="#107B6C" strokeWidth="2.2">
                      <circle cx="12" cy="12" r="9" />
                      <path d="M12 3a9 9 0 0 1 9 9" />
                    </svg>
                  </div>
                  <span className="font-bold text-brand-dark">MST Tengapal</span>
                </div>
                <button
                  onClick={onClose}
                  className="p-1 rounded-md text-stone-400 hover:bg-stone-100"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <nav className="mt-6 space-y-1.5">
                {navItems.map((item) => {
                  const Icon = item.icon;
                  return (
                    <NavLink
                      key={item.to}
                      to={item.to}
                      end={item.to === '/'}
                      onClick={onClose}
                      className={({ isActive }) =>
                        cn(
                          'flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-semibold transition-all',
                          item.isPrimary
                            ? isActive
                              ? 'bg-brand-primary text-white shadow-sm'
                              : 'bg-brand-accent/50 text-brand-dark'
                            : isActive
                              ? 'bg-stone-100 text-brand-primary'
                              : 'text-stone-600 hover:bg-stone-50',
                        )
                      }
                    >
                      <div className="flex items-center gap-3">
                        <Icon className="h-4 w-4 shrink-0" />
                        <span>{item.label}</span>
                      </div>
                      {item.isPrimary && (
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-teal-100 text-teal-800">
                          AI
                        </span>
                      )}
                    </NavLink>
                  );
                })}
              </nav>
            </div>

            {user && (
              <div className="pt-4 border-t border-stone-100 flex items-center justify-between">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="h-8 w-8 rounded-lg bg-brand-primary/10 text-brand-primary flex items-center justify-center shrink-0">
                    <UserCheck className="h-4 w-4" />
                  </div>
                  <div className="min-w-0">
                    <span className="block text-xs font-bold text-brand-dark truncate">
                      {user.username}
                    </span>
                    <span className="block text-[10px] text-stone-500 uppercase">
                      {user.role}
                    </span>
                  </div>
                </div>
                <button
                  onClick={handleLogout}
                  className="px-2.5 py-1 text-xs text-rose-600 bg-rose-50 hover:bg-rose-100 rounded-lg flex items-center gap-1 font-medium transition-colors"
                >
                  <LogOut className="h-3.5 w-3.5" />
                  Sign Out
                </button>
              </div>
            )}

            <div className="pt-3 border-t border-stone-100 text-[10px] text-stone-400 text-center">
              MST Tengapal © {new Date().getFullYear()}
            </div>
          </div>
        </div>
      )}

      {/* Persistent Mobile Bottom Navigation Bar */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-stone-200 px-2 pt-1.5 pb-[calc(0.375rem+env(safe-area-inset-bottom))] flex items-center justify-around shadow-lg">
        <NavLink
          to="/"
          end
          className={({ isActive }) =>
            cn(
              'flex flex-col items-center gap-1 py-1 px-3 text-[10px] font-semibold transition-colors',
              isActive ? 'text-brand-primary' : 'text-stone-400',
            )
          }
        >
          <LayoutDashboard className="h-5 w-5" />
          <span>Overview</span>
        </NavLink>

        <NavLink
          to="/assistant"
          className={({ isActive }) =>
            cn(
              'flex flex-col items-center gap-1 py-1 px-3.5 rounded-xl transition-all',
              isActive
                ? 'bg-brand-primary text-white -translate-y-1 shadow-md'
                : 'bg-brand-accent/50 text-brand-dark -translate-y-1',
            )
          }
        >
          <Bot className="h-5 w-5" />
          <span className="text-[10px] font-bold">AI Chat</span>
        </NavLink>

        <NavLink
          to="/deliveries"
          className={({ isActive }) =>
            cn(
              'flex flex-col items-center gap-1 py-1 px-3 text-[10px] font-semibold transition-colors',
              isActive ? 'text-brand-primary' : 'text-stone-400',
            )
          }
        >
          <Truck className="h-5 w-5" />
          <span>Deliveries</span>
        </NavLink>

        <NavLink
          to="/customers"
          className={({ isActive }) =>
            cn(
              'flex flex-col items-center gap-1 py-1 px-3 text-[10px] font-semibold transition-colors',
              isActive ? 'text-brand-primary' : 'text-stone-400',
            )
          }
        >
          <Users className="h-5 w-5" />
          <span>Customers</span>
        </NavLink>
      </div>
    </>
  );
}
