import { describe, expect, it } from 'vitest';
import type { RulerBoundaries, TCanvasElement } from '../types/canvas';
import {
	boundingRect,
	clampPosition,
	constrainToBoundaries,
	dragPosition,
	dragPreviewRect,
	findElementAt,
	newElementPlacement,
	getOverlappingElements,
	rectBetween,
	rectsOverlap,
	resizeRect,
	snapToBoundaries
} from './geometry';

// Page content area: x 100..700, y 100..1000
const bounds: RulerBoundaries = {
	horizontal: { start: 100, end: 700 },
	vertical: { start: 100, end: 1000 }
};

const el = (id: string, x: number, y: number, width: number, height: number, zIndex = 0) =>
	({ id, type: 'shape', pageId: 'p', zIndex, x, y, width, height }) as unknown as TCanvasElement;

describe('rectsOverlap', () => {
	const a = { x: 0, y: 0, width: 100, height: 100 };

	it.each([
		['overlapping', { x: 50, y: 50, width: 100, height: 100 }, true],
		['contained', { x: 10, y: 10, width: 10, height: 10 }, true],
		['touching edges', { x: 100, y: 0, width: 50, height: 50 }, true],
		['apart horizontally', { x: 101, y: 0, width: 50, height: 50 }, false],
		['apart vertically', { x: 0, y: 101, width: 50, height: 50 }, false]
	])('%s', (_name, b, expected) => {
		expect(rectsOverlap(a, b)).toBe(expected);
		expect(rectsOverlap(b, a)).toBe(expected);
	});
});

describe('getOverlappingElements', () => {
	it('returns overlapping elements and never the element itself', () => {
		const a = el('a', 0, 0, 100, 100);
		const b = el('b', 50, 50, 100, 100);
		const c = el('c', 500, 500, 10, 10);

		expect(getOverlappingElements(a, [a, b, c]).map((e) => e.id)).toEqual(['b']);
	});
});

describe('findElementAt', () => {
	const bottom = el('bottom', 0, 0, 200, 200, 0);
	const top = el('top', 50, 50, 100, 100, 5);

	it('returns the topmost element at a point', () => {
		expect(findElementAt([bottom, top], { x: 60, y: 60 })?.id).toBe('top');
		expect(findElementAt([top, bottom], { x: 60, y: 60 })?.id).toBe('top');
	});

	it('falls through to the element below outside the top one', () => {
		expect(findElementAt([bottom, top], { x: 10, y: 10 })?.id).toBe('bottom');
	});

	it('can exclude an element (used to find a drop parent)', () => {
		expect(findElementAt([bottom, top], { x: 60, y: 60 }, 'top')?.id).toBe('bottom');
	});

	it('includes the edges and returns null for empty space', () => {
		expect(findElementAt([bottom], { x: 200, y: 200 })?.id).toBe('bottom');
		expect(findElementAt([bottom], { x: 201, y: 200 })).toBeNull();
		expect(findElementAt([], { x: 0, y: 0 })).toBeNull();
	});

	it('does not reorder the input', () => {
		const list = [bottom, top];
		findElementAt(list, { x: 60, y: 60 });
		expect(list).toEqual([bottom, top]);
	});
});

describe('snapToBoundaries', () => {
	it('snaps within 10px of either edge, not at exactly 10px', () => {
		expect(snapToBoundaries(105, 100, 700)).toBe(100);
		expect(snapToBoundaries(695, 100, 700)).toBe(700);
		expect(snapToBoundaries(110, 100, 700)).toBe(110);
		expect(snapToBoundaries(400, 100, 700)).toBe(400);
	});
});

describe('clampPosition', () => {
	const size = { width: 100, height: 50 };

	it('keeps an element inside the boundaries', () => {
		expect(clampPosition({ x: 0, y: 0 }, size, bounds)).toEqual({ x: 100, y: 100 });
		expect(clampPosition({ x: 900, y: 2000 }, size, bounds)).toEqual({ x: 600, y: 950 });
		expect(clampPosition({ x: 300, y: 300 }, size, bounds)).toEqual({ x: 300, y: 300 });
	});
});

describe('dragPosition', () => {
	const size = { width: 100, height: 50 };

	it('moves by the delta', () => {
		expect(dragPosition({ x: 200, y: 200 }, { x: 30, y: -20 }, size, bounds)).toEqual({
			x: 230,
			y: 180
		});
	});

	it('snaps to the left/top edges and to the right/bottom edge of the element', () => {
		expect(dragPosition({ x: 200, y: 200 }, { x: -95, y: -95 }, size, bounds)).toEqual({
			x: 100,
			y: 100
		});
		// element's right edge near the boundary end (700 - 100 = 600)
		expect(dragPosition({ x: 500, y: 500 }, { x: 95, y: 0 }, size, bounds).x).toBe(600);
	});

	it('never leaves the boundaries, however far the pointer goes', () => {
		expect(dragPosition({ x: 200, y: 200 }, { x: -5000, y: -5000 }, size, bounds)).toEqual({
			x: 100,
			y: 100
		});
		expect(dragPosition({ x: 200, y: 200 }, { x: 5000, y: 5000 }, size, bounds)).toEqual({
			x: 600,
			y: 950
		});
	});
});

describe('constrainToBoundaries', () => {
	it('leaves an element that fits untouched', () => {
		const rect = { x: 200, y: 200, width: 100, height: 100 };
		expect(constrainToBoundaries(rect, bounds)).toEqual(rect);
	});

	it('pulls an element back inside when the boundaries shrink', () => {
		const small: RulerBoundaries = {
			horizontal: { start: 150, end: 400 },
			vertical: { start: 150, end: 400 }
		};
		expect(constrainToBoundaries({ x: 100, y: 100, width: 100, height: 100 }, small)).toEqual({
			x: 150,
			y: 150,
			width: 100,
			height: 100
		});
		expect(constrainToBoundaries({ x: 350, y: 350, width: 100, height: 100 }, small)).toEqual({
			x: 300,
			y: 300,
			width: 100,
			height: 100
		});
	});

	it('limits the size to the area and enforces the 20px minimum', () => {
		expect(constrainToBoundaries({ x: 0, y: 0, width: 5000, height: 5000 }, bounds)).toEqual({
			x: 100,
			y: 100,
			width: 600,
			height: 900
		});
		expect(constrainToBoundaries({ x: 200, y: 200, width: 5, height: 1 }, bounds)).toMatchObject({
			width: 20,
			height: 20
		});
	});
});

describe('resizeRect', () => {
	const start = { x: 200, y: 200, width: 100, height: 100 };

	it('grows from the east and south handles without moving', () => {
		expect(resizeRect(start, 'e', { x: 30, y: 99 }, bounds)).toEqual({ ...start, width: 130 });
		expect(resizeRect(start, 's', { x: 99, y: 30 }, bounds)).toEqual({ ...start, height: 130 });
		expect(resizeRect(start, 'se', { x: 10, y: 20 }, bounds)).toEqual({
			...start,
			width: 110,
			height: 120
		});
	});

	it('moves the origin with the west and north handles', () => {
		expect(resizeRect(start, 'w', { x: -30, y: 0 }, bounds)).toEqual({
			x: 170,
			y: 200,
			width: 130,
			height: 100
		});
		expect(resizeRect(start, 'n', { x: 0, y: -40 }, bounds)).toEqual({
			x: 200,
			y: 160,
			width: 100,
			height: 140
		});
		expect(resizeRect(start, 'nw', { x: -10, y: -10 }, bounds)).toEqual({
			x: 190,
			y: 190,
			width: 110,
			height: 110
		});
	});

	it('handles the mixed corners', () => {
		expect(resizeRect(start, 'ne', { x: 10, y: -10 }, bounds)).toEqual({
			x: 200,
			y: 190,
			width: 110,
			height: 110
		});
		expect(resizeRect(start, 'sw', { x: -10, y: 10 }, bounds)).toEqual({
			x: 190,
			y: 200,
			width: 110,
			height: 110
		});
	});

	it('never shrinks below 20px', () => {
		expect(resizeRect(start, 'e', { x: -500, y: 0 }, bounds).width).toBe(20);
		expect(resizeRect(start, 's', { x: 0, y: -500 }, bounds).height).toBe(20);
	});

	it('stops at the right and bottom boundaries', () => {
		expect(resizeRect(start, 'se', { x: 5000, y: 5000 }, bounds)).toMatchObject({
			width: 500,
			height: 800
		});
	});

	it('does not move the origin past the left/top boundaries', () => {
		const r = resizeRect(start, 'nw', { x: -5000, y: -5000 }, bounds);
		expect(r.x).toBe(100);
		expect(r.y).toBe(100);
	});
});

describe('dragPreviewRect', () => {
	it('fills the page from the pointer to the right edge', () => {
		expect(dragPreviewRect({ x: 200, y: 200 }, bounds)).toEqual({
			x: 200,
			y: 200,
			width: 500,
			height: 500
		});
	});

	it('limits the height to 500px and to the bottom boundary', () => {
		expect(dragPreviewRect({ x: 200, y: 200 }, bounds).height).toBe(500);
		expect(dragPreviewRect({ x: 200, y: 900 }, bounds).height).toBe(100);
	});

	it('keeps a minimum size near the edges by moving the preview inside', () => {
		expect(dragPreviewRect({ x: 690, y: 990 }, bounds)).toEqual({
			x: 600,
			y: 950,
			width: 100,
			height: 50
		});
	});

	it('clamps a pointer outside the page into it', () => {
		const r = dragPreviewRect({ x: -50, y: -50 }, bounds);
		expect(r.x).toBe(100);
		expect(r.y).toBe(100);
	});
});

describe('newElementPlacement', () => {
	it('fills from the drop point to the right boundary, 500px tall at most', () => {
		expect(newElementPlacement({ x: 300, y: 300 }, bounds, [])).toEqual({
			x: 300,
			y: 300,
			width: 400,
			height: 500,
			parentElementId: null
		});
	});

	it('snaps to the left boundary and then spans the full width', () => {
		expect(newElementPlacement({ x: 105, y: 300 }, bounds, [])).toMatchObject({
			x: 100,
			width: 600
		});
	});

	it('snaps to the top boundary', () => {
		expect(newElementPlacement({ x: 300, y: 95 }, bounds, [])).toMatchObject({ y: 100 });
	});

	it('snaps the element to the right and bottom boundaries when dropped near them', () => {
		const right = newElementPlacement({ x: 695, y: 300 }, bounds, []);
		expect(right.x + right.width).toBe(700);

		const bottom = newElementPlacement({ x: 300, y: 995 }, bounds, []);
		expect(bottom.y + bottom.height).toBe(1000);
	});

	it('keeps a minimum size and stays inside the boundaries', () => {
		const corner = newElementPlacement({ x: 650, y: 980 }, bounds, []);
		expect(corner).toMatchObject({ width: 100, height: 50 });
		expect(corner.x + corner.width).toBeLessThanOrEqual(700);
		expect(corner.y + corner.height).toBeLessThanOrEqual(1000);

		const outside = newElementPlacement({ x: -500, y: -500 }, bounds, []);
		expect(outside).toMatchObject({ x: 100, y: 100 });
	});

	it('parents the new element to the topmost element under it', () => {
		const below = el('below', 0, 0, 800, 800, 0);
		const above = el('above', 200, 200, 300, 300, 3);

		expect(newElementPlacement({ x: 300, y: 300 }, bounds, [below, above]).parentElementId).toBe(
			'above'
		);
		expect(newElementPlacement({ x: 150, y: 150 }, bounds, [below, above]).parentElementId).toBe(
			'below'
		);
		expect(newElementPlacement({ x: 900, y: 900 }, bounds, [below, above]).parentElementId).toBe(
			null
		);
	});
});

describe('boundingRect', () => {
	it('contains all the rectangles', () => {
		expect(
			boundingRect([
				{ x: 10, y: 20, width: 30, height: 40 },
				{ x: 100, y: 5, width: 10, height: 10 }
			])
		).toEqual({ x: 10, y: 5, width: 100, height: 55 });
	});
	it('is null for nothing', () => expect(boundingRect([])).toBeNull());
});

describe('rectBetween', () => {
	it('works whichever corner comes first', () => {
		expect(rectBetween({ x: 50, y: 10 }, { x: 20, y: 40 })).toEqual({
			x: 20,
			y: 10,
			width: 30,
			height: 30
		});
	});
});
