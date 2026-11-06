import { describe, expect, it } from 'vitest';
import type { DocumentPage, TCanvasElement } from '../types/canvas';
import {
	createPayload,
	parsePayload,
	pastedElements,
	pastedImageRect,
	PASTE_OFFSET,
	plainText
} from './clipboard';

// content area x 100..700, y 100..1000
const page = (id = 'p2'): DocumentPage => ({
	id,
	elements: {},
	boundaries: { horizontal: { start: 100, end: 700 }, vertical: { start: 100, end: 1000 } }
});

const shape = (id: string, x: number, y: number, extra: object = {}) =>
	({
		id,
		type: 'shape',
		pageId: 'p1',
		zIndex: 0,
		x,
		y,
		width: 100,
		height: 100,
		shapeType: 'rectangle',
		strokeColor: '#000',
		strokeWidth: 1,
		...extra
	}) as TCanvasElement;
const text = (id: string, t: string, x: number, y: number, extra: object = {}) =>
	({
		id,
		type: 'text',
		pageId: 'p1',
		zIndex: 0,
		x,
		y,
		width: 100,
		height: 100,
		text: t,
		fontSize: 20,
		...extra
	}) as TCanvasElement;
const image = (id: string, src: string) =>
	({
		id,
		type: 'image',
		pageId: 'p1',
		zIndex: 0,
		x: 200,
		y: 200,
		width: 100,
		height: 100,
		src
	}) as TCanvasElement;

describe('createPayload and parsePayload', () => {
	it('round-trips elements through the clipboard text', () => {
		const elements = [shape('a', 200, 200), text('b', 'Hello', 300, 300)];
		const payload = createPayload(elements, 'p1');

		expect(parsePayload(JSON.stringify(payload))).toEqual(payload);
		expect(payload.sourcePageId).toBe('p1');
		expect(payload.copyId).toBeTruthy();
	});

	it('copies the elements, so later edits do not change what was copied', () => {
		const elements = [shape('a', 200, 200)];
		const payload = createPayload(elements, 'p1');
		elements[0].x = 999;
		expect(payload.elements[0].x).toBe(200);
	});

	it('ignores anything that is not Lienzo elements', () => {
		const good = createPayload([shape('a', 200, 200)], 'p1');
		const bad = (change: object) => parsePayload(JSON.stringify({ ...good, ...change }));

		expect(parsePayload(undefined)).toBeNull();
		expect(parsePayload('')).toBeNull();
		expect(parsePayload('just some text')).toBeNull();
		expect(parsePayload('{"hello":1}')).toBeNull();
		expect(bad({ app: 'other' })).toBeNull();
		expect(bad({ kind: 'document' })).toBeNull();
		expect(bad({ version: 2 })).toBeNull();
		expect(bad({ elements: [] })).toBeNull();
		expect(bad({ elements: 'x' })).toBeNull();
		expect(bad({ elements: [{ id: 'a', type: 'shape' }] })).toBeNull(); // missing geometry
		expect(bad({ elements: [{ ...shape('a', 1, 1), type: 'video' }] })).toBeNull();
	});

	it('rejects too many elements', () => {
		const many = Array.from({ length: 501 }, (_, i) => shape(`e${i}`, 200, 200));
		expect(parsePayload(JSON.stringify(createPayload(many, 'p1')))).toBeNull();
	});

	it('only accepts pictures from embedded data or web addresses', () => {
		const withSrc = (src: string) =>
			parsePayload(JSON.stringify(createPayload([image('i', src)], 'p1')));

		expect(withSrc('data:image/png;base64,AAAA')).not.toBeNull();
		expect(withSrc('https://example.com/a.png')).not.toBeNull();
		expect(withSrc('')).not.toBeNull();
		expect(withSrc('javascript:alert(1)')).toBeNull();
		expect(withSrc('file:///etc/passwd')).toBeNull();
		expect(withSrc('data:text/html,<script>alert(1)</script>')).toBeNull();
	});
});

describe('plainText', () => {
	it('is the text of the text elements, top to bottom', () => {
		expect(
			plainText([text('b', 'Second', 100, 400), text('a', 'First', 100, 100), shape('s', 0, 0)])
		).toBe('First\nSecond');
	});
	it('describes a copy without text', () => {
		expect(plainText([shape('s', 0, 0)])).toBe('Lienzo: 1 element');
		expect(plainText([shape('s', 0, 0), shape('t', 0, 0)])).toBe('Lienzo: 2 elements');
	});
});

describe('pastedElements', () => {
	it('gives every element a new id and puts it on the page, detached from any parent', () => {
		const payload = createPayload([shape('a', 200, 200, { parentElementId: 'x' })], 'p1');
		const [pasted] = pastedElements(payload, page(), 0);

		expect(pasted.id).not.toBe('a');
		expect(pasted).toMatchObject({ pageId: 'p2', parentElementId: null, type: 'shape' });
		expect(payload.elements[0].id).toBe('a'); // the copy itself is untouched
	});

	it('keeps a group together under a new group id', () => {
		const payload = createPayload(
			[
				shape('a', 200, 200, { groupId: 'g' }),
				shape('b', 400, 200, { groupId: 'g' }),
				shape('c', 200, 500)
			],
			'p1'
		);
		const [a, b, c] = pastedElements(payload, page(), 0);

		expect(a.groupId).toBeTruthy();
		expect(a.groupId).not.toBe('g');
		expect(b.groupId).toBe(a.groupId);
		expect(c).not.toHaveProperty('groupId');
	});

	it('keeps the layout and the stacking order of the elements', () => {
		const payload = createPayload(
			[shape('top', 400, 300, { zIndex: 5 }), shape('bottom', 200, 200, { zIndex: 1 })],
			'p1'
		);
		const [first, second] = pastedElements(payload, page('other'), 0);

		expect([first.zIndex, second.zIndex]).toEqual([1, 5]); // in stacking order
		expect(second.x - first.x).toBe(200);
		expect(second.y - first.y).toBe(100);
	});

	it('moves a paste on the page it came from, and each further paste a little more', () => {
		const payload = createPayload([shape('a', 200, 200)], 'p1');
		const at = (index: number) => pastedElements(payload, page('p1'), index)[0];

		expect(at(0)).toMatchObject({ x: 200 + PASTE_OFFSET, y: 200 + PASTE_OFFSET });
		expect(at(1)).toMatchObject({ x: 200 + 2 * PASTE_OFFSET, y: 200 + 2 * PASTE_OFFSET });
	});

	it('keeps the position on another page, then offsets further pastes', () => {
		const payload = createPayload([shape('a', 200, 200)], 'p1');

		expect(pastedElements(payload, page('p2'), 0)[0]).toMatchObject({ x: 200, y: 200 });
		expect(pastedElements(payload, page('p2'), 1)[0]).toMatchObject({
			x: 200 + PASTE_OFFSET,
			y: 200 + PASTE_OFFSET
		});
	});

	it('keeps the paste inside the page boundaries', () => {
		const payload = createPayload([shape('a', 590, 890)], 'p1'); // already at the bottom right
		expect(pastedElements(payload, page('p1'), 0)[0]).toMatchObject({ x: 600, y: 900 });
	});

	it('scales a copy that is too big for the page, text sizes included', () => {
		const payload = createPayload(
			[
				text('t', 'Big', 0, 0, { width: 1200, height: 300, fontSize: 40 }),
				shape('s', 0, 300, { width: 1200, height: 300 })
			],
			'p1'
		);
		const [t, s] = pastedElements(payload, page('p2'), 0);

		expect(t).toMatchObject({ width: 600, height: 150, fontSize: 20 });
		expect(s).toMatchObject({ width: 600, height: 150 });
	});
});

describe('pastedImageRect', () => {
	it('keeps a small picture its size and centres it near the top', () => {
		expect(pastedImageRect({ width: 200, height: 100 }, page(), 0)).toEqual({
			x: 300,
			y: 100,
			width: 200,
			height: 100
		});
	});

	it('shrinks a big picture to half the page content, keeping its proportions', () => {
		const rect = pastedImageRect({ width: 3000, height: 1500 }, page(), 0);
		expect(rect.width).toBe(300); // half of 600
		expect(rect.height).toBe(150);
	});

	it('limits a tall picture by the height', () => {
		const rect = pastedImageRect({ width: 1000, height: 4000 }, page(), 0);
		expect(rect.height).toBe(450); // half of 900
		expect(rect.width).toBe(113);
	});

	it('moves each further picture a little and keeps it on the page', () => {
		expect(pastedImageRect({ width: 200, height: 100 }, page(), 2)).toMatchObject({
			x: 380,
			y: 180
		});
		expect(pastedImageRect({ width: 200, height: 100 }, page(), 100)).toMatchObject({
			x: 500,
			y: 900
		});
	});
});
