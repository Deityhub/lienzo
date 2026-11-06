import { describe, expect, it } from 'vitest';
import {
	matchWeight,
	parseWeight,
	resolveFont,
	standardFont,
	type FontManifest
} from './fontResolver';

const manifest: FontManifest = {
	Lato: {
		normal: {
			'100': 'lato-100',
			'300': 'lato-300',
			'400': 'lato-400',
			'700': 'lato-700',
			'900': 'lato-900'
		},
		italic: { '400': 'lato-i-400', '700': 'lato-i-700' }
	},
	Oswald: { normal: { '400': 'oswald-400', '700': 'oswald-700' } }
};

describe('parseWeight', () => {
	it('reads numbers and keywords, defaulting to regular', () => {
		expect(parseWeight('600')).toBe(600);
		expect(parseWeight('bold')).toBe(700);
		expect(parseWeight('normal')).toBe(400);
		expect(parseWeight(undefined)).toBe(400);
	});
});

describe('matchWeight (CSS font matching)', () => {
	const lato = [100, 300, 400, 700, 900];

	it('uses an exact match', () => expect(matchWeight(lato, 700)).toBe(700));
	it('prefers lighter weights, then heavier, below 400', () => {
		expect(matchWeight(lato, 200)).toBe(100);
		expect(matchWeight([400, 700], 200)).toBe(400);
	});
	it('prefers heavier weights, then lighter, above 500', () => {
		expect(matchWeight(lato, 800)).toBe(900);
		expect(matchWeight(lato, 600)).toBe(700);
		expect(matchWeight([100, 400], 800)).toBe(400);
	});
	it('400 looks at 500 first and 500 at 400 first', () => {
		expect(matchWeight([300, 500, 700], 400)).toBe(500);
		expect(matchWeight([300, 400, 700], 500)).toBe(400);
		expect(matchWeight([300, 700], 500)).toBe(300);
	});
	it('returns null when there are no weights', () => expect(matchWeight([], 400)).toBeNull());
});

describe('standardFont', () => {
	it('maps system families and styles to the built-in fonts', () => {
		expect(standardFont('Arial', 400, 'normal')).toBe('Helvetica');
		expect(standardFont('Georgia', 700, 'italic')).toBe('Times-BoldItalic');
		expect(standardFont('Courier New', 400, 'italic')).toBe('Courier-Oblique');
		expect(standardFont('Unknown', 600, 'normal')).toBe('Helvetica-Bold');
	});
});

describe('resolveFont', () => {
	it('finds the file for the family, weight and style', () => {
		expect(resolveFont(manifest, 'Lato', '700', 'italic')).toEqual({
			kind: 'file',
			file: 'lato-i-700'
		});
	});
	it('matches the weight the browser would pick', () => {
		expect(resolveFont(manifest, 'Lato', '800', 'normal')).toEqual({
			kind: 'file',
			file: 'lato-900'
		});
		expect(resolveFont(manifest, 'Lato', '200', 'italic')).toEqual({
			kind: 'file',
			file: 'lato-i-400'
		});
	});
	it('shows upright text for families without italics', () => {
		expect(resolveFont(manifest, 'Oswald', '700', 'italic')).toEqual({
			kind: 'file',
			file: 'oswald-700'
		});
	});
	it('falls back to a built-in font for other families', () => {
		expect(resolveFont(manifest, 'Arial', '700', 'normal')).toEqual({
			kind: 'standard',
			name: 'Helvetica-Bold'
		});
	});
});
