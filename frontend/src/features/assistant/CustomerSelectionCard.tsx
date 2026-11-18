import React from 'react';
import { UserCheck, MapPin, Phone } from 'lucide-react';
import { Button } from '../../components/ui/button';
import type { MatchedCustomerSummary } from '../../types/api';

export interface CustomerSelectionCardProps {
  candidates: MatchedCustomerSummary[];
  onSelect: (customer: MatchedCustomerSummary) => void;
  onCancel?: () => void;
}

export function CustomerSelectionCard({
  candidates,
  onSelect,
  onCancel,
}: CustomerSelectionCardProps) {
  return (
    <div className="rounded-2xl border border-amber-200 bg-amber-50/40 p-4 shadow-sm max-w-lg w-full text-brand-dark animate-in fade-in duration-150">
      <div className="flex items-center gap-2 pb-2 border-b border-amber-200/60 text-amber-900 font-bold text-sm">
        <UserCheck className="h-4 w-4 text-amber-700" />
        <span>Multiple Customers Found — Please Select One</span>
      </div>
      <p className="text-xs text-stone-600 mt-2 mb-3">
        Multiple customer accounts match this name. Select the exact customer to associate with this delivery:
      </p>

      <div className="space-y-2">
        {candidates.map((c) => (
          <button
            key={c.id}
            onClick={() => onSelect(c)}
            className="w-full flex items-center justify-between p-3 rounded-xl bg-white border border-stone-200 hover:border-brand-primary hover:bg-teal-50/40 transition-all text-left group"
          >
            <div>
              <div className="font-bold text-sm text-brand-dark group-hover:text-brand-primary">
                {c.name}
              </div>
              <div className="flex items-center gap-3 mt-1 text-xs text-stone-500">
                {c.area && (
                  <span className="flex items-center gap-1">
                    <MapPin className="h-3 w-3 text-stone-400" /> {c.area}
                  </span>
                )}
                {c.phone && (
                  <span className="flex items-center gap-1">
                    <Phone className="h-3 w-3 text-stone-400" /> {c.phone}
                  </span>
                )}
              </div>
            </div>
            <span className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-stone-100 group-hover:bg-brand-primary group-hover:text-white transition-colors">
              Select
            </span>
          </button>
        ))}
      </div>

      {onCancel && (
        <div className="mt-3 pt-2 text-right border-t border-amber-200/50">
          <Button onClick={onCancel} variant="ghost" size="sm">
            Cancel
          </Button>
        </div>
      )}
    </div>
  );
}
