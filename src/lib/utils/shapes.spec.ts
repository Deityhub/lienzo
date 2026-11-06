import { describe, expect, it } from 'vitest';
import { isArrow, polygonPoints, strokeDasharray, svgPolygonPoints } from './shapes';

describe('shapes', () => {
	it('places polygon corners as fractions of the size, inset by half the stroke', () => {
		// stroke 2 -> inset 1
		expect(svgPolygonPoints('triangle', 100, 50, 2)).toBe('51,1 101,51 1,51');
		expect(svgPolygonPoints('diamond', 100, 50, 2)).toBe('51,1 101,26 51,51 1,26');
	});

	it('treats a missing or zero stroke width as 1', () => {
		expect(svgPolygonPoints('triangle', 100, 50, undefined)).toBe('50.5,0.5 100.5,50.5 0.5,50.5');
		expect(svgPolygonPoints('triangle', 100, 50, 0)).toBe('50.5,0.5 100.5,50.5 0.5,50.5');
	});

	it.each([
		['triangle', 3],
		['diamond', 4],
		['hexagon', 6],
		['pentagon', 6],
		['arrow-right', 6],
		['arrow-left', 6],
		['arrow-up', 6],
		['arrow-down', 6]
	] as const)('%s has %i corners, all inside the shape box', (type, count) => {
		const points = polygonPoints(type, 200, 100, 4)!;
		expect(points).toHaveLength(count);
		for (const [x, y] of points) {
			expect(x).toBeGreaterThanOrEqual(2);
			expect(x).toBeLessThanOrEqual(202);
			expect(y).toBeGreaterThanOrEqual(2);
			expect(y).toBeLessThanOrEqual(102);
		}
	});

	it('points arrows in the right direction', () => {
		const tip = (type: 'arrow-right' | 'arrow-left' | 'arrow-up' | 'arrow-down') =>
			polygonPoints(type, 100, 100, 2)!;
		expect(Math.max(...tip('arrow-right').map(([x]) => x))).toBe(101); // tip at the right edge
		expect(Math.min(...tip('arrow-left').map(([x]) => x))).toBe(1);
		expect(Math.max(...tip('arrow-down').map(([, y]) => y))).toBe(101);
		expect(Math.min(...tip('arrow-up').map(([, y]) => y))).toBe(1);
	});

	it('returns null for shapes that are not polygons', () => {
		for (const type of [
			'rectangle',
			'circle',
			'ellipse',
			'line-horizontal',
			'line-vertical'
		] as const) {
			expect(polygonPoints(type, 10, 10, 1)).toBeNull();
			expect(svgPolygonPoints(type, 10, 10, 1)).toBeNull();
		}
	});

	it('recognises arrows', () => {
		expect(isArrow('arrow-up')).toBe(true);
		expect(isArrow('triangle')).toBe(false);
	});

	it('maps stroke styles to dash patterns', () => {
		expect(strokeDasharray('dashed')).toBe('5,5');
		expect(strokeDasharray('dotted')).toBe('2,2');
		expect(strokeDasharray('solid')).toBe('none');
		expect(strokeDasharray(undefined)).toBe('none');
	});
});
