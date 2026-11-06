import type { Rect } from '../utils/geometry';

let target = $state<{ pageId: string; rects: Rect[] } | null>(null);

/** The page an element is being dragged over, and where it would land there. */
export const pageDrop = {
	get target() {
		return target;
	},
	set(pageId: string, rects: Rect[]) {
		target = { pageId, rects };
	},
	clear() {
		target = null;
	}
};
