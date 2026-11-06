/** How close the two margin markers of a ruler may get, in page pixels */
export const MIN_MARGIN_GAP = 50;

export interface Anchors {
	start: number;
	end: number;
}

/**
 * Move one margin marker of a ruler to `position` (page pixels). The marker stays on the ruler and never
 * gets closer than MIN_MARGIN_GAP to the other one.
 */
export function moveAnchor(
	which: 'start' | 'end',
	position: number,
	anchors: Anchors,
	size: number
): Anchors {
	const clamped = Math.max(0, Math.min(size, position));
	return which === 'start'
		? { start: Math.min(clamped, anchors.end - MIN_MARGIN_GAP), end: anchors.end }
		: { start: anchors.start, end: Math.max(clamped, anchors.start + MIN_MARGIN_GAP) };
}

/** Where a pointer is on a ruler, in page pixels. `offset` is the pointer's distance from the ruler's start edge. */
export function positionOnRuler(offset: number, size: number, displaySize: number): number {
	return offset * (size / displaySize);
}

/** The label for a marker, by ruler direction. */
export function anchorLabel(
	orientation: 'horizontal' | 'vertical',
	which: 'start' | 'end'
): string {
	if (orientation === 'horizontal') return which === 'start' ? 'Left margin' : 'Right margin';
	return which === 'start' ? 'Top margin' : 'Bottom margin';
}
