import { apiGet } from './client';

export interface VariableInfo {
  units: string;
  display_name: string;
}

// Variable metadata (units, display name) keyed by standard_name — the same IDs
// used as map modes (e.g. Tair_1_Avg). Fetched once and cached for the session so
// the high-volume measurement queries can drop the expensive join_metadata flag
// and source units from here instead.
export async function fetchVariables(): Promise<Map<string, VariableInfo>> {
  const { data } = await apiGet<Record<string, unknown>[] | Record<string, Record<string, unknown>>>(
    '/mesonet/db/variables',
    { location: 'hawaii', limit: 1000 }
  );
  const rows = Array.isArray(data) ? data : Object.values(data);
  const map = new Map<string, VariableInfo>();
  for (const r of rows) {
    const name = r.standard_name as string | undefined;
    if (!name) continue;
    map.set(name, {
      units: (r.units as string) ?? '',
      display_name: (r.display_name as string) ?? '',
    });
  }
  return map;
}
