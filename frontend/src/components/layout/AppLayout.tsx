import React, { useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { MobileNav } from './MobileNav';
import { cn } from '../../lib/utils';

export function AppLayout() {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const location = useLocation();
  const isAssistant = location.pathname === '/assistant';

  return (
    <div className="flex min-h-screen bg-brand-bg text-brand-dark">
      {/* Desktop Sidebar */}
      <Sidebar />

      {/* Main Content Area */}
      <div className="flex flex-1 flex-col min-w-0">
        <Header onToggleMobileNav={() => setMobileNavOpen(true)} />
        <main
          className={cn(
            'flex-1 max-w-7xl w-full mx-auto pb-[calc(5rem+env(safe-area-inset-bottom))] lg:pb-8',
            isAssistant ? 'p-0 sm:p-6 lg:p-8' : 'p-3 sm:p-6 lg:p-8',
          )}
        >
          <Outlet />
        </main>
      </div>

      {/* Mobile Navigation */}
      <MobileNav
        isOpen={mobileNavOpen}
        onClose={() => setMobileNavOpen(false)}
      />
    </div>
  );
}
