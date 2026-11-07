import { describe, expect, it } from 'vitest';
import { MIN_MARGIN_GAP, anchorLabel, moveAnchor, positionOnRuler } from './rulerAnchors';

const anchors = { start: 100, end: 2380 };

describe('moveAnchor', () => {
	it('moves a marker to the position', () => {
		expect(moveAnchor('start', 300, anchors, 2480)).toEqual({ start: 300, end: 2380 });
		expect(moveAnchor('end', 2000, anchors, 2480)).toEqual({ start: 100, end: 2000 });
	});

	it('keeps a marker on the ruler', () => {
		expect(moveAnchor('start', -50, anchors, 2480).start).toBe(0);
		expect(moveAnchor('end', 9999, anchors, 2480).end).toBe(2480);
	});

	it('never lets the markers get closer than the minimum gap', () => {
		expect(moveAnchor('start', 2370, anchors, 2480).start).toBe(2380 - MIN_MARGIN_GAP);
		expect(moveAnchor('end', 120, anchors, 2480).end).toBe(100 + MIN_MARGIN_GAP);
	});

	it('leaves the other marker alone', () => {
		expect(moveAnchor('start', 500, anchors, 2480).end).toBe(2380);
		expect(moveAnchor('end', 500, anchors, 2480).start).toBe(100);
	});
});

describe('positionOnRuler', () => {
	it('turns screen pixels into page pixels', () => {
		expect(positionOnRuler(434, 2480, 868)).toBeCloseTo(1240); // the middle
		expect(positionOnRuler(0, 2480, 868)).toBe(0);
	});
});

describe('anchorLabel', () => {
	it('names the markers by direction', () => {
		expect(anchorLabel('horizontal', 'start')).toBe('Left margin');
		expect(anchorLabel('horizontal', 'end')).toBe('Right margin');
		expect(anchorLabel('vertical', 'start')).toBe('Top margin');
		expect(anchorLabel('vertical', 'end')).toBe('Bottom margin');
	});
});
