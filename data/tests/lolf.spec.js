import { describe, it, expect } from 'vitest';
import { buildTree } from '../src/lolf';
describe('lolf.buildTree', () => {
    it('aggregates and sorts children by CP desc', () => {
        const rows = [
            { mission_code: '100', mission: 'M1', programme_code: '101', programme: 'P1', action_code: '1', action: 'A1', ae: 10, cp: 20 },
            { mission_code: '100', mission: 'M1', programme_code: '101', programme: 'P1', action_code: '2', action: 'A2', ae: 30, cp: 10 },
            { mission_code: '200', mission: 'M2', programme_code: '201', programme: 'P2', action_code: '1', action: 'A1', ae: 5, cp: 5 },
        ];
        const tree = buildTree(rows, 2025);
        expect(tree.cp).toBe(35);
        const m1 = tree.children?.find((c) => c.code === '100');
        expect(m1.cp).toBe(30);
        const p1 = m1.children?.[0];
        expect(p1.code).toBe('101');
        expect(p1.children?.map((c) => c.name)).toEqual(['A1', 'A2']);
    });
});
