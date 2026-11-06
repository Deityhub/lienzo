// Copying and pasting elements: what goes on the clipboard and how a paste is placed. Pure: no DOM, no store.
import { validateDocument } from '../stores/migrations';
import type { DocumentPage, TCanvasElement } from '../types/canvas';
import { boundingRect } from './geometry';
import { placeOnPage } from './pageMove';
import { uuidv4 } from './uuid';

/** The clipboard format Lienzo puts its elements in */
export const CLIPBOARD_TYPE = 'application/x-lienzo-elements';

/** How far each paste is moved down and right, so a copy never hides its original */
export const PASTE_OFFSET = 40;

const MAX_ELEMENTS = 500;

export interface ClipboardPayload {
	app: 'lienzo';
	kind: 'elements';
	version: 1;
	/** Identifies one copy, so repeated pastes of it can be told apart */
	copyId: string;
	/** The page the elements were copied from */
	sourcePageId: string;
	elements: TCanvasElement[];
}

export function createPayload(elements: TCanvasElement[], sourcePageId: string): ClipboardPayload {
	return {
		app: 'lienzo',
		kind: 'elements',
		version: 1,
		copyId: uuidv4(),
		sourcePageId,
		// A JSON round trip: the elements may be reactive proxies, which structuredClone cannot copy
		elements: JSON.parse(JSON.stringify(elements))
	};
}

/** Image sources that are safe to load: embedded images and web addresses, never scripts or local files. */
const isSafeImageSource = (src: unknown) =>
	typeof src === 'string' && (src === '' || /^(data:image\/|https?:\/\/)/i.test(src));

/**
 * Read what is on the clipboard as Lienzo elements. Clipboard content can come from anywhere, so it is
 * checked like an imported document; anything that does not pass is ignored (null).
 */
export function parsePayload(text: string | null | undefined): ClipboardPayload | null {
	if (!text) return null;
	try {
		const data = JSON.parse(text);
		if (data?.app !== 'lienzo' || data.kind !== 'elements' || data.version !== 1) return null;
		if (typeof data.copyId !== 'string' || typeof data.sourcePageId !== 'string') return null;
		if (
			!Array.isArray(data.elements) ||
			!data.elements.length ||
			data.elements.length > MAX_ELEMENTS
		) {
			return null;
		}

		// Reuse the document check on the elements
		validateDocument({
			id: 'clipboard',
			name: 'clipboard',
			createdAt: 0,
			updatedAt: 0,
			pages: {
				p: {
					id: 'p',
					boundaries: { horizontal: { start: 0, end: 1 }, vertical: { start: 0, end: 1 } },
					elements: Object.fromEntries(
						data.elements.map((el: { id: string }, i: number) => [el?.id ?? i, el])
					)
				}
			}
		});
		if (
			data.elements.some((el: TCanvasElement) => el.type === 'image' && !isSafeImageSource(el.src))
		) {
			return null;
		}
		return data as ClipboardPayload;
	} catch {
		return null;
	}
}

/** Readable text for pasting into other apps: the text of the copied text elements, top to bottom. */
export function plainText(elements: TCanvasElement[]): string {
	const texts = elements
		.flatMap((el) => (el.type === 'text' ? [el] : []))
		.sort((a, b) => a.y - b.y || a.x - b.x)
		.map((el) => el.text);
	return texts.length
		? texts.join('\n')
		: `Lienzo: ${elements.length} element${elements.length > 1 ? 's' : ''}`;
}

/**
 * The elements as they are added to `page` by a paste: new ids and new groups (so a copy is never the
 * original), moved by one offset per paste, and fitted into the page's boundaries.
 * `pasteIndex` is how many times this copy was pasted already.
 */
export function pastedElements(
	payload: ClipboardPayload,
	page: DocumentPage,
	pasteIndex: number
): TCanvasElement[] {
	const groups: Record<string, string> = {};
	const fresh = [...payload.elements]
		.sort((a, b) => a.zIndex - b.zIndex)
		.map((el) => {
			const { groupId, ...rest } = el;
			return {
				...rest,
				id: uuidv4(),
				pageId: page.id,
				parentElementId: null,
				...(groupId && { groupId: (groups[groupId] ??= uuidv4()) })
			} as TCanvasElement;
		});

	const box = boundingRect(fresh)!;
	// On the page it came from, the first paste is already offset; on another page it keeps its position
	const steps = pasteIndex + (page.id === payload.sourcePageId ? 1 : 0);
	const { updates } = placeOnPage(
		fresh,
		{ x: box.x + steps * PASTE_OFFSET, y: box.y + steps * PASTE_OFFSET },
		page.boundaries
	);
	return fresh.map((el) => ({ ...el, ...updates[el.id] }) as TCanvasElement);
}

/** Size and position of a pasted picture: at most half the page content, keeping its proportions, centred near the top. */
export function pastedImageRect(
	natural: { width: number; height: number },
	page: DocumentPage,
	pasteIndex: number
) {
	const { horizontal, vertical } = page.boundaries;
	const areaWidth = horizontal.end - horizontal.start;
	const areaHeight = vertical.end - vertical.start;
	const scale = Math.min(1, (areaWidth * 0.5) / natural.width, (areaHeight * 0.5) / natural.height);
	const width = Math.max(20, Math.round(natural.width * scale));
	const height = Math.max(20, Math.round(natural.height * scale));

	const offset = pasteIndex * PASTE_OFFSET;
	return {
		width,
		height,
		x: Math.min(
			horizontal.end - width,
			Math.round(horizontal.start + (areaWidth - width) / 2) + offset
		),
		y: Math.min(vertical.end - height, vertical.start + offset)
	};
}
