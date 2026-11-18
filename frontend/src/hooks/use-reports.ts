import { useQuery } from '@tanstack/react-query';
import { reportsApi } from '../lib/api-client';

export function useReportSummary(params?: { startDate?: string; endDate?: string }) {
  return useQuery({
    queryKey: ['reports', 'summary', params],
    queryFn: () => reportsApi.getSummary(params),
  });
}

export function useReportOutstanding() {
  return useQuery({
    queryKey: ['reports', 'outstanding'],
    queryFn: reportsApi.getOutstanding,
  });
}

export function useReportDeliveries(params?: { startDate?: string; endDate?: string }) {
  return useQuery({
    queryKey: ['reports', 'deliveries', params],
    queryFn: () => reportsApi.getDeliveries(params),
  });
}

export function useReportPayments(params?: { startDate?: string; endDate?: string }) {
  return useQuery({
    queryKey: ['reports', 'payments', params],
    queryFn: () => reportsApi.getPayments(params),
  });
}
