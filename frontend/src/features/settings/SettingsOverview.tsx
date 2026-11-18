import { useState, useEffect } from 'react';
import {
  Cpu,
  Server,
  RefreshCw,
  Lock,
  Smartphone,
  CheckCircle2,
  Share2,
  PlusSquare,
  Zap,
} from 'lucide-react';
import { Card, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { useHealth } from '../../hooks/use-health';

export function SettingsOverview() {
  const { data: health, isLoading, refetch, isFetching } = useHealth();
  const [autoUnlockEnabled, setAutoUnlockEnabled] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setAutoUnlockEnabled(localStorage.getItem('mst_auto_unlock') === 'true');
    }
  }, []);

  const toggleAutoUnlock = () => {
    const nextState = !autoUnlockEnabled;
    setAutoUnlockEnabled(nextState);
    if (nextState) {
      localStorage.setItem('mst_auto_unlock', 'true');
    } else {
      localStorage.removeItem('mst_auto_unlock');
    }
  };

  const isOllamaReachable = health?.ollama.status === 'reachable';
  const isHealthy = health?.status === 'ok';

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-extrabold text-brand-dark tracking-tight">
            System & Environment Settings
          </h2>
          <p className="text-xs text-stone-500 mt-0.5">
            Diagnostic status of your local NestJS backend and Ollama LLM runtime
          </p>
        </div>

        <Button
          onClick={() => refetch()}
          variant="outline"
          size="sm"
          isLoading={isFetching}
        >
          <RefreshCw className="h-3.5 w-3.5 mr-1" /> Refresh Status
        </Button>
      </div>

      {isLoading && !health ? (
        <LoadingSpinner label="Inspecting system health..." />
      ) : (
        <div className="space-y-6">
          {/* Main Status Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Backend NestJS Service */}
            <Card padding="md">
              <div className="flex items-start justify-between pb-3 border-b border-stone-100">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-teal-50 text-brand-primary">
                    <Server className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-brand-dark">
                      NestJS Backend API
                    </h3>
                    <p className="text-[11px] text-stone-400">
                      http://localhost:3000/api
                    </p>
                  </div>
                </div>
                <Badge variant={isHealthy ? 'success' : 'danger'} size="sm">
                  {isHealthy ? 'Online' : 'Unavailable'}
                </Badge>
              </div>

              <div className="mt-4 space-y-2.5 text-xs text-stone-600">
                <div className="flex justify-between py-1 border-b border-stone-100">
                  <span className="text-stone-400">Service:</span>
                  <span className="font-semibold">{health?.service || 'mst-tengapal-backend'}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-stone-100">
                  <span className="text-stone-400">Uptime:</span>
                  <span className="font-mono">{health?.uptimeSeconds || 0} seconds</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-stone-400">Database Engine:</span>
                  <span className="font-semibold text-stone-800">PostgreSQL (Prisma ORM)</span>
                </div>
              </div>
            </Card>

            {/* Ollama Local AI */}
            <Card padding="md">
              <div className="flex items-start justify-between pb-3 border-b border-stone-100">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-teal-50 text-brand-primary">
                    <Cpu className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-brand-dark">
                      Ollama Local AI Runtime
                    </h3>
                    <p className="text-[11px] text-stone-400">
                      {health?.ollama.baseUrl || 'http://localhost:11434'}
                    </p>
                  </div>
                </div>
                <Badge variant={isOllamaReachable ? 'success' : 'danger'} size="sm">
                  {isOllamaReachable ? 'Reachable' : 'Offline'}
                </Badge>
              </div>

              <div className="mt-4 space-y-2.5 text-xs text-stone-600">
                <div className="flex justify-between py-1 border-b border-stone-100">
                  <span className="text-stone-400">Configured Model:</span>
                  <span className="font-mono font-bold text-brand-primary">
                    {health?.ollama.model || 'qwen3:4b'}
                  </span>
                </div>
                <div className="flex justify-between py-1 border-b border-stone-100">
                  <span className="text-stone-400">Model Loaded:</span>
                  <span className="font-semibold">
                    {health?.ollama.modelAvailable ? '✅ Ready on disk' : '❌ Not downloaded'}
                  </span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-stone-400">Roundtrip Latency:</span>
                  <span className="font-mono">{health?.ollama.latencyMs || 0} ms</span>
                </div>
              </div>
            </Card>
          </div>

          {/* Privacy & Financial Architecture Notice */}
          <Card padding="md" className="bg-brand-bg border-teal-200">
            <div className="flex items-start gap-3">
              <div className="p-2.5 rounded-xl bg-teal-100/60 text-brand-primary shrink-0 mt-0.5">
                <Lock className="h-5 w-5" />
              </div>
              <div className="space-y-2 text-xs text-stone-600">
                <h4 className="font-bold text-sm text-brand-dark">
                  On-Device Privacy & Financial Determinism Guarantee
                </h4>
                <p className="leading-relaxed">
                  • <strong>Zero External AI APIs</strong>: All inference runs strictly on your Apple Silicon hardware via Ollama. No business transaction or customer balance is ever transmitted to OpenAI, Gemini, or third-party servers.
                </p>
                <p className="leading-relaxed">
                  • <strong>Deterministic Accounting</strong>: Calculations, balances, line item prices, and status assignments are enforced exclusively by PostgreSQL and backend TypeScript services. The AI is restricted to conversational text extraction and cannot write directly to the database without explicit user confirmation.
                </p>
                <p className="leading-relaxed">
                  • <strong>Integer Paise Precision</strong>: Monetary values are represented in whole integer paise (<code className="bg-stone-200 px-1 py-0.5 rounded">₹1 = 100 paise</code>) across the database and persistence layer.
                </p>
              </div>
            </div>
          </Card>

          {/* Mobile Standalone Web App & Quick Passcode Access */}
          <Card padding="md" className="border-emerald-200 bg-white">
            <div className="flex items-start justify-between pb-3 border-b border-stone-100">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-emerald-50 text-emerald-700">
                  <Smartphone className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-brand-dark">
                    Mobile Standalone App & Fast Passcode Access
                  </h3>
                  <p className="text-[11px] text-stone-500">
                    Standalone iPhone full-screen experience and zero-friction unlocking
                  </p>
                </div>
              </div>
              <Badge variant="success" size="sm">
                PWA Ready
              </Badge>
            </div>

            <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-3.5 rounded-xl bg-stone-50 border border-stone-200/70 space-y-2.5 text-xs text-stone-600">
                <div className="flex items-center justify-between font-semibold text-brand-dark">
                  <span>Quick Access Configuration</span>
                  <span className="font-mono text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded text-[11px]">
                    PIN: 1234
                  </span>
                </div>
                <p className="text-[11px] text-stone-500">
                  Use the 4-digit numeric keypad on mobile or tap One-Tap Quick Unlock to bypass typing usernames and passwords.
                </p>
                <div className="pt-2 border-t border-stone-200/50 flex items-center justify-between">
                  <span className="text-stone-700 font-medium">Auto-Unlock on This Device:</span>
                  <Button
                    size="sm"
                    variant={autoUnlockEnabled ? 'primary' : 'outline'}
                    onClick={toggleAutoUnlock}
                    className="h-7 text-xs px-2.5"
                  >
                    {autoUnlockEnabled ? (
                      <>
                        <CheckCircle2 className="h-3 w-3 mr-1" /> Enabled
                      </>
                    ) : (
                      <>
                        <Zap className="h-3 w-3 mr-1" /> Enable Auto-Unlock
                      </>
                    )}
                  </Button>
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-teal-50/50 border border-teal-100 space-y-2 text-xs text-stone-700">
                <h4 className="font-bold text-teal-900 flex items-center gap-1.5">
                  <PlusSquare className="h-4 w-4 text-brand-primary" />
                  Install Standalone App on iPhone
                </h4>
                <ol className="list-decimal list-inside space-y-1 text-[11px] text-stone-600">
                  <li>Open private URL in Safari on iPhone.</li>
                  <li>Tap the <strong>Share</strong> icon <Share2 className="inline h-3 w-3 mx-0.5" /> in Safari.</li>
                  <li>Select <strong>Add to Home Screen</strong>.</li>
                  <li>Tap <strong>Add</strong> at top right.</li>
                  <li>Launches full-screen with no browser navigation bars!</li>
                </ol>
              </div>
            </div>
          </Card>

          {/* Connection Documentation */}
          <Card padding="md">
            <CardTitle>Local Development Ports</CardTitle>
            <div className="mt-3 text-xs space-y-2 text-stone-600">
              <div className="flex items-center justify-between p-2.5 rounded-lg bg-stone-50 border border-stone-200/60">
                <span>React + Vite Frontend:</span>
                <span className="font-mono font-bold text-brand-dark">http://localhost:5173</span>
              </div>
              <div className="flex items-center justify-between p-2.5 rounded-lg bg-stone-50 border border-stone-200/60">
                <span>NestJS Backend API:</span>
                <span className="font-mono font-bold text-brand-dark">http://localhost:3000/api</span>
              </div>
              <div className="flex items-center justify-between p-2.5 rounded-lg bg-stone-50 border border-stone-200/60">
                <span>Ollama Engine:</span>
                <span className="font-mono font-bold text-brand-dark">http://localhost:11434</span>
              </div>
              <div className="flex items-center justify-between p-2.5 rounded-lg bg-stone-50 border border-stone-200/60">
                <span>PostgreSQL Database:</span>
                <span className="font-mono font-bold text-brand-dark">localhost:5432 (mst_tengapal)</span>
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
