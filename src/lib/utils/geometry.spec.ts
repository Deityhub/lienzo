import { describe, expect, it } from 'vitest';
import type { RulerBoundaries, TCanvasElement } from '../types/canvas';
import {
	boundaryAdjustments,
	groupScaleFactor,
	minScaleFactor,
	oppositeCorner,
	scaleRects,
	boundingRect,
	constrainGroupToBoundaries,
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

describe('constrainGroupToBoundaries', () => {
	// boundaries: x 100..700, y 100..1000
	const group = [
		{ x: 200, y: 200, width: 100, height: 100 },
		{ x: 400, y: 300, width: 100, height: 100 }
	];

	it('leaves a group that fits alone', () => {
		expect(constrainGroupToBoundaries(group, bounds)).toEqual(group);
	});

	it('moves the whole group without changing the layout inside it', () => {
		const moved = group.map((r) => ({ ...r, x: r.x + 300 })); // sticks out on the right (box 500..800)
		const fitted = constrainGroupToBoundaries(moved, bounds);

		expect(fitted[1].x + fitted[1].width).toBe(700); // the right edge of the group is at the boundary
		expect(fitted[1].x - fitted[0].x).toBe(200); // spacing kept
		expect(fitted[1].y - fitted[0].y).toBe(100);
		expect(fitted.map((r) => r.width)).toEqual([100, 100]);
	});

	it('moves a group that is above or left of the boundaries to the corner', () => {
		const outside = group.map((r) => ({ ...r, x: r.x - 150, y: r.y - 150 }));
		const [first] = constrainGroupToBoundaries(outside, bounds);
		expect(first).toMatchObject({ x: 100, y: 100 });
	});

	it('scales down a group that is too big, keeping its proportions', () => {
		const huge = [
			{ x: 100, y: 100, width: 1200, height: 400 },
			{ x: 100, y: 500, width: 1200, height: 400 }
		]; // 1200x800 in a 600x900 area: half size
		const fitted = constrainGroupToBoundaries(huge, bounds);

		expect(fitted[0]).toEqual({ x: 100, y: 100, width: 600, height: 200 });
		expect(fitted[1]).toEqual({ x: 100, y: 300, width: 600, height: 200 });
	});
});

describe('boundaryAdjustments', () => {
	const el = (id: string, x: number, groupId?: string) =>
		({
			id,
			type: 'shape',
			pageId: 'p',
			zIndex: 0,
			x,
			y: 200,
			width: 100,
			height: 100,
			groupId
		}) as TCanvasElement;

	it('returns only what changes', () => {
		expect(boundaryAdjustments([el('a', 200), el('b', 300)], bounds)).toEqual({});
	});

	it('fits single elements one by one and grouped elements together', () => {
		const changes = boundaryAdjustments(
			[el('single', 650), el('g1', 500, 'g'), el('g2', 650, 'g')], // g spans 500..750, 50 too far right
			bounds
		);

		expect(changes.single).toMatchObject({ x: 600 });
		expect(changes.g1).toMatchObject({ x: 450 });
		expect(changes.g2).toMatchObject({ x: 600 });
		expect(changes.g2.x - changes.g1.x).toBe(150); // the group kept its shape
	});
});

describe('group scaling', () => {
	// boundaries: x 100..700, y 100..1000
	const box = { x: 200, y: 200, width: 200, height: 100 };

	it('the anchor is the corner opposite the handle', () => {
		expect(oppositeCorner(box, 'se')).toEqual({ x: 200, y: 200 });
		expect(oppositeCorner(box, 'nw')).toEqual({ x: 400, y: 300 });
		expect(oppositeCorner(box, 'ne')).toEqual({ x: 200, y: 300 });
		expect(oppositeCorner(box, 'sw')).toEqual({ x: 400, y: 200 });
	});

	it('scales positions and sizes around the anchor', () => {
		const scaled = scaleRects(
			[
				{ x: 200, y: 200, width: 100, height: 50 },
				{ x: 300, y: 250, width: 100, height: 50 }
			],
			{ x: 200, y: 200 },
			2
		);
		expect(scaled).toEqual([
			{ x: 200, y: 200, width: 200, height: 100 },
			{ x: 400, y: 300, width: 200, height: 100 }
		]);
	});

	it('the factor follows the handle, averaging horizontal and vertical movement', () => {
		expect(groupScaleFactor(box, 'se', { x: 100, y: 50 }, bounds, 0.1)).toBe(1.5);
		expect(groupScaleFactor(box, 'se', { x: 0, y: 0 }, bounds, 0.1)).toBe(1);
		// dragging a top-left handle up and left grows the group
		expect(groupScaleFactor(box, 'nw', { x: -100, y: -50 }, bounds, 0.1)).toBe(1.5);
		expect(groupScaleFactor(box, 'se', { x: -100, y: -50 }, bounds, 0.1)).toBe(0.5);
	});

	it('never grows past the boundaries', () => {
		// the box starts at x 200 and the right boundary is 700: at most 500/200 = 2.5 times as wide
		expect(groupScaleFactor(box, 'se', { x: 5000, y: 5000 }, bounds, 0.1)).toBe(2.5);
		// from the left handle the anchor is the right edge (400): 300/200 = 1.5
		expect(groupScaleFactor(box, 'nw', { x: -5000, y: -5000 }, bounds, 0.1)).toBe(1.5);
	});

	it('never shrinks an element below the minimum size', () => {
		const rects = [
			{ x: 0, y: 0, width: 100, height: 40 },
			{ x: 0, y: 0, width: 300, height: 300 }
		];
		expect(minScaleFactor(rects)).toBe(0.5); // 20 / 40
		expect(minScaleFactor([{ x: 0, y: 0, width: 10, height: 10 }])).toBe(1); // already small: no further shrinking
		expect(groupScaleFactor(box, 'se', { x: -5000, y: -5000 }, bounds, 0.5)).toBe(0.5);
	});
});
