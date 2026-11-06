// Pure geometry for the canvas editor: no DOM, no store. All values are in canvas pixels.
import type { ResizeDirection, RulerBoundaries, TCanvasElement } from '../types/canvas';

export interface Point {
	x: number;
	y: number;
}
export interface Size {
	width: number;
	height: number;
}
export interface Rect extends Point, Size {}

export const MIN_ELEMENT_SIZE = 20;
export const SNAP_THRESHOLD = 10;

/** Do two rectangles overlap or touch? */
export function rectsOverlap(a: Rect, b: Rect): boolean {
	return !(
		a.x + a.width < b.x ||
		b.x + b.width < a.x ||
		a.y + a.height < b.y ||
		b.y + b.height < a.y
	);
}

/** The smallest rectangle containing all the rectangles, or null for none. */
export function boundingRect(rects: Rect[]): Rect | null {
	if (!rects.length) return null;
	const x = Math.min(...rects.map((r) => r.x));
	const y = Math.min(...rects.map((r) => r.y));
	return {
		x,
		y,
		width: Math.max(...rects.map((r) => r.x + r.width)) - x,
		height: Math.max(...rects.map((r) => r.y + r.height)) - y
	};
}

/** The rectangle between two corner points, whichever way round they are. */
export function rectBetween(a: Point, b: Point): Rect {
	return {
		x: Math.min(a.x, b.x),
		y: Math.min(a.y, b.y),
		width: Math.abs(a.x - b.x),
		height: Math.abs(a.y - b.y)
	};
}

/** Elements (other than `element` itself) that overlap `element`. */
export function getOverlappingElements(
	element: TCanvasElement,
	elements: TCanvasElement[]
): TCanvasElement[] {
	return elements.filter((el) => el.id !== element.id && rectsOverlap(element, el));
}

/** The topmost element (highest zIndex) containing the point, optionally ignoring one element. */
export function findElementAt(
	elements: TCanvasElement[],
	point: Point,
	excludeId?: string
): TCanvasElement | null {
	const topFirst = [...elements].sort((a, b) => b.zIndex - a.zIndex);
	for (const el of topFirst) {
		if (el.id === excludeId) continue;
		if (
			point.x >= el.x &&
			point.x <= el.x + el.width &&
			point.y >= el.y &&
			point.y <= el.y + el.height
		) {
			return el;
		}
	}
	return null;
}

/** Snap a value to `start` or `end` when it is within the snap threshold. */
export function snapToBoundaries(value: number, start: number, end: number): number {
	if (Math.abs(value - start) < SNAP_THRESHOLD) return start;
	if (Math.abs(value - end) < SNAP_THRESHOLD) return end;
	return value;
}

/** Keep an element of the given size inside the boundaries. */
export function clampPosition(point: Point, size: Size, boundaries: RulerBoundaries): Point {
	const { horizontal, vertical } = boundaries;
	return {
		x: Math.max(horizontal.start, Math.min(point.x, horizontal.end - size.width)),
		y: Math.max(vertical.start, Math.min(point.y, vertical.end - size.height))
	};
}

/** Where a dragged element ends up: moved by `delta`, snapped to the boundaries, then clamped inside them. */
export function dragPosition(
	start: Point,
	delta: Point,
	size: Size,
	boundaries: RulerBoundaries
): Point {
	const { horizontal, vertical } = boundaries;
	const snapped = {
		x: snapToBoundaries(start.x + delta.x, horizontal.start, horizontal.end - size.width),
		y: snapToBoundaries(start.y + delta.y, vertical.start, vertical.end - size.height)
	};
	return clampPosition(snapped, size, boundaries);
}

/** Fit an element into the boundaries after they moved: limit its size, enforce the minimum, clamp its position. */
export function constrainToBoundaries(element: Rect, boundaries: RulerBoundaries): Rect {
	const { horizontal, vertical } = boundaries;

	let width = Math.min(element.width, horizontal.end - horizontal.start);
	let height = Math.min(element.height, vertical.end - vertical.start);
	width = Math.max(width, MIN_ELEMENT_SIZE);
	height = Math.max(height, MIN_ELEMENT_SIZE);

	let x = Math.max(element.x, horizontal.start);
	let y = Math.max(element.y, vertical.start);
	if (x + width > horizontal.end) x = horizontal.end - width;
	if (y + height > vertical.end) y = vertical.end - height;

	return { x, y, width, height };
}

/**
 * Fit a group into the boundaries as one: it moves without changing the layout inside it. Only a group
 * too big for the boundaries is scaled down (keeping its proportions) until it fits.
 */
export function constrainGroupToBoundaries(rects: Rect[], boundaries: RulerBoundaries): Rect[] {
	const box = boundingRect(rects);
	if (!box) return [];
	const { horizontal, vertical } = boundaries;

	const factor = Math.min(
		1,
		(horizontal.end - horizontal.start) / box.width,
		(vertical.end - vertical.start) / box.height
	);
	const width = box.width * factor;
	const height = box.height * factor;
	const x = Math.max(horizontal.start, Math.min(box.x, horizontal.end - width));
	const y = Math.max(vertical.start, Math.min(box.y, vertical.end - height));

	return rects.map((r) => ({
		x: x + (r.x - box.x) * factor,
		y: y + (r.y - box.y) * factor,
		width: r.width * factor,
		height: r.height * factor
	}));
}

/**
 * What has to change so every element fits the boundaries: elements of a group are fitted together,
 * the others one by one. Returns only the elements that change.
 */
export function boundaryAdjustments(
	elements: TCanvasElement[],
	boundaries: RulerBoundaries
): Record<string, Rect> {
	const groups: Record<string, TCanvasElement[]> = {};
	const fitted: Array<[TCanvasElement, Rect]> = [];

	for (const el of elements) {
		if (el.groupId) (groups[el.groupId] ??= []).push(el);
		else fitted.push([el, constrainToBoundaries(el, boundaries)]);
	}
	for (const members of Object.values(groups)) {
		const rects = constrainGroupToBoundaries(members, boundaries);
		members.forEach((el, i) => fitted.push([el, rects[i]]));
	}

	const changes: Record<string, Rect> = {};
	for (const [el, next] of fitted) {
		if (
			next.x !== el.x ||
			next.y !== el.y ||
			next.width !== el.width ||
			next.height !== el.height
		) {
			changes[el.id] = next;
		}
	}
	return changes;
}

/** New rectangle while resizing from a handle, `delta` being how far the pointer moved. */
export function resizeRect(
	start: Rect,
	direction: ResizeDirection,
	delta: Point,
	boundaries: RulerBoundaries
): Rect {
	const { horizontal, vertical } = boundaries;
	let { x, y, width, height } = start;

	if (direction.includes('e')) {
		width = Math.max(MIN_ELEMENT_SIZE, start.width + delta.x);
	}
	if (direction.includes('w')) {
		width = Math.max(MIN_ELEMENT_SIZE, start.width - delta.x);
		x = Math.max(horizontal.start, start.x + delta.x);
	}
	if (direction.includes('s')) {
		height = Math.max(MIN_ELEMENT_SIZE, start.height + delta.y);
	}
	if (direction.includes('n')) {
		height = Math.max(MIN_ELEMENT_SIZE, start.height - delta.y);
		y = Math.max(vertical.start, start.y + delta.y);
	}

	if (x + width > horizontal.end) width = horizontal.end - x;
	if (y + height > vertical.end) height = vertical.end - y;

	return { x, y, width, height };
}

/** Default size of a new element dropped at `point`: to the right boundary, at most 500px tall, at least 100x50. */
function newElementSize(point: Point, boundaries: RulerBoundaries): Size {
	const { horizontal, vertical } = boundaries;
	const MIN_WIDTH = 100;
	const MIN_HEIGHT = 50;
	const MAX_HEIGHT = 500;

	let width = horizontal.end - point.x;
	let height = Math.min(MAX_HEIGHT, vertical.end - point.y);
	if (width < MIN_WIDTH) width = Math.min(MIN_WIDTH, horizontal.end - horizontal.start);
	if (height < MIN_HEIGHT) height = Math.min(MIN_HEIGHT, vertical.end - vertical.start);
	return { width, height };
}

/** The preview rectangle shown while dragging a new element over the page, anchored at `pointer`. */
export function dragPreviewRect(pointer: Point, boundaries: RulerBoundaries): Rect {
	const size = newElementSize(pointer, boundaries);
	return { ...clampPosition(pointer, size, boundaries), ...size };
}

/**
 * Where and how big a new element is when dropped at `point`: the default size, snapped to
 * the boundaries (snapping to the left edge makes it full width), kept inside them, and
 * parented to the topmost existing element under it.
 */
export function newElementPlacement(
	point: Point,
	boundaries: RulerBoundaries,
	elements: TCanvasElement[]
): Rect & { parentElementId: string | null } {
	const { horizontal, vertical } = boundaries;
	const size = newElementSize(point, boundaries);
	let { width } = size;
	const { height } = size;
	let { x, y } = point;

	if (Math.abs(x - horizontal.start) < SNAP_THRESHOLD) {
		x = horizontal.start;
		width = horizontal.end - horizontal.start;
	}
	if (Math.abs(x - horizontal.end) < SNAP_THRESHOLD) x = horizontal.end - width;
	if (Math.abs(y - vertical.start) < SNAP_THRESHOLD) y = vertical.start;
	if (Math.abs(y - vertical.end) < SNAP_THRESHOLD) y = vertical.end - height;

	const position = clampPosition({ x, y }, { width, height }, boundaries);
	const parent = findElementAt(elements, position);
	return { ...position, width, height, parentElementId: parent ? parent.id : null };
}
