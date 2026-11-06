import type { Point } from '../utils/geometry';

/** Screen position of a mouse, pointer or (first) touch event. */
export function eventPoint(event: PointerEvent | MouseEvent | TouchEvent): Point {
	const source = 'touches' in event ? event.touches[0] : event;
	return { x: source.clientX, y: source.clientY };
}

/**
 * Follow a pointer (mouse, pen or finger) across the whole document until it is released or cancelled.
 * Returns a function that stops tracking; it is also safe to call after `onEnd`.
 */
export function trackPointer(handlers: {
	onMove: (point: Point) => void;
	onEnd: () => void;
}): () => void {
	const onPointerMove = (e: PointerEvent) => handlers.onMove(eventPoint(e));
	const onTouchMove = (e: TouchEvent) => handlers.onMove(eventPoint(e));
	const onEnd = () => handlers.onEnd();
	const touchMoveOptions: AddEventListenerOptions = { passive: false };

	document.addEventListener('pointermove', onPointerMove);
	document.addEventListener('pointerup', onEnd, true);
	document.addEventListener('touchmove', onTouchMove, touchMoveOptions);
	document.addEventListener('touchend', onEnd, true);
	document.addEventListener('touchcancel', onEnd, true);

	return () => {
		document.removeEventListener('pointermove', onPointerMove);
		document.removeEventListener('pointerup', onEnd, true);
		document.removeEventListener('touchmove', onTouchMove, touchMoveOptions);
		document.removeEventListener('touchend', onEnd, true);
		document.removeEventListener('touchcancel', onEnd, true);
	};
}
