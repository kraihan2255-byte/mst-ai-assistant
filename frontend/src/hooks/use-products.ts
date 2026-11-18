import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  productsApi,
  type AddPricePayload,
  type CreateProductPayload,
} from '../lib/api-client';

export function useProducts(activeOnly = true) {
  return useQuery({
    queryKey: ['products', activeOnly],
    queryFn: () => productsApi.getAll(activeOnly),
  });
}

export function useProductPriceHistory(productId: string) {
  return useQuery({
    queryKey: ['product-prices', productId],
    queryFn: () => productsApi.getPriceHistory(productId),
    enabled: Boolean(productId),
  });
}

export function useCreateProduct() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateProductPayload) => productsApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
    },
  });
}

export function useAddPrice(productId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: AddPricePayload) => productsApi.addPrice(productId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['product-prices', productId] });
    },
  });
}
