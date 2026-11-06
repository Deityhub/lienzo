import { appStore } from '../stores/appStore.svelte.ts';
import type { DocumentPage, ResizeDirection, TCanvasElement } from '../types/canvas';
import { resizeRect, type Point, type Rect, type Size } from '../utils/geometry';
import { eventPoint, trackPointer } from './pointer';

interface Options {
	getCanvas: () => HTMLElement | undefined;
	getPage: () => DocumentPage;
	/** The canvas size in page pixels (not screen pixels) */
	getSize: () => Size;
}

interface Session {
	element: TCanvasElement;
	direction: ResizeDirection;
	startRect: Rect;
	pointerStart: Point; // screen pixels
	pointer: Point; // latest screen pixels
	scale: Point; // page pixels per screen pixel
	frame: number | null;
	stop: () => void;
	restoreStyles: () => void;
}

/** Resizing an element from one of its handles with the mouse or a finger. */
export function createElementResize(options: Options) {
	let isResizing = $state(false);
	let session: Session | null = null;

	function apply() {
		if (!session) return;
		const next = resizeRect(
			session.startRect,
			session.direction,
			{
				x: (session.pointer.x - session.pointerStart.x) * session.scale.x,
				y: (session.pointer.y - session.pointerStart.y) * session.scale.y
			},
			options.getPage().boundaries
		);
		appStore.updateElement({
			elementId: session.element.id,
			updates: next,
			pageId: session.element.pageId
		});
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

	function start(
		event: MouseEvent | PointerEvent | TouchEvent,
		element: TCanvasElement,
		direction: ResizeDirection
	) {
		event.stopPropagation();
		if (session) finish();

		const canvas = options.getCanvas();
		if (!canvas) return;

		const originalUserSelect = document.body.style.userSelect;
		const originalTouchAction = document.body.style.touchAction;
		document.body.style.userSelect = '';
		document.body.style.touchAction = 'none'; // Prevent touch scrolling during resize

		const rect = canvas.getBoundingClientRect();
		const { width, height } = options.getSize();
		const pointer = eventPoint(event);

		isResizing = true;
		session = {
			element,
			direction,
			startRect: { x: element.x, y: element.y, width: element.width, height: element.height },
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
