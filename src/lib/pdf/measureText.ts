import { DISPLAY_SCALE } from '$lib/const/dimension';
import type { TextElement } from '$lib/types/canvas';

/** Padding of the editor's text box in CSS px at the display scale (Tailwind p-2) */
export const TEXT_PADDING = 8;

export interface MeasuredLine {
	/** The characters of the line, without trailing whitespace */
	chars: string[];
	/** Left edge of each character */
	xs: number[];
	left: number;
	right: number;
	/** Position of the baseline from the top of the box */
	baseline: number;
}

/**
 * Lay the element's text out the way the editor does and return the lines. The browser does the wrapping, so
 * line breaks, alignment and justification match exactly. All numbers are CSS px at the display scale,
 * relative to the top-left of the element's box.
 */
export async function measureText(el: TextElement): Promise<MeasuredLine[]> {
	if (!el.text) return [];
	const weight = el.fontWeight || '400';
	const style = el.fontStyle || 'normal';
	try {
		await document.fonts.load(`${style} ${weight} ${el.fontSize}px "${el.fontFamily}"`, el.text);
	} catch {
		// measure with whatever font the browser has
	}

	const probe = document.createElement('div');
	Object.assign(probe.style, {
		position: 'fixed',
		left: '-100000px',
		top: '0',
		visibility: 'hidden',
		boxSizing: 'border-box',
		width: `${el.width * DISPLAY_SCALE}px`,
		padding: `${TEXT_PADDING}px`,
		whiteSpace: 'pre-wrap',
		overflowWrap: 'break-word',
		fontFamily: `${el.fontFamily}, sans-serif`,
		fontSize: `${el.fontSize}px`,
		fontWeight: weight,
		fontStyle: style,
		textTransform: el.textTransform || 'none',
		textAlign: el.textAlign || 'left'
	});
	probe.textContent = el.text;
	document.body.appendChild(probe);

	// Where the baseline sits in a line: an empty inline-block rests on it
	const ruler = probe.cloneNode(false) as HTMLElement;
	ruler.style.width = 'auto';
	ruler.style.whiteSpace = 'nowrap';
	const letter = document.createElement('span');
	letter.textContent = 'x';
	const base = document.createElement('i');
	base.style.cssText = 'display:inline-block;width:0;height:0';
	letter.appendChild(base);
	ruler.appendChild(letter);
	document.body.appendChild(ruler);
	const letterRange = document.createRange();
	letterRange.selectNodeContents(letter.firstChild!);
	const ascent = base.getBoundingClientRect().bottom - letterRange.getBoundingClientRect().top;

	try {
		const origin = probe.getBoundingClientRect();
		const node = probe.firstChild as Text;
		const range = document.createRange();
		const rows: Array<MeasuredLine & { top: number }> = [];

		for (let i = 0; i < node.length; ) {
			const size = (node.data.codePointAt(i) ?? 0) > 0xffff ? 2 : 1;
			range.setStart(node, i);
			range.setEnd(node, i + size);
			const rect = range.getClientRects()[0];
			if (rect) {
				const top = rect.top - origin.top;
				let row = rows.find((r) => Math.abs(r.top - top) < rect.height / 2);
				if (!row) {
					row = {
						chars: [],
						xs: [],
						left: Infinity,
						right: -Infinity,
						baseline: top + ascent,
						top
					};
					rows.push(row);
				}
				row.chars.push(node.data.slice(i, i + size));
				row.xs.push(rect.left - origin.left);
				row.left = Math.min(row.left, rect.left - origin.left);
				row.right = Math.max(row.right, rect.right - origin.left);
			}
			i += size;
		}

		const lines: MeasuredLine[] = [];
		for (const row of rows) {
			while (row.chars.length && /\s/.test(row.chars[row.chars.length - 1])) {
				row.chars.pop();
				row.xs.pop();
			}
			// Text below the box is hidden, like the editor's overflow
			if (row.chars.length && row.top < el.height * DISPLAY_SCALE) lines.push(row);
		}
		return lines;
	} finally {
		probe.parentNode?.removeChild(probe);
		ruler.parentNode?.removeChild(ruler);
	}
}
