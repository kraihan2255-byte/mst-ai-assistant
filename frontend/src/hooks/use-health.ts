import { useQuery } from '@tanstack/react-query';
import { healthApi } from '../lib/api-client';

export function useHealth() {
  return useQuery({
    queryKey: ['health'],
    queryFn: healthApi.check,
    refetchInterval: 15000, // Poll every 15s to keep connection status fresh
  });
}
