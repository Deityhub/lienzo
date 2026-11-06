// Runs in Chromium: real clipboard events with a DataTransfer
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { appStore } from '../stores/appStore.svelte.ts';
import { CLIPBOARD_TYPE } from '../utils/clipboard';
import { clipboard } from './clipboard.svelte';

let pageId: string;
let detach: () => void;

const shapeCount = () => Object.keys(appStore.getPages()[pageId].elements).length;
const ids = () => appStore.getSelectedElements().map((el) => el.id);

function add(type: 'shape' | 'text', x: number, y: number) {
	appStore.addElement({ type, x, y, pageId, width: 200, height: 100 });
	return appStore.getSelectedElement()!;
}

/** Fire a clipboard event on the document, like the browser does for Ctrl+C / X / V. */
function fire(
	type: 'copy' | 'cut' | 'paste',
	data = new DataTransfer(),
	target: EventTarget = document.body
) {
	const event = new ClipboardEvent(type, { clipboardData: data, bubbles: true, cancelable: true });
	target.dispatchEvent(event);
	return { event, data };
}

const wait = (ms = 50) => new Promise((resolve) => setTimeout(resolve, ms));

beforeEach(() => {
	appStore.initNewDocument();
	pageId = Object.keys(appStore.getPages())[0];
	appStore.setActivePage(null);
	window.getSelection()?.removeAllRanges();
	detach = clipboard.attach();
});
afterEach(() => detach());

describe('copy, cut and paste', () => {
	it('copy puts the elements on the clipboard and paste adds copies', () => {
		const a = add('shape', 300, 300);
		const { event, data } = fire('copy');

		expect(event.defaultPrevented).toBe(true);
		expect(data.getData(CLIPBOARD_TYPE)).toContain('"app":"lienzo"');
		expect(shapeCount()).toBe(1);

		const pasted = fire('paste', data);
		expect(pasted.event.defaultPrevented).toBe(true);
		expect(shapeCount()).toBe(2);
		expect(ids()).toHaveLength(1);
		expect(ids()[0]).not.toBe(a.id); // the copy is selected
		expect(appStore.getSelectedElement()).toMatchObject({ x: 340, y: 340 }); // offset from the original
	});

	it('further pastes of the same copy move a little more each time', () => {
		add('shape', 300, 300);
		const { data } = fire('copy');

		fire('paste', data);
		const first = appStore.getSelectedElement()!;
		fire('paste', data);
		const second = appStore.getSelectedElement()!;

		expect([first.x, second.x]).toEqual([340, 380]);
		expect(shapeCount()).toBe(3);
	});

	it('also puts readable text on the clipboard', () => {
		const t = add('text', 300, 300);
		appStore.updateElement({ elementId: t.id, updates: { text: 'Hello world' }, pageId });
		const { data } = fire('copy');
		expect(data.getData('text/plain')).toBe('Hello world');
	});

	it('cut removes the elements and paste brings them back', () => {
		add('shape', 300, 300);
		const { data } = fire('cut');

		expect(shapeCount()).toBe(0);
		fire('paste', data);
		expect(shapeCount()).toBe(1);
		expect(appStore.getSelectedElement()).toMatchObject({ x: 300, y: 300 }); // back where it was, not offset
	});

	it('copies a group as a group, under a new group id', () => {
		const a = add('shape', 300, 300);
		const b = add('shape', 600, 300);
		appStore.selectElements(pageId, [a.id, b.id]);
		appStore.groupSelected();
		const original = appStore.findElement(pageId, a.id)!.groupId;

		const { data } = fire('copy');
		fire('paste', data);

		const pasted = appStore.getSelectedElements();
		expect(pasted).toHaveLength(2);
		expect(pasted[0].groupId).toBeTruthy();
		expect(pasted[0].groupId).toBe(pasted[1].groupId);
		expect(pasted[0].groupId).not.toBe(original);
		expect(pasted[1].x - pasted[0].x).toBe(300);
	});

	it('pastes onto the page that was last clicked', () => {
		add('shape', 300, 300);
		const { data } = fire('copy');
		appStore.addPage();
		const other = Object.keys(appStore.getPages()).find((id) => id !== pageId)!;

		appStore.setActivePage(other);
		fire('paste', data);

		expect(Object.keys(appStore.getPages()[other].elements)).toHaveLength(1);
		expect(appStore.getSelectedElement()).toMatchObject({ pageId: other, x: 300, y: 300 }); // same spot on another page
	});

	it('pastes onto the first page when nothing was clicked and no page is on screen', () => {
		add('shape', 300, 300);
		const { data } = fire('copy');
		appStore.addPage();
		fire('paste', data);
		expect(appStore.getSelectedElement()?.pageId).toBe(pageId);
	});

	it('works without the custom clipboard format, using the text left with it', () => {
		const t = add('text', 300, 300);
		appStore.updateElement({ elementId: t.id, updates: { text: 'Same text' }, pageId });
		const { data } = fire('copy');

		const plainOnly = new DataTransfer();
		plainOnly.setData('text/plain', data.getData('text/plain')); // a browser that drops custom formats
		fire('paste', plainOnly);

		expect(shapeCount()).toBe(2);
	});

	it('leaves other pastes alone', () => {
		add('shape', 300, 300);
		const other = new DataTransfer();
		other.setData('text/plain', 'something copied elsewhere');

		const { event } = fire('paste', other);

		expect(event.defaultPrevented).toBe(false);
		expect(shapeCount()).toBe(1);
	});

	it('ignores clipboard content that is not valid', () => {
		const bad = new DataTransfer();
		bad.setData(
			CLIPBOARD_TYPE,
			'{"app":"lienzo","kind":"elements","version":1,"elements":[{"x":1}]}'
		);
		const { event } = fire('paste', bad);
		expect(event.defaultPrevented).toBe(false);
		expect(shapeCount()).toBe(0);
	});

	it('does nothing with nothing selected', () => {
		const { event, data } = fire('copy');
		expect(event.defaultPrevented).toBe(false);
		expect(data.getData(CLIPBOARD_TYPE)).toBe('');
	});

	it('leaves copy, cut and paste alone while typing in a field', () => {
		add('shape', 300, 300);
		const input = document.createElement('textarea');
		document.body.appendChild(input);

		const copy = fire('copy', new DataTransfer(), input);
		const cut = fire('cut', new DataTransfer(), input);
		const data = new DataTransfer();
		data.setData(CLIPBOARD_TYPE, '{}');
		const paste = fire('paste', data, input);

		expect([
			copy.event.defaultPrevented,
			cut.event.defaultPrevented,
			paste.event.defaultPrevented
		]).toEqual([false, false, false]);
		expect(shapeCount()).toBe(1);
		input.remove();
	});

	it('is one change for autosave', () => {
		add('shape', 300, 300);
		const { data } = fire('copy');
		const before = appStore.getRevision();
		fire('paste', data);
		expect(appStore.getRevision()).toBe(before + 1);
	});
});

describe('duplicate', () => {
	it('copies the selection right away, a little to the side', () => {
		const a = add('shape', 300, 300);

		clipboard.duplicate();

		expect(shapeCount()).toBe(2);
		expect(ids()[0]).not.toBe(a.id);
		expect(appStore.getSelectedElement()).toMatchObject({ x: 340, y: 340 });

		clipboard.duplicate(); // duplicating the copy moves on again
		expect(appStore.getSelectedElement()).toMatchObject({ x: 380, y: 380 });
	});

	it('does nothing with nothing selected', () => {
		clipboard.duplicate();
		expect(shapeCount()).toBe(0);
	});
});

describe('the buttons', () => {
	it('Copy then Paste works through the clipboard events the browser fires', async () => {
		add('shape', 300, 300);
		// the browser may refuse execCommand in a test: the copy is then kept for this tab
		clipboard.copy();
		await clipboard.paste();
		expect(shapeCount()).toBe(2);
	});

	it('Cut removes the elements', () => {
		add('shape', 300, 300);
		clipboard.cut();
		expect(shapeCount()).toBe(0);
	});
});

describe('pasting pictures', () => {
	async function pngFile(width = 40, height = 20) {
		const canvas = new OffscreenCanvas(width, height);
		const context = canvas.getContext('2d')!;
		context.fillStyle = '#dc2626';
		context.fillRect(0, 0, width, height);
		return new File([await canvas.convertToBlob({ type: 'image/png' })], 'shot.png', {
			type: 'image/png'
		});
	}

	it('a picture on the clipboard becomes an image element', async () => {
		const data = new DataTransfer();
		data.items.add(await pngFile());

		const { event } = fire('paste', data);
		expect(event.defaultPrevented).toBe(true);
		await vi.waitFor(() => expect(shapeCount()).toBe(1));

		const image = appStore.getSelectedElement()!;
		expect(image).toMatchObject({ type: 'image', alt: 'shot.png', width: 40, height: 20 });
		expect((image as { src: string }).src).toMatch(/^data:image\/png;base64,/);
	});

	it('several pictures become several elements, each a little further along', async () => {
		const data = new DataTransfer();
		data.items.add(await pngFile());
		data.items.add(await pngFile(60, 30));
		fire('paste', data);
		await vi.waitFor(() => expect(shapeCount()).toBe(2));

		const [first, second] = appStore.getSelectedElements();
		expect(first.y).not.toBe(second.y);
	});

	it('a picture that cannot be read is reported, and nothing is added', async () => {
		const alerts = vi.spyOn(window, 'alert').mockImplementation(() => {});
		const data = new DataTransfer();
		data.items.add(new File(['not a picture'], 'broken.png', { type: 'image/png' }));

		fire('paste', data);
		await vi.waitFor(() => expect(alerts).toHaveBeenCalled());

		expect(shapeCount()).toBe(0);
		alerts.mockRestore();
	});

	it('elements win when the clipboard has both elements and a picture', async () => {
		add('shape', 300, 300);
		const { data } = fire('copy');
		data.items.add(await pngFile());

		fire('paste', data);
		await wait();

		expect(shapeCount()).toBe(2); // the copied element, not an extra picture
	});
});
