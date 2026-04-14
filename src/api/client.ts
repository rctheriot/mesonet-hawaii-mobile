const BASE_URL = 'https://api.hcdp.ikewai.org';
const AUTH_HEADER = `Bearer ${import.meta.env.VITE_MESONET_API_KEY}`;

export async function apiGet<T = unknown>(
  path: string,
  params?: Record<string, string | number | boolean>
): Promise<{ data: T }> {
  const url = new URL(path, BASE_URL);
  if (params) {
    for (const [key, value] of Object.entries(params)) {
      url.searchParams.set(key, String(value));
    }
  }
  const response = await fetch(url.toString(), {
    headers: { Authorization: AUTH_HEADER },
  });
  if (!response.ok) {
    throw new Error(`API error ${response.status}: ${response.statusText}`);
  }
  const data = (await response.json()) as T;
  return { data };
}
