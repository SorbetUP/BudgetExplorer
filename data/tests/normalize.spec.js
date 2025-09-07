import { describe, it, expect } from 'vitest';
import { lowerKeys, parseNumberFR, normalizeRow } from '../src/normalize';
describe('normalize.lowerKeys', () => {
    it('lowercases keys', () => {
        expect(lowerKeys({ A: 1, b: 2 })).toEqual({ a: 1, b: 2 });
    });
});
describe('normalize.parseNumberFR', () => {
    it('parses french formatted numbers', () => {
        expect(parseNumberFR('1 234,56')).toBeCloseTo(1234.56);
        expect(parseNumberFR('1\u00A0234,56')).toBeCloseTo(1234.56);
        expect(parseNumberFR('12.345,00')).toBeCloseTo(12345);
    });
});
describe('normalize.normalizeRow', () => {
    it('maps aliases and defaults amounts', () => {
        const row = normalizeRow({
            CODE_MISSION: '129',
            INTITULE_MISSION: 'Education',
            programme_code: '140',
            intitule_programme: 'Enseignement',
            code_action: '01',
            intitule_action: 'Premier degré',
            mnt_ae: '1 000,00',
            mnt_cp: '800,00',
        });
        expect(row).toMatchObject({
            mission_code: '129',
            mission: 'Education',
            programme_code: '140',
            programme: 'Enseignement',
            action_code: '01',
            action: 'Premier degré',
            ae: 1000,
            cp: 800,
        });
    });
});
