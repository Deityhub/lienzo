import { describe, expect, it } from 'vitest';
import type { ShapeElement } from '../types/canvas';
import {
	ellipsePath,
	mapPath,
	polygonPath,
	rotatePoint,
	roundedRectPath,
	shapeGeometry,
	toSvgPath,
	viewBoxFit
} from './paths';

const shape = (extra: Partial<ShapeElement>): ShapeElement => ({
	id: 's',
	type: 'shape',
	pageId: 'p',
	zIndex: 0,
	x: 0,
	y: 0,
	width: 200,
	height: 100,
	shapeType: 'rectangle',
	strokeColor: '#000',
	strokeWidth: 4,
	...extra
});

describe('paths', () => {
	it('builds square corners as a closed polygon', () => {
		expect(toSvgPath(roundedRectPath(0, 0, 10, 20))).toBe('M 0 0 L 10 0 L 10 20 L 0 20 Z');
	});

	it('limits corner radii to half the size', () => {
		const path = roundedRectPath(0, 0, 10, 10, 50, 50);
		const xs = path.flatMap((s) => (s[0] === 'Z' ? [] : [s[1]]));
		expect(Math.min(...xs)).toBe(0);
		expect(Math.max(...xs)).toBe(10);
	});

	it('draws an ellipse with four curves starting at the right-hand point', () => {
		const path = ellipsePath(50, 50, 20, 10);
		expect(path[0]).toEqual(['M', 70, 50]);
		expect(path.filter((s) => s[0] === 'C')).toHaveLength(4);
	});

	it('rotates clockwise with y pointing down', () => {
		const [x, y] = rotatePoint([10, 0], 90, 0, 0);
		expect(x).toBeCloseTo(0);
		expect(y).toBeCloseTo(10);
	});

	it('maps every coordinate of a path', () => {
		expect(
			mapPath(
				polygonPath([
					[1, 2],
					[3, 4]
				]),
				([x, y]) => [x * 2, y + 1]
			)
		).toEqual([['M', 2, 3], ['L', 6, 5], ['Z']]);
	});
});

describe('shapeGeometry', () => {
	it('rectangles use the element size as viewBox and are inset by half the stroke', () => {
		const g = shapeGeometry(shape({}));
		expect(g.viewBox).toEqual({ width: 200, height: 100 });
		expect(g.path[0]).toEqual(['M', 2, 2]);
	});

	it('other shapes leave room for the stroke in the viewBox', () => {
		expect(shapeGeometry(shape({ shapeType: 'ellipse' })).viewBox).toEqual({
			width: 204,
			height: 104
		});
	});

	it('polygons come from the shared shape geometry', () => {
		const g = shapeGeometry(shape({ shapeType: 'triangle' }));
		expect(g.path).toHaveLength(4); // 3 corners + close
		expect(g.open).toBe(false);
	});

	it('lines are open paths through the middle of the viewBox', () => {
		const g = shapeGeometry(shape({ shapeType: 'line-horizontal' }));
		expect(g.open).toBe(true);
		expect(g.path.map((s) => s[2])).toEqual([52, 52]);
	});
});

describe('viewBoxFit', () => {
	it('shrinks to fit and centres, like preserveAspectRatio meet', () => {
		const fit = viewBoxFit({ width: 204, height: 104 }, { width: 200, height: 100 });
		expect(fit.scale).toBeCloseTo(100 / 104);
		expect(fit.offsetX).toBeCloseTo((200 - 204 * (100 / 104)) / 2);
		expect(fit.offsetY).toBe(0);
	});
});
