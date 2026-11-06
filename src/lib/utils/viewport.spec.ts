import { describe, expect, it } from 'vitest';
import { DISPLAY_SCALE } from '../const/dimension';
import { displayScaleForWidth } from './viewport';

describe('displayScaleForWidth', () => {
	it('uses the full display scale on wide screens', () => {
		expect(displayScaleForWidth(1440)).toBe(DISPLAY_SCALE);
		expect(displayScaleForWidth(3840)).toBe(DISPLAY_SCALE);
	});

	it('uses the smallest scale on very narrow screens', () => {
		expect(displayScaleForWidth(360)).toBe(0.12);
		expect(displayScaleForWidth(200)).toBe(0.12);
	});

	it('shrinks linearly in between, rounded to 3 decimals', () => {
		expect(displayScaleForWidth(900)).toBe(0.235); // halfway: 0.12 + 0.5 * (0.35 - 0.12)
		expect(displayScaleForWidth(400)).toBe(0.129);
	});

	it('never decreases as the screen gets wider', () => {
		let previous = 0;
		for (let width = 300; width <= 1600; width += 50) {
			const scale = displayScaleForWidth(width);
			expect(scale).toBeGreaterThanOrEqual(previous);
			previous = scale;
		}
	});
});
