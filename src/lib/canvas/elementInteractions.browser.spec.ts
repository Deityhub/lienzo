// Runs in Chromium (real DOM events), see the "client" project in vite.config.ts
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { appStore } from '../stores/appStore.svelte.ts';
import type { ResizeDirection, TCanvasElement } from '../types/canvas';
import { createElementDrag } from './elementDrag.svelte';
import { createElementResize } from './elementResize.svelte';
import { createMarquee } from './marquee.svelte';

// The canvas is 1000x1000 screen pixels showing a 2000x2000 page: every screen pixel is 2 page pixels.
const SIZE = { width: 2000, height: 2000 };

let canvas: HTMLDivElement;
let pageId: string;
let hovered: Array<string | null>;

const frame = () => new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
const frames = async () => {
	await frame();
	await frame();
};

function pointerEvent(type: string, x: number, y: number) {
	return new PointerEvent(type, { clientX: x, clientY: y, bubbles: true, cancelable: true });
}
const move = (x: number, y: number) => document.dispatchEvent(pointerEvent('pointermove', x, y));
const release = () => document.dispatchEvent(pointerEvent('pointerup', 0, 0));

function touchEvent(type: string, x: number, y: number) {
	const touch = new Touch({ identifier: 1, target: document.body, clientX: x, clientY: y });
	const active = type === 'touchend' || type === 'touchcancel' ? [] : [touch];
	return new TouchEvent(type, { touches: active, changedTouches: [touch], bubbles: true });
}

/** Add a shape through the store and return it. */
function addShape(x: number, y: number, width: number, height: number): TCanvasElement {
	appStore.addElement({ type: 'shape', x, y, pageId, width, height });
	return appStore.getSelectedElement()!;
}
const current = (element: TCanvasElement) => appStore.findElement(pageId, element.id)!;

const options = () => ({
	getCanvas: () => canvas,
	getPage: () => appStore.getPages()[pageId],
	getSize: () => SIZE
});

beforeEach(() => {
	appStore.initNewDocument();
	pageId = Object.keys(appStore.getPages())[0];
	hovered = [];

	canvas = document.createElement('div');
	canvas.style.cssText = 'position:fixed;left:0;top:0;width:1000px;height:1000px';
	document.body.appendChild(canvas);
});

afterEach(() => {
	canvas.remove();
	document.body.style.userSelect = '';
	document.body.style.touchAction = '';
});

describe('createElementDrag', () => {
	const makeDrag = () => createElementDrag({ ...options(), onHover: (id) => hovered.push(id) });

	it('moves the element by the pointer movement, scaled to page pixels', async () => {
		const el = addShape(300, 300, 100, 100);
		const drag = makeDrag();

		drag.start(pointerEvent('pointerdown', 50, 50), el);
		move(100, 80);
		await frames();

		expect(current(el)).toMatchObject({ x: 400, y: 360 }); // +50*2, +30*2
		release();
	});

	it('keeps the element inside the page boundaries', async () => {
		const el = addShape(300, 300, 100, 100);
		const drag = makeDrag();
		const { horizontal, vertical } = appStore.getPages()[pageId].boundaries;

		drag.start(pointerEvent('pointerdown', 0, 0), el);
		move(100000, 100000);
		await frames();
		expect(current(el).x).toBe(horizontal.end - 100);
		expect(current(el).y).toBe(vertical.end - 100);

		move(-100000, -100000);
		await frames();
		expect(current(el)).toMatchObject({ x: horizontal.start, y: vertical.start });
		release();
	});

	it('applies the final position on release even before an animation frame ran', () => {
		const el = addShape(300, 300, 100, 100);
		const drag = makeDrag();

		drag.start(pointerEvent('pointerdown', 0, 0), el);
		move(50, 50);
		release();

		expect(current(el)).toMatchObject({ x: 400, y: 400 });
	});

	it('tracks the drag state and locks text selection and touch scrolling meanwhile', () => {
		const el = addShape(300, 300, 100, 100);
		const drag = makeDrag();
		expect(drag.isDragging).toBe(false);

		drag.start(pointerEvent('pointerdown', 0, 0), el);
		expect(drag.isDragging).toBe(true);
		expect(document.body.style.userSelect).toBe('none');
		expect(document.body.style.touchAction).toBe('none');

		release();
		expect(drag.isDragging).toBe(false);
		expect(document.body.style.userSelect).toBe('');
		expect(document.body.style.touchAction).toBe('');
	});

	it('stops listening after the release', async () => {
		const el = addShape(300, 300, 100, 100);
		const drag = makeDrag();

		drag.start(pointerEvent('pointerdown', 0, 0), el);
		release();
		const landed = { ...current(el) };
		move(500, 500);
		await frames();

		expect(current(el)).toMatchObject({ x: landed.x, y: landed.y });
	});

	it('makes the element a child of the one under its centre, and highlights it while dragging', async () => {
		const parent = addShape(1000, 1000, 400, 400);
		const el = addShape(300, 300, 100, 100);
		const drag = makeDrag();

		// move the centre (350,350) to (1200,1200): +850 page px = 425 screen px
		drag.start(pointerEvent('pointerdown', 0, 0), el);
		move(425, 425);
		await frames();
		expect(hovered).toContain(parent.id);

		release();
		expect(current(el).parentElementId).toBe(parent.id);
		expect(hovered.at(-1)).toBeNull();
		expect(appStore.getSelectedElement()?.id).toBe(el.id);
	});

	it('leaves the element without a parent when dropped on empty space', () => {
		addShape(1000, 1000, 400, 400);
		const el = addShape(300, 300, 100, 100);
		const drag = makeDrag();

		drag.start(pointerEvent('pointerdown', 0, 0), el);
		move(10, 10);
		release();

		expect(current(el).parentElementId ?? null).toBeNull();
	});

	it('cancel() aborts without re-parenting and ignores further movement', async () => {
		const parent = addShape(1000, 1000, 400, 400);
		const el = addShape(300, 300, 100, 100);
		const drag = makeDrag();

		drag.start(pointerEvent('pointerdown', 0, 0), el);
		move(425, 425);
		await frames();
		const where = { x: current(el).x, y: current(el).y };

		drag.cancel();
		move(0, 0);
		release();
		await frames();

		expect(drag.isDragging).toBe(false);
		expect(current(el)).toMatchObject(where);
		expect(current(el).parentElementId ?? null).toBeNull();
		expect(parent.id).not.toBe(current(el).parentElementId);
		expect(document.body.style.userSelect).toBe('');
	});

	it('works with touch', async () => {
		const el = addShape(300, 300, 100, 100);
		const drag = makeDrag();

		drag.start(touchEvent('touchstart', 50, 50), el);
		document.dispatchEvent(touchEvent('touchmove', 100, 80));
		await frames();
		expect(current(el)).toMatchObject({ x: 400, y: 360 });

		document.dispatchEvent(touchEvent('touchend', 100, 80));
		expect(drag.isDragging).toBe(false);
	});

	it('ends the drag when the touch is cancelled', () => {
		const el = addShape(300, 300, 100, 100);
		const drag = makeDrag();

		drag.start(touchEvent('touchstart', 0, 0), el);
		document.dispatchEvent(touchEvent('touchcancel', 0, 0));

		expect(drag.isDragging).toBe(false);
	});

	describe('with several elements selected', () => {
		it('moves them all together by the same amount', async () => {
			const a = addShape(300, 300, 100, 100);
			const b = addShape(600, 500, 100, 100);
			appStore.selectElements(pageId, [a.id, b.id]);
			const drag = makeDrag();

			drag.start(pointerEvent('pointerdown', 0, 0), a);
			move(50, 30);
			await frames();

			expect(current(a)).toMatchObject({ x: 400, y: 360 });
			expect(current(b)).toMatchObject({ x: 700, y: 560 });
			release();
			expect(appStore.getSelectedElements().map((el) => el.id)).toEqual([a.id, b.id]);
		});

		it('keeps the whole group inside the boundaries, preserving the distance between elements', async () => {
			const a = addShape(300, 300, 100, 100);
			const b = addShape(600, 500, 100, 100);
			appStore.selectElements(pageId, [a.id, b.id]);
			const { horizontal } = appStore.getPages()[pageId].boundaries;
			const drag = makeDrag();

			drag.start(pointerEvent('pointerdown', 0, 0), a);
			move(100000, 0);
			await frames();

			expect(current(b).x).toBe(horizontal.end - 100); // the rightmost element reaches the edge
			expect(current(b).x - current(a).x).toBe(300);
			release();
		});

		it('dragging a member of a group moves the whole group, even when it is not selected', async () => {
			const a = addShape(300, 300, 100, 100);
			const b = addShape(600, 500, 100, 100);
			const c = addShape(900, 900, 100, 100);
			appStore.selectElements(pageId, [a.id, b.id]);
			appStore.groupSelected();
			appStore.selectElement(c);
			const drag = makeDrag();

			drag.start(pointerEvent('pointerdown', 0, 0), a);
			move(50, 30);
			await frames();

			expect(current(a)).toMatchObject({ x: 400, y: 360 });
			expect(current(b)).toMatchObject({ x: 700, y: 560 });
			expect(current(c)).toMatchObject({ x: 900, y: 900 });
			release();
		});

		it('dragging an element outside the selection selects just that element', async () => {
			const a = addShape(300, 300, 100, 100);
			const b = addShape(600, 500, 100, 100);
			const c = addShape(900, 900, 100, 100);
			appStore.selectElements(pageId, [a.id, b.id]);
			const drag = makeDrag();

			drag.start(pointerEvent('pointerdown', 0, 0), c);
			move(10, 0);
			await frames();

			expect(current(c).x).toBe(920);
			expect(current(a).x).toBe(300);
			expect(appStore.getSelectedElements().map((el) => el.id)).toEqual([c.id]);
			release();
		});
	});

	it('tells a click from a drag', async () => {
		const el = addShape(300, 300, 100, 100);
		const drag = makeDrag();

		drag.start(pointerEvent('pointerdown', 10, 10), el);
		move(11, 11);
		release();
		expect(drag.consumeMoved()).toBe(false);

		drag.start(pointerEvent('pointerdown', 10, 10), el);
		move(40, 40);
		release();
		expect(drag.consumeMoved()).toBe(true);
		expect(drag.consumeMoved()).toBe(false); // read once
	});
});

describe('createElementResize', () => {
	const rect = (el: TCanvasElement) => {
		const { x, y, width, height } = current(el);
		return { x, y, width, height };
	};
	const startResize = (el: TCanvasElement, direction: ResizeDirection, x = 0, y = 0) => {
		const resize = createElementResize(options());
		resize.start(pointerEvent('pointerdown', x, y), el, direction);
		return resize;
	};

	it('grows from the south-east handle by the scaled pointer movement', async () => {
		const el = addShape(300, 300, 200, 200);
		startResize(el, 'se');

		move(25, 10);
		await frames();

		expect(rect(el)).toEqual({ x: 300, y: 300, width: 250, height: 220 });
		release();
	});

	it('moves the origin with the north-west handle', async () => {
		const el = addShape(300, 300, 200, 200);
		startResize(el, 'nw');

		move(-10, -5);
		await frames();

		expect(rect(el)).toEqual({ x: 280, y: 290, width: 220, height: 210 });
		release();
	});

	it('never shrinks below the minimum size', async () => {
		const el = addShape(300, 300, 200, 200);
		startResize(el, 'se');

		move(-5000, -5000);
		await frames();

		expect(rect(el)).toMatchObject({ width: 20, height: 20 });
		release();
	});

	it('applies the final size on release even before an animation frame ran', () => {
		const el = addShape(300, 300, 200, 200);
		startResize(el, 'se');

		move(50, 0);
		release();

		expect(rect(el).width).toBe(300);
	});

	it('tracks the resize state and restores the body styles it changed', () => {
		document.body.style.userSelect = 'text';
		document.body.style.touchAction = 'pan-y';
		const el = addShape(300, 300, 200, 200);

		const resize = startResize(el, 'se');
		expect(resize.isResizing).toBe(true);
		expect(document.body.style.touchAction).toBe('none');

		release();
		expect(resize.isResizing).toBe(false);
		expect(document.body.style.userSelect).toBe('text');
		expect(document.body.style.touchAction).toBe('pan-y');
	});

	it('stops listening after the release', async () => {
		const el = addShape(300, 300, 200, 200);
		startResize(el, 'se');
		release();
		const done = rect(el);

		move(500, 500);
		await frames();

		expect(rect(el)).toEqual(done);
	});

	it('works with touch and ends when the touch is cancelled', async () => {
		const el = addShape(300, 300, 200, 200);
		const resize = createElementResize(options());

		resize.start(touchEvent('touchstart', 0, 0), el, 'se');
		document.dispatchEvent(touchEvent('touchmove', 25, 25));
		await frames();
		expect(rect(el)).toMatchObject({ width: 250, height: 250 });

		document.dispatchEvent(touchEvent('touchcancel', 25, 25));
		expect(resize.isResizing).toBe(false);
	});
});

describe('createMarquee', () => {
	it('selects the elements the box touches while it grows', () => {
		const a = addShape(200, 200, 100, 100);
		const b = addShape(800, 800, 100, 100);
		const far = addShape(1500, 1500, 100, 100);
		appStore.selectElement(null);
		const marquee = createMarquee(options());

		marquee.start(pointerEvent('pointerdown', 50, 50), false); // page 100,100
		move(250, 250); // page 500,500
		expect(marquee.box).toEqual({ x: 100, y: 100, width: 400, height: 400 });
		expect(appStore.getSelectedElements().map((el) => el.id)).toEqual([a.id]);

		move(500, 500); // page 1000,1000
		expect(appStore.getSelectedElements().map((el) => el.id)).toEqual([a.id, b.id]);
		expect(appStore.isSelected(far.id)).toBe(false);

		release();
		expect(marquee.box).toBeNull();
		expect(marquee.consumeMoved()).toBe(true);
	});

	it('selects a whole group when the box touches one of its members', () => {
		const a = addShape(200, 200, 100, 100);
		const b = addShape(1500, 1500, 100, 100);
		appStore.selectElements(pageId, [a.id, b.id]);
		appStore.groupSelected();
		appStore.selectElement(null);
		const marquee = createMarquee(options());

		marquee.start(pointerEvent('pointerdown', 50, 50), false);
		move(200, 200); // only touches a
		release();

		expect(
			appStore
				.getSelectedElements()
				.map((el) => el.id)
				.sort()
		).toEqual([a.id, b.id].sort());
	});

	it('adds to the current selection when additive', () => {
		const a = addShape(200, 200, 100, 100);
		const b = addShape(800, 800, 100, 100);
		appStore.selectElement(a);
		const marquee = createMarquee(options());

		marquee.start(pointerEvent('pointerdown', 350, 350), true);
		move(500, 500);

		expect(
			appStore
				.getSelectedElements()
				.map((el) => el.id)
				.sort()
		).toEqual([a.id, b.id].sort());
		release();
	});

	it('a press without movement is a click and changes nothing', () => {
		const a = addShape(200, 200, 100, 100);
		appStore.selectElement(a);
		const marquee = createMarquee(options());

		marquee.start(pointerEvent('pointerdown', 700, 700), false);
		move(701, 701);
		release();

		expect(marquee.consumeMoved()).toBe(false);
		expect(appStore.getSelectedElements().map((el) => el.id)).toEqual([a.id]);
	});
});
