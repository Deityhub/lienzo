import { describe, expect, it } from 'vitest';
import type { RulerBoundaries, TCanvasElement } from '../types/canvas';
import { placeOnPage } from './pageMove';

// x 100..700, y 100..1000
const bounds: RulerBoundaries = {
	horizontal: { start: 100, end: 700 },
	vertical: { start: 100, end: 1000 }
};

const shape = (id: string, x: number, y: number, width = 100, height = 100) =>
	({ id, type: 'shape', pageId: 'p', zIndex: 0, x, y, width, height }) as TCanvasElement;
const text = (id: string, x: number, y: number, fontSize: number, width = 100, height = 100) =>
	({ id, type: 'text', pageId: 'p', zIndex: 0, x, y, width, height, fontSize }) as TCanvasElement;

describe('placeOnPage', () => {
	it('puts the top-left of the combined box at the given point, keeping the layout', () => {
		const { updates, rects } = placeOnPage(
			[shape('a', 300, 300), shape('b', 500, 400)],
			{ x: 150, y: 200 },
			bounds
		);

		expect(updates.a).toMatchObject({ x: 150, y: 200, width: 100, height: 100 });
		expect(updates.b).toMatchObject({ x: 350, y: 300 });
		expect(rects).toHaveLength(2);
	});

	it('moves the box inside the boundaries', () => {
		const { updates } = placeOnPage(
			[shape('a', 300, 300), shape('b', 500, 300)], // 300 wide
			{ x: 600, y: 50 },
			bounds
		);

		expect(updates.b).toMatchObject({ x: 600, y: 100 }); // right edge at 700, top at 100
		expect(updates.a).toMatchObject({ x: 400 });
	});

	it('scales a box that is too big for the page, text sizes included', () => {
		const { updates } = placeOnPage(
			[text('t', 0, 0, 40, 1200, 300), shape('s', 0, 300, 1200, 300)], // 1200 x 600 in a 600 x 900 page
			{ x: 0, y: 0 },
			bounds
		);

		expect(updates.t).toMatchObject({ x: 100, y: 100, width: 600, height: 150, fontSize: 20 });
		expect(updates.s).toMatchObject({ x: 100, y: 250, width: 600, height: 150 });
		expect(updates.s).not.toHaveProperty('fontSize');
	});

	it('does not touch text sizes when nothing is scaled', () => {
		const { updates } = placeOnPage([text('t', 300, 300, 40)], { x: 200, y: 200 }, bounds);
		expect(updates.t).not.toHaveProperty('fontSize');
	});

	it('does nothing for no elements', () => {
		expect(placeOnPage([], { x: 0, y: 0 }, bounds)).toEqual({ updates: {}, rects: [] });
	});
});
