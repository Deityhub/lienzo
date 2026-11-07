import { describe, expect, it } from 'vitest';
import { fitImage } from './imageFit';

const box = { width: 200, height: 100 };
const natural = { width: 50, height: 100 };

describe('fitImage', () => {
	it('contain fits inside the box and centres', () => {
		expect(fitImage('contain', box, natural)).toEqual({ x: 75, y: 0, width: 50, height: 100 });
	});
	it('cover fills the box and overflows evenly', () => {
		expect(fitImage('cover', box, natural)).toEqual({ x: 0, y: -150, width: 200, height: 400 });
	});
	it('fill stretches to the box', () => {
		expect(fitImage('fill', box, natural)).toEqual({ x: 0, y: 0, width: 200, height: 100 });
	});
	it('anything else keeps the natural size, centred', () => {
		expect(fitImage('none', box, natural)).toEqual({ x: 75, y: 0, width: 50, height: 100 });
		expect(fitImage(undefined, box, natural)).toEqual({ x: 75, y: 0, width: 50, height: 100 });
	});
});
