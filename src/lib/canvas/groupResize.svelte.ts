import { appStore } from '../stores/appStore.svelte.ts';
import type { DocumentPage, TCanvasElement } from '../types/canvas';
import {
	boundingRect,
	groupScaleFactor,
	minScaleFactor,
	oppositeCorner,
	scaleRects,
	type Corner,
	type Point,
	type Rect,
	type Size
} from '../utils/geometry';
import { eventPoint, trackPointer } from './pointer';

interface Options {
	getCanvas: () => HTMLElement | undefined;
	getPage: () => DocumentPage;
	/** The canvas size in page pixels (not screen pixels) */
	getSize: () => Size;
}

interface Session {
	elements: TCanvasElement[]; // as they were when the resize started
	box: Rect;
	corner: Corner;
	minFactor: number;
	pointerStart: Point; // screen pixels
	pointer: Point; // latest screen pixels
	scale: Point; // page pixels per screen pixel
	frame: number | null;
	stop: () => void;
	restoreStyles: () => void;
}

const round = (value: number) => Math.round(value * 100) / 100;

/**
 * Resizing the selected elements as one from a corner of their box: positions, sizes and text sizes all
 * scale by the same factor, so the group keeps its proportions.
 */
export function createGroupResize(options: Options) {
	let isResizing = $state(false);
	let session: Session | null = null;

	function apply() {
		if (!session) return;
		const { elements, box, corner } = session;
		const delta = {
			x: (session.pointer.x - session.pointerStart.x) * session.scale.x,
			y: (session.pointer.y - session.pointerStart.y) * session.scale.y
		};
		const factor = groupScaleFactor(
			box,
			corner,
			delta,
			options.getPage().boundaries,
			session.minFactor
		);
		const rects = scaleRects(elements, oppositeCorner(box, corner), factor);

		const updates: Record<string, Partial<TCanvasElement>> = {};
		elements.forEach((el, i) => {
			updates[el.id] = {
				x: round(rects[i].x),
				y: round(rects[i].y),
				width: round(rects[i].width),
				height: round(rects[i].height),
				...(el.type === 'text' && { fontSize: Math.max(1, Math.round(el.fontSize * factor)) })
			};
		});
		appStore.updateElements(elements[0].pageId, updates);
	}

	function schedule() {
		if (!session || session.frame !== null) return;
		session.frame = requestAnimationFrame(() => {
			if (session) session.frame = null;
			apply();
		});
	}

	function finish() {
		if (!session) return;
		apply(); // the last move may not have had its animation frame yet
		if (session.frame !== null) cancelAnimationFrame(session.frame);
		session.stop();
		session.restoreStyles();
		session = null;
		isResizing = false;
	}

	function start(event: MouseEvent | PointerEvent | TouchEvent, corner: Corner) {
		event.stopPropagation();
		if (session) finish();

		const canvas = options.getCanvas();
		const elements = appStore.getSelectedElements();
		const box = boundingRect(elements);
		if (!canvas || !box) return;

		const originalUserSelect = document.body.style.userSelect;
		const originalTouchAction = document.body.style.touchAction;
		document.body.style.userSelect = 'none';
		document.body.style.touchAction = 'none'; // Prevent touch scrolling during resize

		const rect = canvas.getBoundingClientRect();
		const { width, height } = options.getSize();
		const pointer = eventPoint(event);

		isResizing = true;
		session = {
			elements,
			box,
			corner,
			minFactor: minScaleFactor(elements),
			pointerStart: pointer,
			pointer,
			scale: { x: width / rect.width, y: height / rect.height },
			frame: null,
			stop: trackPointer({
				onMove: (point) => {
					if (!session) return;
					session.pointer = point;
					schedule();
				},
				onEnd: finish
			}),
			restoreStyles: () => {
				document.body.style.userSelect = originalUserSelect;
				document.body.style.touchAction = originalTouchAction;
			}
		};
	}

	return {
		get isResizing() {
			return isResizing;
		},
		start
	};
}
