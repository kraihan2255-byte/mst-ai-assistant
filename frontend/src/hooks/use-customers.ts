import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  customersApi,
  type CreateCustomerPayload,
  type UpdateCustomerPayload,
} from '../lib/api-client';

export function useCustomers(params?: { search?: string; phone?: string }) {
  return useQuery({
    queryKey: ['customers', params],
    queryFn: () => customersApi.getAll(params),
  });
}

export function useAreas() {
  return useQuery({
    queryKey: ['areas'],
    queryFn: customersApi.getAreas,
    staleTime: 1000 * 60 * 10, // Areas rarely change
  });
}

export function useCustomer(id: string) {
  return useQuery({
    queryKey: ['customer', id],
    queryFn: () => customersApi.getOne(id),
    enabled: Boolean(id),
  });
}

export function useCustomerBalance(id: string) {
  return useQuery({
    queryKey: ['customer-balance', id],
    queryFn: () => customersApi.getBalance(id),
    enabled: Boolean(id),
  });
}

export function useCustomerDeliveries(id: string) {
  return useQuery({
    queryKey: ['customer-deliveries', id],
    queryFn: () => customersApi.getDeliveries(id),
    enabled: Boolean(id),
  });
}

export function useCreateCustomer() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateCustomerPayload) => customersApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      queryClient.invalidateQueries({ queryKey: ['reports'] });
    },
  });
}

export function useUpdateCustomer(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: UpdateCustomerPayload) => customersApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      queryClient.invalidateQueries({ queryKey: ['customer', id] });
      queryClient.invalidateQueries({ queryKey: ['customer-balance', id] });
    },
  });
}
