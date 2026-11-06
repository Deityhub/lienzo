// Runs in Chromium (real window events), see the "client" project in vite.config.ts
import { describe, expect, it } from 'vitest';
import { trackDisplayScale } from './viewport';

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

describe('trackDisplayScale', () => {
	it('reports the scale right away and again after the window is resized, debounced', async () => {
		const scales: number[] = [];
		const stop = trackDisplayScale((scale) => scales.push(scale));

		await wait(50);
		expect(scales).toHaveLength(1);
		expect(scales[0]).toBeGreaterThan(0);

		// A burst of resize events results in a single update
		for (let i = 0; i < 5; i++) window.dispatchEvent(new Event('resize'));
		await wait(250);
		expect(scales).toHaveLength(2);

		stop();
	});

	it('stops reporting once stopped', async () => {
		const scales: number[] = [];
		const stop = trackDisplayScale((scale) => scales.push(scale));
		await wait(50);

		stop();
		window.dispatchEvent(new Event('resize'));
		await wait(250);

		expect(scales).toHaveLength(1);
	});
});
