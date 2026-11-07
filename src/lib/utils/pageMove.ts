// Moving elements to another page. Pure: no DOM, no store.
import type { RulerBoundaries, TCanvasElement } from '../types/canvas';
import { boundingRect, constrainGroupToBoundaries, type Point, type Rect } from './geometry';

export interface PagePlacement {
	/** Position, size (and text size) for each element on the new page */
	updates: Record<string, Partial<TCanvasElement>>;
	/** The new rectangles, in the same order as the elements */
	rects: Rect[];
}

/**
 * Where elements land on another page when their combined box has its top-left corner at `topLeft`:
 * the layout between them is kept and the box is moved inside the page's boundaries. A box too big
 * for the page is scaled down to fit, text sizes included.
 */
export function placeOnPage(
	elements: TCanvasElement[],
	topLeft: Point,
	boundaries: RulerBoundaries
): PagePlacement {
	const box = boundingRect(elements);
	if (!box) return { updates: {}, rects: [] };

	const shifted = elements.map((el) => ({
		x: el.x - box.x + topLeft.x,
		y: el.y - box.y + topLeft.y,
		width: el.width,
		height: el.height
	}));
	const rects = constrainGroupToBoundaries(shifted, boundaries);
	const factor = rects[0].width / elements[0].width;

	const updates: Record<string, Partial<TCanvasElement>> = {};
	elements.forEach((el, i) => {
		updates[el.id] = {
			...rects[i],
			...(el.type === 'text' &&
				factor !== 1 && { fontSize: Math.max(1, Math.round(el.fontSize * factor)) })
		};
	});
	return { updates, rects };
}
