import { useQuery } from '@tanstack/react-query';
import { fetchStations, fetchStationMonitor } from '../api/stations';
import { fetchVariables } from '../api/variables';

export function useStations() {
  return useQuery({
    queryKey: ['stations'],
    queryFn: fetchStations,
    staleTime: 1000 * 60 * 10, // 10 minutes
  });
}

export function useStationMonitor() {
  return useQuery({
    queryKey: ['stationMonitor'],
    queryFn: fetchStationMonitor,
    staleTime: 1000 * 60 * 2, // 2 minutes
    refetchInterval: 1000 * 60 * 2,
  });
}

export function useVariables() {
  return useQuery({
    queryKey: ['variables'],
    queryFn: fetchVariables,
    staleTime: Infinity, // variable definitions rarely if ever change — fetch once per session
  });
}
