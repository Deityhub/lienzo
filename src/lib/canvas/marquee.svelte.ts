import { appStore } from '../stores/appStore.svelte.ts';
import type { DocumentPage } from '../types/canvas';
import { rectBetween, rectsOverlap, type Point, type Rect, type Size } from '../utils/geometry';
import { trackPointer } from './pointer';

interface Options {
	getCanvas: () => HTMLElement | undefined;
	getPage: () => DocumentPage;
	/** The canvas size in page pixels (not screen pixels) */
	getSize: () => Size;
}

/** Pointer movement (screen pixels) below which a press on the empty page is a click, not a selection box */
const CLICK_SLOP = 3;

/**
 * Selecting by dragging a box over the empty page: everything the box touches is selected as it grows.
 * With `additive` (Shift or the select-multiple mode) the box adds to the current selection.
 */
export function createMarquee(options: Options) {
	let box = $state<Rect | null>(null);
	let moved = false;
	let stop: (() => void) | null = null;

	function toPage(point: Point): Point {
		const rect = options.getCanvas()!.getBoundingClientRect();
		const { width, height } = options.getSize();
		return {
			x: (point.x - rect.left) * (width / rect.width),
			y: (point.y - rect.top) * (height / rect.height)
		};
	}

	function start(event: PointerEvent, additive: boolean) {
		if (event.button !== 0 || !options.getCanvas()) return;
		stop?.();

		const page = options.getPage();
		const origin = { x: event.clientX, y: event.clientY };
		const originInPage = toPage(origin);
		const kept =
			additive && appStore.getSelectedElements()[0]?.pageId === page.id
				? appStore.getSelectedElements().map((el) => el.id)
				: [];
		moved = false;

		stop = trackPointer({
			onMove: (point) => {
				if (
					!moved &&
					Math.abs(point.x - origin.x) <= CLICK_SLOP &&
					Math.abs(point.y - origin.y) <= CLICK_SLOP
				) {
					return;
				}
				moved = true;
				box = rectBetween(originInPage, toPage(point));
				const touched = Object.values(options.getPage().elements)
					.filter((el) => rectsOverlap(box!, el))
					.map((el) => el.id);
				appStore.selectElements(page.id, [...kept, ...touched.filter((id) => !kept.includes(id))]);
			},
			onEnd: () => {
				stop?.();
				stop = null;
				box = null;
			}
		});
	}

	return {
		/** The selection box being dragged, in page pixels */
		get box() {
			return box;
		},
		start,
		/** Was there a selection box since the last call? The click that ends it must not clear the selection. */
		consumeMoved() {
			const wasMoved = moved;
			moved = false;
			return wasMoved;
		},
		cancel() {
			stop?.();
			stop = null;
			box = null;
		}
	};
}
