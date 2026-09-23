// Regression: the 24hr rainfall total and the 24hr rainfall chart issue the same
// request and must share one cache entry rather than fetching it twice.
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { createElement as h } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useRainfall24hr, useHistoricalMeasurements } from './useMeasurements';
import { apiGet } from '../api/client';

vi.mock('../api/client', () => ({ apiGet: vi.fn() }));

let client: QueryClient;
beforeEach(() => {
  vi.mocked(apiGet).mockReset().mockResolvedValue({ data: [] });
  client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: Infinity } } });
});
afterEach(() => client.clear());

function render(child: ReturnType<typeof h>) {
  return renderToStaticMarkup(h(QueryClientProvider, { client }, child));
}

it('shares one request between the 24hr rainfall total and the 24hr rainfall chart', async () => {
  // Both issue the identical request; they used to sit under separate keys, so a
  // detail page showing rainfall fetched the same 24h series twice.
  function Consumers() {
    useRainfall24hr('A');
    useHistoricalMeasurements('A', 'RF_1_Tot300s', '24h');
    return null;
  }
  render(h(Consumers));
  const queries = client.getQueryCache().getAll().filter(q => q.queryKey[0] === 'measurements');
  await Promise.all(queries.map(q => client.fetchQuery({ ...q.options, queryKey: q.queryKey })));
  expect(vi.mocked(apiGet).mock.calls.length).toBe(1);
});
