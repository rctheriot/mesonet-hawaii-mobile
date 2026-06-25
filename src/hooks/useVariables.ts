import { useQuery } from '@tanstack/react-query';
import { fetchVariables } from '../api/variables';

// Variable metadata is effectively static, so fetch once and keep it forever.
export function useVariables() {
  return useQuery({
    queryKey: ['variables'],
    queryFn: fetchVariables,
    staleTime: Infinity,
    gcTime: Infinity,
  });
}
