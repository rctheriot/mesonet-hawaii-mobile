import { apiGet } from './client';
import type { Variable } from '../types/api';

export async function fetchVariables(): Promise<Variable[]> {
  const { data } = await apiGet<Variable[] | Record<string, Variable>>(
    '/mesonet/db/variables',
    { location: 'hawaii', limit: 1000 }
  );
  if (Array.isArray(data)) return data;
  return Object.values(data);
}
