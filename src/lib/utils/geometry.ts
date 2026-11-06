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

/** The preview rectangle shown while dragging a new element over the page, anchored at `pointer`. */
export function dragPreviewRect(pointer: Point, boundaries: RulerBoundaries): Rect {
	const { horizontal, vertical } = boundaries;
	const MIN_WIDTH = 100;
	const MIN_HEIGHT = 50;
	const MAX_HEIGHT = 500;

	let width = horizontal.end - pointer.x;
	let height = Math.min(MAX_HEIGHT, vertical.end - pointer.y);
	if (width < MIN_WIDTH) width = Math.min(MIN_WIDTH, horizontal.end - horizontal.start);
	if (height < MIN_HEIGHT) height = Math.min(MIN_HEIGHT, vertical.end - vertical.start);

	const { x, y } = clampPosition(pointer, { width, height }, boundaries);
	return { x, y, width, height };
}
