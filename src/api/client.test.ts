import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { apiGet } from './client';

// fetch that never resolves on its own — only settles when its signal aborts,
// like a request stuck in one of the API's slow spells.
function hangingFetch() {
  return vi.fn((_url: string, init?: RequestInit) =>
    new Promise<Response>((_resolve, reject) => {
      // Real fetch rejects at once when handed an already-aborted signal.
      if (init?.signal?.aborted) return reject(init.signal.reason);
      init?.signal?.addEventListener('abort', () => reject(init.signal!.reason));
    }),
  );
}

beforeEach(() => { vi.useFakeTimers(); });
afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); });

describe('apiGet cancellation', () => {
  it('aborts the underlying fetch when the caller cancels (e.g. switching map variable)', async () => {
    const fetchMock = hangingFetch();
    vi.stubGlobal('fetch', fetchMock);
    const caller = new AbortController();
    const p = apiGet('/mesonet/db/measurements', { var_ids: 'Tair_1_Avg' }, caller.signal);
    caller.abort(new Error('navigated away'));
    await expect(p).rejects.toThrow('navigated away');
    expect((fetchMock.mock.calls[0][1] as RequestInit).signal!.aborted).toBe(true);
  });

  it('rejects at once when the caller has already cancelled', async () => {
    const fetchMock = hangingFetch();
    vi.stubGlobal('fetch', fetchMock);
    const caller = new AbortController();
    caller.abort(new Error('gone'));
    await expect(apiGet('/x', undefined, caller.signal)).rejects.toThrow('gone');
  });

  it('releases a hung request after the 60s backstop, and not before', async () => {
    vi.stubGlobal('fetch', hangingFetch());
    const p = apiGet('/mesonet/db/measurements');
    const settled = vi.fn();
    p.then(settled, settled);
    // The API's slow-but-successful tail reaches ~44s; those must not become errors.
    await vi.advanceTimersByTimeAsync(45_000);
    expect(settled).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(15_000);
    await expect(p).rejects.toThrow(/timed out/);
  });

  it('returns parsed JSON and clears its timer on success', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify([{ a: 1 }]), { status: 200 })));
    await expect(apiGet('/x')).resolves.toEqual({ data: [{ a: 1 }] });
    expect(vi.getTimerCount()).toBe(0);
  });
});
