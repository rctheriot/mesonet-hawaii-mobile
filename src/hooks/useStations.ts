import { useQuery } from '@tanstack/react-query';
import { fetchStations } from '../api/stations';

export function useStations() {
  return useQuery({
    queryKey: ['stations'],
    queryFn: ({ signal }) => fetchStations(signal),
    staleTime: 1000 * 60 * 10, // 10 minutes
  });
}
