// Pure text helpers for the PDF renderer.

/** Apply a CSS text-transform to a string. */
export function applyTextTransform(text: string, transform: string | undefined): string {
	if (transform === 'uppercase') return text.toUpperCase();
	if (transform === 'lowercase') return text.toLowerCase();
	if (transform === 'capitalize')
		return text.replace(/(^|\s)(\p{L})/gu, (_m, space, letter) => space + letter.toUpperCase());
	return text;
}

/** The words of a measured line with the x position of each, for lines whose spacing the browser stretched (justify). */
export function splitWords(chars: string[], xs: number[]): Array<{ text: string; x: number }> {
	const words: Array<{ text: string; x: number }> = [];
	let start = -1;
	for (let i = 0; i <= chars.length; i++) {
		const isSpace = i === chars.length || /\s/.test(chars[i]);
		if (!isSpace && start < 0) start = i;
		if (isSpace && start >= 0) {
			words.push({ text: chars.slice(start, i).join(''), x: xs[start] });
			start = -1;
		}
	}
	return words;
}

/** Replace the characters a font cannot show with "?", so encoding never fails. */
export function replaceUnsupported(text: string, supported: ReadonlySet<number>): string {
	let out = '';
	for (const char of text) out += supported.has(char.codePointAt(0)!) ? char : '?';
	return out;
}
