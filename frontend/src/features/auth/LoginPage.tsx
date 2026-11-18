import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Lock, User, Eye, EyeOff, ShieldCheck, AlertCircle, Smartphone } from 'lucide-react';
import { useAuth } from './AuthContext';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { PinLockScreen } from './PinLockScreen';

export function LoginPage({ initialMode = 'pin' }: { initialMode?: 'pin' | 'password' } = {}) {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [mode, setMode] = useState<'pin' | 'password'>(initialMode);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const from = (location.state as { from?: { pathname: string } })?.from?.pathname || '/';

  if (mode === 'pin') {
    return (
      <div className="min-h-screen bg-stone-50 flex flex-col justify-center px-4 py-6">
        <PinLockScreen
          onSwitchToPassword={() => setMode('password')}
          onSuccess={() => navigate(from, { replace: true })}
        />
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!username.trim()) {
      setError('Please enter your username.');
      return;
    }

    if (!password) {
      setError('Please enter your password.');
      return;
    }

    setIsSubmitting(true);
    try {
      await login(username.trim(), password);
      navigate(from, { replace: true });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Invalid credentials. Please try again.';
      setError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-stone-100 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center">
          <div className="h-16 w-16 rounded-2xl bg-brand-primary flex items-center justify-center shadow-lg shadow-brand-primary/20">
            <span className="text-3xl font-extrabold text-white tracking-tight">T</span>
          </div>
        </div>
        <h2 className="mt-4 text-center text-2xl font-bold tracking-tight text-brand-dark">
          MST Tengapal Assistant
        </h2>
        <p className="mt-1 text-center text-sm text-stone-600">
          Sign in to access business deliveries and financial records
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md px-4 sm:px-0">
        <div className="bg-white py-8 px-6 shadow-xl rounded-2xl border border-stone-200/80 sm:px-10">
          <form className="space-y-5" onSubmit={handleSubmit} noValidate>
            {error && (
              <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2.5 animate-in fade-in">
                <AlertCircle className="h-4 w-4 text-rose-600 shrink-0 mt-0.5" />
                <div className="leading-relaxed">
                  <span className="font-semibold block">Authentication Failed</span>
                  {error}
                </div>
              </div>
            )}

            <div>
              <div className="relative">
                <Input
                  label="Username"
                  type="text"
                  placeholder="Enter admin username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  disabled={isSubmitting}
                  autoComplete="username"
                  autoFocus
                  required
                />
                <div className="absolute right-3 top-7 pointer-events-none text-stone-400">
                  <User className="h-4 w-4" />
                </div>
              </div>
            </div>

            <div>
              <div className="relative">
                <Input
                  label="Password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={isSubmitting}
                  autoComplete="current-password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-7 text-stone-400 hover:text-stone-600 focus:outline-none"
                  tabIndex={-1}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>

            <div className="pt-2">
              <Button
                type="submit"
                className="w-full h-11 text-base font-semibold shadow-md shadow-brand-primary/20"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  'Signing in...'
                ) : (
                  <>
                    <Lock className="h-4 w-4 mr-2" />
                    Sign In
                  </>
                )}
              </Button>
            </div>
          </form>

          <div className="mt-4 pt-4 border-t border-stone-100 flex flex-col items-center gap-3">
            <button
              type="button"
              onClick={() => setMode('pin')}
              className="text-xs font-semibold text-brand-primary hover:text-brand-dark flex items-center gap-1.5 py-1.5 px-3 rounded-lg bg-teal-50 hover:bg-teal-100 transition-colors"
            >
              <Smartphone className="w-4 h-4" />
              <span>Switch to Quick Mobile PIN / Passcode</span>
            </button>

            <div className="flex items-center justify-center gap-2 text-xs text-stone-500">
              <ShieldCheck className="h-4 w-4 text-emerald-600 shrink-0" />
              <span>Protected by Argon2id & secure session encryption</span>
            </div>
          </div>
        </div>

        <p className="mt-6 text-center text-xs text-stone-400">
          MST Tengapal Coconut Milk Management • Private Network Access Only
        </p>
      </div>
    </div>
  );
}
