import { appStore } from '../stores/appStore.svelte.ts';
import type { DocumentPage, TCanvasElement } from '../types/canvas';
import { dragPosition, findElementAt, type Point, type Size } from '../utils/geometry';
import { eventPoint, trackPointer } from './pointer';

interface Options {
	getCanvas: () => HTMLElement | undefined;
	getPage: () => DocumentPage;
	/** The canvas size in page pixels (not screen pixels) */
	getSize: () => Size;
	/** The element that would become the parent if dropped now, or null */
	onHover: (elementId: string | null) => void;
}

interface Session {
	elementId: string;
	pageId: string;
	origin: Point; // where the element started, in page pixels
	size: Size;
	pointerStart: Point; // screen pixels
	pointer: Point; // latest screen pixels
	frame: number | null;
	stop: () => void;
}

/**
 * Dragging an element with the mouse or a finger: moves it within the page boundaries,
 * highlights the element it would be dropped into, and re-parents it on release.
 */
export function createElementDrag(options: Options) {
	let isDragging = $state(false);
	let session: Session | null = null;

	/** Move the element to where the pointer is now. */
	function apply() {
		const canvas = options.getCanvas();
		if (!session || !canvas) return;

		const rect = canvas.getBoundingClientRect();
		const { width, height } = options.getSize();
		const page = options.getPage();
		const delta = {
			x: (session.pointer.x - session.pointerStart.x) * (width / rect.width),
			y: (session.pointer.y - session.pointerStart.y) * (height / rect.height)
		};
		const position = dragPosition(session.origin, delta, session.size, page.boundaries);

		// The element under the dragged element's centre is the future parent
		const parent = findElementAt(
			Object.values(page.elements),
			{ x: position.x + session.size.width / 2, y: position.y + session.size.height / 2 },
			session.elementId
		);
		options.onHover(parent ? parent.id : null);

		appStore.updateElement({
			elementId: session.elementId,
			updates: position,
			pageId: session.pageId
		});
	}

	/** Apply the latest pointer position at most once per animation frame. */
	function schedule() {
		if (!session || session.frame !== null) return;
		session.frame = requestAnimationFrame(() => {
			if (session) session.frame = null;
			apply();
		});
	}

	function teardown() {
		if (session?.frame != null) cancelAnimationFrame(session.frame);
		session?.stop();
		session = null;
		isDragging = false;
		options.onHover(null);
		document.body.style.userSelect = '';
		document.body.style.touchAction = '';
	}

	/** The pointer was released: land the element and make it a child of what is under it. */
	function finish() {
		if (!session) return;
		apply(); // the last move may not have had its animation frame yet

		const { elementId, pageId } = session;
		const latest = appStore.findElement(pageId, elementId);
		if (latest) {
			const parent = findElementAt(
				Object.values(options.getPage().elements),
				{ x: latest.x + latest.width / 2, y: latest.y + latest.height / 2 },
				latest.id
			);
			appStore.moveElement({
				pageId: latest.pageId,
				elementId: latest.id,
				newParentId: parent ? parent.id : null,
				newX: latest.x,
				newY: latest.y
			});

			const updated = appStore.findElement(latest.pageId, latest.id);
			if (updated) appStore.selectElement(updated);
		}
		teardown();
	}

	function start(event: PointerEvent | TouchEvent, element: TCanvasElement) {
		event.stopPropagation();
		if (session) teardown();

		const pointer = eventPoint(event);
		isDragging = true;
		session = {
			elementId: element.id,
			pageId: element.pageId,
			origin: { x: element.x, y: element.y },
			size: { width: element.width, height: element.height },
			pointerStart: pointer,
			pointer,
			frame: null,
			stop: trackPointer({
				onMove: (point) => {
					if (!session) return;
					session.pointer = point;
					schedule();
				},
				onEnd: finish
			})
		};
		document.body.style.userSelect = 'none';
		document.body.style.touchAction = 'none';
	}

	return {
		get isDragging() {
			return isDragging;
		},
		start,
		/** Abort the drag (Escape): the element stays where it is, without re-parenting. */
		cancel: teardown
	};
}
