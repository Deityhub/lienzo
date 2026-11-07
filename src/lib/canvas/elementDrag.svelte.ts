import { appStore } from '../stores/appStore.svelte.ts';
import type { DocumentPage, TCanvasElement } from '../types/canvas';
import { placeOnPage } from '../utils/pageMove';
import { pageDrop } from './pageDrop.svelte';
import {
	boundingRect,
	dragPosition,
	findElementAt,
	pointInRect,
	type Point,
	type Size
} from '../utils/geometry';
import { eventPoint, trackPointer } from './pointer';

interface Options {
	getCanvas: () => HTMLElement | undefined;
	getPage: () => DocumentPage;
	/** The canvas size in page pixels (not screen pixels) */
	getSize: () => Size;
	/** The element that would become the parent if dropped now, or null */
	onHover: (elementId: string | null) => void;
}

/** Pointer movement (screen pixels) below which a press counts as a click, not a drag */
const CLICK_SLOP = 3;

interface Session {
	elementId: string;
	pageId: string;
	/** Every element that moves: just the dragged one, or the whole selection */
	items: Array<{ id: string; origin: Point }>;
	elements: TCanvasElement[]; // as they were when the drag started
	origin: Point; // where the element (or the selection's bounding box) started, in page pixels
	size: Size;
	pointerStart: Point; // screen pixels
	/** Where the pointer started on the page, in page pixels (survives scrolling, unlike screen pixels) */
	startInPage: Point;
	pointer: Point; // latest screen pixels
	/** Another page the pointer is over, and where the elements would land on it */
	crossing: { pageId: string; updates: Record<string, Partial<TCanvasElement>> } | null;
	frame: number | null;
	scrollFrame: number | null;
	stop: () => void;
}

/** Scroll the page list while dragging near its top or bottom edge, so far pages can be reached. */
const SCROLL_ZONE_TOP = 140; // the header covers the top of the list
const SCROLL_ZONE_BOTTOM = 100;
const MAX_SCROLL_SPEED = 24;

/**
 * Dragging an element with the mouse or a finger: moves it within the page boundaries,
 * highlights the element it would be dropped into, and re-parents it on release.
 */
export function createElementDrag(options: Options) {
	let isDragging = $state(false);
	let session: Session | null = null;
	let moved = false;

	/** A point on the screen as a point on a page canvas, in page pixels. */
	function toPage(point: Point, canvas: HTMLElement): Point {
		const rect = canvas.getBoundingClientRect();
		const { width, height } = options.getSize();
		return {
			x: (point.x - rect.left) * (width / rect.width),
			y: (point.y - rect.top) * (height / rect.height)
		};
	}

	/** Another page of the document under the pointer, if any. */
	function otherPageAt(point: Point): { pageId: string; canvas: HTMLElement } | null {
		for (const id of Object.keys(appStore.getPages())) {
			if (id === session?.pageId) continue;
			const canvas = document.getElementById(`canvas-${id}`);
			if (canvas && pointInRect(point, canvas.getBoundingClientRect()))
				return { pageId: id, canvas };
		}
		return null;
	}

	/** Move the element to where the pointer is now. */
	function apply() {
		const canvas = options.getCanvas();
		if (!session || !canvas) return;

		const page = options.getPage();

		// Over another page: leave the elements where they were and show where they would land
		const other = otherPageAt(session.pointer);
		if (other) {
			const grab = {
				x: session.startInPage.x - session.origin.x,
				y: session.startInPage.y - session.origin.y
			};
			const pointer = toPage(session.pointer, other.canvas);
			const { updates, rects } = placeOnPage(
				session.elements,
				{ x: pointer.x - grab.x, y: pointer.y - grab.y },
				appStore.getPages()[other.pageId].boundaries
			);
			if (!session.crossing) {
				appStore.moveElements(
					session.pageId,
					Object.fromEntries(session.items.map((item) => [item.id, item.origin]))
				);
			}
			session.crossing = { pageId: other.pageId, updates };
			pageDrop.set(other.pageId, rects);
			options.onHover(null);
			return;
		}
		if (session.crossing) {
			session.crossing = null;
			pageDrop.clear();
		}

		const pointerInPage = toPage(session.pointer, canvas);
		const delta = {
			x: pointerInPage.x - session.startInPage.x,
			y: pointerInPage.y - session.startInPage.y
		};
		const position = dragPosition(session.origin, delta, session.size, page.boundaries);

		// A group moves as one box: no re-parenting
		if (session.items.length > 1) {
			const dx = position.x - session.origin.x;
			const dy = position.y - session.origin.y;
			options.onHover(null);
			appStore.moveElements(
				session.pageId,
				Object.fromEntries(
					session.items.map((item) => [item.id, { x: item.origin.x + dx, y: item.origin.y + dy }])
				)
			);
			return;
		}

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

	/** While the pointer is near the top or bottom of the page list, keep scrolling it. */
	function autoScroll() {
		if (!session) return;
		const container = document.querySelector<HTMLElement>('[data-testid="canvas-container"]');
		if (container) {
			const bounds = container.getBoundingClientRect();
			const y = session.pointer.y;
			let speed = 0;
			if (y < bounds.top + SCROLL_ZONE_TOP) speed = -(bounds.top + SCROLL_ZONE_TOP - y) / 4;
			else if (y > bounds.bottom - SCROLL_ZONE_BOTTOM)
				speed = (y - (bounds.bottom - SCROLL_ZONE_BOTTOM)) / 4;
			speed = Math.max(-MAX_SCROLL_SPEED, Math.min(MAX_SCROLL_SPEED, speed));

			const before = container.scrollTop;
			if (speed) container.scrollTop += speed;
			if (container.scrollTop !== before) apply(); // the pages moved under the pointer
		}
		session.scrollFrame = requestAnimationFrame(autoScroll);
	}

	function teardown() {
		if (session?.frame != null) cancelAnimationFrame(session.frame);
		if (session?.scrollFrame != null) cancelAnimationFrame(session.scrollFrame);
		pageDrop.clear();
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

		// Dropped on another page: move the elements there
		if (session.crossing) {
			appStore.moveElementsToPage(
				session.pageId,
				session.crossing.pageId,
				session.crossing.updates
			);
			teardown();
			return;
		}

		const { elementId, pageId } = session;
		const latest = session.items.length === 1 ? appStore.findElement(pageId, elementId) : null;
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

		// Dragging a selected element moves the whole selection; any other element is selected first
		// (with the rest of its group, if it has one)
		if (!appStore.isSelected(element.id)) appStore.selectElement(element);
		const selected = appStore.getSelectedElements();
		const moving = selected.length ? selected : [element];
		const box = boundingRect(moving)!;

		const pointer = eventPoint(event);
		isDragging = true;
		moved = false;
		session = {
			elementId: element.id,
			pageId: element.pageId,
			items: moving.map((el) => ({ id: el.id, origin: { x: el.x, y: el.y } })),
			elements: moving,
			origin: { x: box.x, y: box.y },
			size: { width: box.width, height: box.height },
			pointerStart: pointer,
			startInPage: options.getCanvas() ? toPage(pointer, options.getCanvas()!) : { x: 0, y: 0 },
			pointer,
			crossing: null,
			frame: null,
			scrollFrame: null,
			stop: trackPointer({
				onMove: (point) => {
					if (!session) return;
					session.pointer = point;
					if (
						Math.abs(point.x - session.pointerStart.x) > CLICK_SLOP ||
						Math.abs(point.y - session.pointerStart.y) > CLICK_SLOP
					) {
						moved = true;
					}
					schedule();
				},
				onEnd: finish
			})
		};
		document.body.style.userSelect = 'none';
		document.body.style.touchAction = 'none';
		session.scrollFrame = requestAnimationFrame(autoScroll);
	}

	return {
		get isDragging() {
			return isDragging;
		},
		start,
		/** Was there a drag since the last call? The click that ends a drag must not change the selection. */
		consumeMoved() {
			const wasMoved = moved;
			moved = false;
			return wasMoved;
		},
		/** Abort the drag (Escape): the element stays where it is, without re-parenting. */
		cancel: teardown
	};
}
