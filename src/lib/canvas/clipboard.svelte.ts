import { appStore } from '../stores/appStore.svelte.ts';
import type { ImageElement } from '../types/canvas';
import {
	CLIPBOARD_TYPE,
	createPayload,
	parsePayload,
	pastedElements,
	pastedImageRect,
	plainText,
	type ClipboardPayload
} from '../utils/clipboard';
import { targetPageId } from './targetPage';
import { readImageFile } from '../utils/imageFile';
import { getDefaultProperties } from '../utils/properties';

const MAX_PICTURES = 10;

/** The last thing copied in this tab: pasting works from it too, e.g. from a button, where the browser gives no clipboard. */
let memory: { payload: ClipboardPayload; text: string } | null = null;
/** How often each copy was pasted, to move every paste a little further */
const pasteCounts: Record<string, number> = {};
let pictureCount = 0;

/** A field where typing, copying and pasting must keep working normally. */
const isEditable = (target: EventTarget | null) =>
	target instanceof Element &&
	!!target.closest('input, textarea, select, [contenteditable="true"]');

/** Is some text selected on the page? Then copying means copying that. */
const hasTextSelection = () => !!window.getSelection()?.toString();

function remember(cut = false) {
	const selected = appStore.getSelectedElements();
	if (!selected.length) return null;
	memory = {
		payload: createPayload(selected, cut ? '' : selected[0].pageId),
		text: plainText(selected)
	};
	return memory;
}

function pastePayload(payload: ClipboardPayload) {
	const pageId = targetPageId();
	const page = pageId ? appStore.getPages()[pageId] : null;
	if (!pageId || !page) return false;

	const index = pasteCounts[payload.copyId] ?? 0;
	pasteCounts[payload.copyId] = index + 1;
	appStore.addElements(pageId, pastedElements(payload, page, index));
	return true;
}

/** Pictures from the clipboard (a screenshot, a copied image) become image elements. */
async function pastePictures(files: File[]) {
	const pageId = targetPageId();
	const page = pageId ? appStore.getPages()[pageId] : null;
	if (!pageId || !page) return;

	const added: ImageElement[] = [];
	for (const file of files.slice(0, MAX_PICTURES)) {
		try {
			const image = await readImageFile(file);
			const rect = pastedImageRect(image, page, pictureCount++);
			added.push({
				...(getDefaultProperties({ type: 'image', pageId, ...rect }) as ImageElement),
				src: image.src,
				alt: file.name || 'Pasted image'
			});
		} catch (error) {
			console.error('Could not paste the picture: ', error);
			alert(error instanceof Error ? error.message : 'The picture could not be pasted.');
		}
	}
	if (added.length) appStore.addElements(pageId, added);
}

function onCopy(event: ClipboardEvent, cut = false) {
	if (isEditable(event.target) || hasTextSelection() || !event.clipboardData) return;
	const pageId = appStore.getSelectedElements()[0]?.pageId;
	const copied = remember(cut);
	if (!copied) return;

	event.clipboardData.setData(CLIPBOARD_TYPE, JSON.stringify(copied.payload));
	event.clipboardData.setData('text/plain', copied.text);
	event.preventDefault();
	if (cut) {
		appStore.deleteElements(
			copied.payload.elements.map((el) => el.id),
			pageId
		);
	}
}

function onPaste(event: ClipboardEvent) {
	if (isEditable(event.target) || hasTextSelection() || !event.clipboardData) return;
	const data = event.clipboardData;

	// Elements copied in Lienzo (maybe in another tab or document)
	let payload = parsePayload(data.getData(CLIPBOARD_TYPE));
	// The browser may not hand over custom formats: the text we put alongside identifies our last copy
	if (!payload && memory && data.getData('text/plain') === memory.text) payload = memory.payload;
	if (payload) {
		event.preventDefault();
		pastePayload(payload);
		return;
	}

	const pictures = Array.from(data.files).filter((file) => file.type.startsWith('image/'));
	if (pictures.length) {
		event.preventDefault();
		void pastePictures(pictures);
	}
}

/** Ask the browser to copy, so the system clipboard is filled too; works from a click. */
function copyViaBrowser(cut: boolean) {
	if (!appStore.getSelectedElements().length) return;
	const handler = (event: ClipboardEvent) => onCopy(event, cut);
	document.addEventListener('copy', handler, { once: true });
	if (!document.execCommand('copy')) {
		document.removeEventListener('copy', handler);
		remember(cut); // no system clipboard: keep it for pasting in this tab
		if (cut) {
			const selected = appStore.getSelectedElements();
			appStore.deleteElements(
				selected.map((el) => el.id),
				selected[0].pageId
			);
		}
	}
}

export const clipboard = {
	copy: () => copyViaBrowser(false),
	cut: () => copyViaBrowser(true),

	/** Copy the selection and paste it right away, a little to the side. */
	duplicate() {
		const selected = appStore.getSelectedElements();
		if (!selected.length) return;
		const page = appStore.getPages()[selected[0].pageId];
		appStore.addElements(page.id, pastedElements(createPayload(selected, page.id), page, 0));
	},

	/** Paste from this tab's last copy, or a picture on the system clipboard (the browser may ask first). */
	async paste() {
		if (memory) {
			pastePayload(memory.payload);
			return;
		}
		try {
			const files: File[] = [];
			for (const item of await navigator.clipboard.read()) {
				const type = item.types.find((t) => t.startsWith('image/'));
				if (type) files.push(new File([await item.getType(type)], 'Pasted image', { type }));
			}
			await pastePictures(files);
		} catch {
			// no permission, or nothing there: nothing to paste
		}
	},

	/** Listen for copy, cut and paste anywhere on the page. Returns a function that stops listening. */
	attach() {
		const copy = (event: ClipboardEvent) => onCopy(event);
		const cut = (event: ClipboardEvent) => onCopy(event, true);
		document.addEventListener('copy', copy);
		document.addEventListener('cut', cut);
		document.addEventListener('paste', onPaste);
		return () => {
			document.removeEventListener('copy', copy);
			document.removeEventListener('cut', cut);
			document.removeEventListener('paste', onPaste);
		};
	}
};
