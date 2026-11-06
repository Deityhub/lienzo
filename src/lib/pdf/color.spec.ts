import { describe, expect, it } from 'vitest';
import { parseColor } from './color';

describe('parseColor', () => {
	it('reads hex colours', () => {
		expect(parseColor('#ff0000')).toEqual({ r: 1, g: 0, b: 0, a: 1 });
		expect(parseColor('#0f0')).toEqual({ r: 0, g: 1, b: 0, a: 1 });
		expect(parseColor('#0000ff80')?.a).toBeCloseTo(0.5, 2);
	});
	it('reads rgb() and rgba()', () => {
		expect(parseColor('rgb(255, 0, 0)')).toEqual({ r: 1, g: 0, b: 0, a: 1 });
		expect(parseColor('rgba(0, 0, 255, 0.25)')).toEqual({ r: 0, g: 0, b: 1, a: 0.25 });
	});
	it('returns null for anything else', () => {
		expect(parseColor(undefined)).toBeNull();
		expect(parseColor('')).toBeNull();
		expect(parseColor('transparent')).toBeNull();
		expect(parseColor('#12')).toBeNull();
	});
});
