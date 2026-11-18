import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from '../lib/query-client';
import { ToastProvider } from '../components/ui/toast';
import { AuthProvider } from '../features/auth/AuthContext';

export function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <ToastProvider>{children}</ToastProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}
