const BASE_URL = 'https://api.hcdp.ikewai.org';
const AUTH_HEADER = `Bearer ${import.meta.env.VITE_MESONET_API_KEY}`;

// Hang backstop, not a latency fix. The HCDP API has a slow tail of successful
// responses (up to 52 s observed on 2026-09-23), so this deliberately sits well
// above that — its only job is to release a connection a request has stopped
// using. Aborting nearer the tail would turn slow-but-successful reads into errors.
const REQUEST_TIMEOUT_MS = 90_000;

export async function apiGet<T = unknown>(
  path: string,
  params?: Record<string, string | number | boolean>,
  // React Query passes its per-query AbortSignal here. Without it, switching map
  // variables mid-request leaves the old fetch running: browsers allow only ~6
  // concurrent connections per origin, so orphaned requests during a slow spell
  // can queue the user's newest request behind reads nothing is waiting for.
  signal?: AbortSignal
): Promise<{ data: T }> {
  const url = new URL(path, BASE_URL);
  if (params) {
    for (const [key, value] of Object.entries(params)) {
      url.searchParams.set(key, String(value));
    }
  }

  // Abort when either the caller cancels or the backstop fires.
  const controller = new AbortController();
  const onCallerAbort = () => controller.abort(signal?.reason);
  if (signal?.aborted) controller.abort(signal.reason);
  else signal?.addEventListener('abort', onCallerAbort, { once: true });
  const timer = setTimeout(
    () => controller.abort(new Error(`API request timed out after ${REQUEST_TIMEOUT_MS}ms: ${path}`)),
    REQUEST_TIMEOUT_MS
  );

  try {
    const response = await fetch(url.toString(), {
      headers: { Authorization: AUTH_HEADER },
      signal: controller.signal,
    });
    if (!response.ok) {
      throw new Error(`API error ${response.status}: ${response.statusText}`);
    }
    const data = (await response.json()) as T;
    return { data };
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener('abort', onCallerAbort);
  }
}
