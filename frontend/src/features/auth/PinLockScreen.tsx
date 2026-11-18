import { useState, useEffect, useCallback } from 'react';
import { Delete, Zap, Lock, ShieldCheck, KeyRound, AlertCircle } from 'lucide-react';
import { useAuth } from './AuthContext';
import { Button } from '../../components/ui/button';

interface PinLockScreenProps {
  onSwitchToPassword: () => void;
  onSuccess: () => void;
}

export function PinLockScreen({ onSwitchToPassword, onSuccess }: PinLockScreenProps) {
  const { pinLogin, quickUnlock } = useAuth();
  const [pin, setPin] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [rememberDevice, setRememberDevice] = useState(true);

  const submitPin = useCallback(
    async (codeToSubmit: string) => {
      if (isSubmitting) return;
      setError(null);
      setIsSubmitting(true);
      try {
        await pinLogin(codeToSubmit, rememberDevice);
        onSuccess();
      } catch (err: unknown) {
        setPin('');
        const msg = err instanceof Error ? err.message : 'Incorrect passcode PIN. Please try again.';
        setError(msg);
      } finally {
        setIsSubmitting(false);
      }
    },
    [isSubmitting, pinLogin, rememberDevice, onSuccess],
  );

  const handleQuickUnlock = async () => {
    if (isSubmitting) return;
    setError(null);
    setIsSubmitting(true);
    try {
      await quickUnlock(rememberDevice);
      onSuccess();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Quick unlock failed. Please use your PIN or password.';
      setError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleKeyPress = (digit: string) => {
    if (isSubmitting) return;
    setError(null);
    if (pin.length < 4) {
      const newPin = pin + digit;
      setPin(newPin);
      if (newPin.length === 4) {
        submitPin(newPin);
      }
    }
  };

  const handleDelete = () => {
    if (isSubmitting) return;
    setError(null);
    setPin((prev) => prev.slice(0, -1));
  };

  // Support hardware/desktop keyboard
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (/^[0-9]$/.test(e.key)) {
        e.preventDefault();
        handleKeyPress(e.key);
      } else if (e.key === 'Backspace') {
        e.preventDefault();
        handleDelete();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  });

  return (
    <div className="flex flex-col items-center justify-between min-h-[90vh] py-4 max-w-sm mx-auto select-none">
      {/* Brand Header */}
      <div className="text-center w-full pt-2">
        <div className="flex justify-center mb-3">
          <div className="h-16 w-16 rounded-2xl bg-brand-primary flex items-center justify-center shadow-lg shadow-brand-primary/25 border-2 border-emerald-400/20">
            <svg viewBox="0 0 24 24" width="34" height="34" fill="none" stroke="#FFFFFF" strokeWidth="2.2">
              <circle cx="12" cy="12" r="9" />
              <path d="M12 3a9 9 0 0 1 9 9" />
              <circle cx="9" cy="10" r="1.2" fill="#FFFFFF" />
              <circle cx="15" cy="10" r="1.2" fill="#FFFFFF" />
              <circle cx="12" cy="14" r="1.2" fill="#FFFFFF" />
            </svg>
          </div>
        </div>
        <h1 className="text-2xl font-extrabold tracking-tight text-brand-dark">
          MST Tengapal
        </h1>
        <p className="text-xs font-medium text-stone-500 mt-1">
          Business Assistant • Coconut Milk Management
        </p>
      </div>

      {/* PIN Dots Indicator */}
      <div className="w-full my-4 flex flex-col items-center">
        <p className="text-xs font-semibold text-stone-600 mb-4 flex items-center gap-1.5">
          <Lock className="w-3.5 h-3.5 text-brand-primary" />
          Enter 4-digit Passcode
        </p>

        <div className="flex items-center gap-4 justify-center">
          {[0, 1, 2, 3].map((index) => {
            const isFilled = pin.length > index;
            return (
              <div
                key={index}
                className={`w-4 h-4 rounded-full transition-all duration-200 ${
                  isFilled
                    ? 'bg-brand-primary scale-125 shadow-md shadow-brand-primary/30 ring-2 ring-emerald-300'
                    : 'bg-stone-200 border border-stone-300'
                }`}
              />
            );
          })}
        </div>

        {error && (
          <div className="mt-3.5 p-2 px-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2 animate-in fade-in">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
            <span>{error}</span>
          </div>
        )}

        {isSubmitting && !error && (
          <p className="mt-3 text-xs text-brand-primary font-medium animate-pulse">
            Unlocking assistant...
          </p>
        )}
      </div>

      {/* Numeric Keypad */}
      <div className="w-full px-4">
        <div className="grid grid-cols-3 gap-3 sm:gap-4 max-w-[280px] mx-auto">
          {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digit) => (
            <button
              key={digit}
              type="button"
              onClick={() => handleKeyPress(digit)}
              disabled={isSubmitting}
              className="h-15 w-15 sm:h-16 sm:w-16 rounded-full bg-white border border-stone-200/90 shadow-sm text-2xl font-bold text-stone-800 active:bg-brand-primary active:text-white active:scale-95 transition-all flex items-center justify-center mx-auto focus:outline-none focus:ring-2 focus:ring-brand-primary/40"
            >
              {digit}
            </button>
          ))}

          {/* Bottom Row: Clear / Zero / Backspace */}
          <button
            type="button"
            onClick={() => {
              setPin('');
              setError(null);
            }}
            disabled={isSubmitting || pin.length === 0}
            className="h-15 w-15 sm:h-16 sm:w-16 rounded-full text-xs font-semibold text-stone-500 active:bg-stone-100 transition-all flex items-center justify-center mx-auto disabled:opacity-20"
          >
            Clear
          </button>

          <button
            type="button"
            onClick={() => handleKeyPress('0')}
            disabled={isSubmitting}
            className="h-15 w-15 sm:h-16 sm:w-16 rounded-full bg-white border border-stone-200/90 shadow-sm text-2xl font-bold text-stone-800 active:bg-brand-primary active:text-white active:scale-95 transition-all flex items-center justify-center mx-auto focus:outline-none focus:ring-2 focus:ring-brand-primary/40"
          >
            0
          </button>

          <button
            type="button"
            onClick={handleDelete}
            disabled={isSubmitting || pin.length === 0}
            className="h-15 w-15 sm:h-16 sm:w-16 rounded-full bg-stone-100 border border-stone-200 text-stone-700 active:bg-stone-200 active:scale-95 transition-all flex items-center justify-center mx-auto focus:outline-none disabled:opacity-30"
          >
            <Delete className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Quick Unlock One-Tap Option & Remember Device */}
      <div className="w-full px-6 mt-4 space-y-3">
        <Button
          type="button"
          onClick={handleQuickUnlock}
          disabled={isSubmitting}
          className="w-full h-11 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-md shadow-emerald-600/20 flex items-center justify-center gap-2 text-sm"
        >
          <Zap className="w-4 h-4 fill-amber-300 text-amber-300" />
          <span>⚡ One-Tap Quick Unlock</span>
        </Button>

        <div className="flex items-center justify-between text-xs text-stone-600 px-1">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={rememberDevice}
              onChange={(e) => setRememberDevice(e.target.checked)}
              className="rounded text-brand-primary focus:ring-brand-primary h-3.5 w-3.5"
            />
            <span>Keep this phone unlocked</span>
          </label>
          <span className="text-[11px] text-stone-400">Default PIN: 1234</span>
        </div>
      </div>

      {/* Switch to Password or Security Footer */}
      <div className="w-full pt-4 border-t border-stone-200/60 mt-3 flex flex-col items-center gap-2">
        <button
          type="button"
          onClick={onSwitchToPassword}
          className="text-xs font-semibold text-brand-primary hover:text-brand-dark flex items-center gap-1.5 py-1 px-3 rounded-lg hover:bg-stone-100 transition-colors"
        >
          <KeyRound className="w-3.5 h-3.5" />
          <span>Use Admin Password Instead</span>
        </button>

        <div className="flex items-center gap-1 text-[11px] text-stone-400">
          <ShieldCheck className="w-3 h-3 text-emerald-600" />
          <span>Protected private network connection</span>
        </div>
      </div>
    </div>
  );
}
