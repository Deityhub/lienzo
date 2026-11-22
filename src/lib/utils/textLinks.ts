import type { TextLink } from '../types/canvas';

/** Default colour used for linked text when no per-link colour is set. */
export const DEFAULT_LINK_COLOR = '#0000EE';

/** Split a text element's text into segments, wrapping link spans so they can be rendered as anchors. */
export function textSegments(
	text: string,
	links: TextLink[] | undefined
): Array<{ text: string; link?: TextLink }> {
	const sorted = [...(links ?? [])].sort((a, b) => a.start - b.start || a.end - b.end);
	const segments: Array<{ text: string; link?: TextLink }> = [];
	let cursor = 0;
	for (const link of sorted) {
		const start = Math.max(0, Math.min(link.start, text.length));
		const end = Math.max(start, Math.min(link.end, text.length));
		if (end <= start) continue;
		if (start > cursor) {
			segments.push({ text: text.slice(cursor, start) });
		}
		segments.push({ text: text.slice(start, end), link });
		cursor = end;
	}
	if (cursor < text.length) segments.push({ text: text.slice(cursor) });
	return segments;
}

/** Clamp a link's character range to the bounds of the text, returning null if it collapses. */
export function clampLink(link: TextLink, textLength: number): TextLink | null {
	const start = Math.max(0, Math.min(Math.floor(link.start), textLength));
	const end = Math.max(start, Math.min(Math.floor(link.end), textLength));
	if (end <= start) return null;
	return { ...link, start, end };
}

/** Find the link that covers the given character index, if any. */
export function getLinkAt(
	text: string,
	links: TextLink[] | undefined,
	index: number
): TextLink | undefined {
	return (links ?? []).find((l) => index >= l.start && index < l.end);
}

/** Build a `mailto:` URL from an address. */
export function mailto(address: string): string {
	return `mailto:${address.trim()}`;
}

/** Whether a url string is an email (mailto) link. */
export function isEmailLink(url: string): boolean {
	return url.startsWith('mailto:');
}

/** The colour to render a link in, falling back to the default. */
export function linkColor(link: TextLink): string {
	return link.color ?? DEFAULT_LINK_COLOR;
}

/**
 * Convert a DOM selection into character offsets relative to `element`'s textContent.
 * Returns null when the selection is not inside `element` or is empty.
 */
export function selectionCharRange(
	element: HTMLElement | null
): { start: number; end: number } | null {
	if (!element) return null;
	const sel = document.getSelection();
	if (!sel || sel.rangeCount === 0) return null;
	const range = sel.getRangeAt(0);
	if (range.collapsed) return null;
	// Only count selections contained within this element
	if (!element.contains(range.commonAncestorContainer)) return null;

	const pre = range.cloneRange();
	pre.selectNodeContents(element);
	pre.setEnd(range.startContainer, range.startOffset);
	const start = pre.toString().length;
	const end = start + range.toString().length;
	return { start, end };
}

/**
 * Save a selection as character offsets relative to `element`'s textContent.
 */
export function selectionOffsets(element: HTMLElement): { start: number; end: number } | null {
	const sel = document.getSelection();
	if (!sel || sel.rangeCount === 0) return null;
	const range = sel.getRangeAt(0);
	const pre = range.cloneRange();
	pre.selectNodeContents(element);
	pre.setEnd(range.startContainer, range.startOffset);
	const start = pre.toString().length;
	const end = start + range.toString().length;
	return { start, end };
}

/**
 * Restore a selection by character offset within `element`'s text content.
 * Walks text nodes (including text inside link anchors) to place the caret.
 */
export function setSelectionByOffset(element: HTMLElement | null, offset: number): void {
	if (!element || offset < 0) return;
	const sel = document.getSelection();
	if (!sel) return;
	sel.removeAllRanges();
	const range = document.createRange();
	let count = 0;
	let found = false;
	const walk = document.createTreeWalker(element, NodeFilter.SHOW_TEXT, null);
	let node: Node | null = walk.nextNode();
	while (node) {
		const len = (node.textContent ?? '').length;
		if (count + len >= offset) {
			range.setStart(node, Math.max(0, offset - count));
			range.collapse(true);
			sel.addRange(range);
			found = true;
			break;
		}
		count += len;
		node = walk.nextNode();
	}
	if (!found) {
		// Offset is at the very end: place caret after the last text node
		const last = element.textContent ?? '';
		if (last.length > 0) {
			const range2 = document.createRange();
			// find last text node
			let lastNode: Node | null = null;
			const w2 = document.createTreeWalker(element, NodeFilter.SHOW_TEXT, null);
			let n: Node | null = w2.nextNode();
			while (n) {
				lastNode = n;
				n = w2.nextNode();
			}
			if (lastNode) {
				range2.setStart(lastNode, (lastNode.textContent ?? '').length);
				range2.collapse(true);
				sel.addRange(range2);
			}
		}
	}
}

/**
 * Adjust every link's character offsets after a contiguous text edit, so links
 * move with the text instead of staying glued to absolute positions.
 *
 * `editPos` is the index where the old text changed; `oldLen` is the number of
 * old characters removed there; `newLen` is the number of new characters
 * inserted there. `delta = newLen - oldLen`.
 */
export function adjustLinksForEdit(
	links: TextLink[],
	text: string,
	editPos: number,
	oldLen: number,
	newLen: number
): TextLink[] {
	const delta = newLen - oldLen;
	const max = text.length;
	return links
		.map((link) => {
			let start = link.start;
			let end = link.end;

			if (end <= editPos) {
				// Entirely before the edit: untouched
			} else if (start >= editPos) {
				// Entirely after the edit: shift by delta
				start = start + delta;
				end = end + delta;
			} else {
				// Straddles the edit: start stays, end moves with text after the edit
				end = end + delta;
			}

			start = Math.max(0, Math.min(Math.floor(start), max));
			end = Math.max(start, Math.min(Math.floor(end), max));
			if (end <= start) return null;
			return { ...link, start, end };
		})
		.filter((l): l is TextLink => l !== null);
}

/**
 * Given the previous and next text, compute the edit position and lengths, then
 * adjust links accordingly. Returns the adjusted links (or the originals if the
 * texts are identical).
 */
export function linksAfterTextChange(
	previousLinks: TextLink[],
	oldText: string,
	newText: string
): TextLink[] {
	if (oldText === newText) return previousLinks;
	let prefix = 0;
	const minLen = Math.min(oldText.length, newText.length);
	while (prefix < minLen && oldText[prefix] === newText[prefix]) prefix++;
	let oldSuffix = 0;
	let newSuffix = 0;
	while (
		oldSuffix < minLen - prefix &&
		oldText[oldText.length - 1 - oldSuffix] === newText[newText.length - 1 - newSuffix]
	) {
		oldSuffix++;
		newSuffix++;
	}
	const oldMiddleLen = oldText.length - prefix - oldSuffix;
	const newMiddleLen = newText.length - prefix - newSuffix;
	return adjustLinksForEdit(previousLinks, newText, prefix, oldMiddleLen, newMiddleLen);
}
