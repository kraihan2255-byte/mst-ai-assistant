import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  deliveriesApi,
  type ConfirmDeliveryPayload,
  type RecordPaymentPayload,
} from '../lib/api-client';

export function useDeliveries(params?: {
  customerId?: string;
  startDate?: string;
  endDate?: string;
  paymentStatus?: string;
}) {
  return useQuery({
    queryKey: ['deliveries', params],
    queryFn: () => deliveriesApi.getAll(params),
  });
}

export function useDelivery(id: string) {
  return useQuery({
    queryKey: ['delivery', id],
    queryFn: () => deliveriesApi.getOne(id),
    enabled: Boolean(id),
  });
}

export function useConfirmDelivery() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: ConfirmDeliveryPayload) => deliveriesApi.confirm(data),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['deliveries'] });
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      queryClient.invalidateQueries({ queryKey: ['customer-balance', data.customerId] });
      queryClient.invalidateQueries({ queryKey: ['customer-deliveries', data.customerId] });
      queryClient.invalidateQueries({ queryKey: ['reports'] });
    },
  });
}

export function useRecordPayment(deliveryId?: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: RecordPaymentPayload }) =>
      deliveriesApi.recordPayment(id, payload),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['deliveries'] });
      if (deliveryId) {
        queryClient.invalidateQueries({ queryKey: ['delivery', deliveryId] });
      }
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      queryClient.invalidateQueries({ queryKey: ['customer-balance', data.customerId] });
      queryClient.invalidateQueries({ queryKey: ['customer-deliveries', data.customerId] });
      queryClient.invalidateQueries({ queryKey: ['reports'] });
    },
  });
}
