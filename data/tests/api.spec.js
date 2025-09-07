import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fetchPagedRecords } from '../src/api';
describe('api.fetchPagedRecords', () => {
    beforeEach(() => {
        vi.restoreAllMocks();
    });
    it('paginates until empty batch', async () => {
        const calls = [];
        // @ts-ignore
        global.fetch = vi.fn(async (url) => {
            calls.push(url);
            const u = new URL(url);
            const offset = Number(u.searchParams.get('offset') || '0');
            const limit = Number(u.searchParams.get('limit') || '100');
            const remaining = Math.max(0, 250 - offset);
            const size = Math.min(limit, remaining);
            const results = Array.from({ length: size }, (_, i) => ({ id: String(offset + i), fields: { n: offset + i } }));
            return new Response(JSON.stringify({ results }), { status: 200 });
        });
        const recs = await fetchPagedRecords({ domain: 'https://example.com', dataset: 'ds', limit: 100, pauseMs: 0 });
        expect(recs.length).toBe(250);
        expect(calls.length).toBe(3);
    });
});
