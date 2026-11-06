import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

// Guards the colour tokens in app.css: text must stay readable in both themes.

const css = readFileSync('src/app.css', 'utf-8');

/** The `--name: h s% l%` declarations of one rule block. */
function tokens(selector: string): Record<string, [number, number, number]> {
	const start = css.indexOf(`${selector} {`);
	const block = css.slice(start, css.indexOf('\n}', start));
	const result: Record<string, [number, number, number]> = {};
	for (const [, name, h, s, l] of block.matchAll(
		/--([\w-]+):\s*([\d.]+)\s+([\d.]+)%\s+([\d.]+)%/g
	)) {
		result[name] = [Number(h), Number(s), Number(l)];
	}
	return result;
}

function luminance([h, s, l]: [number, number, number]) {
	const sat = s / 100;
	const light = l / 100;
	const a = sat * Math.min(light, 1 - light);
	const channel = (n: number) => {
		const k = (n + h / 30) % 12;
		const value = light - a * Math.max(-1, Math.min(k - 3, 9 - k, 1));
		return value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
	};
	return 0.2126 * channel(0) + 0.7152 * channel(8) + 0.0722 * channel(4);
}

function contrast(a: [number, number, number], b: [number, number, number]) {
	const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
	return (hi + 0.05) / (lo + 0.05);
}

// Text pairs that must reach 4.5:1 (WCAG AA), as [text token, background token]
const TEXT_PAIRS: Array<[string, string]> = [
	['foreground', 'background'],
	['foreground', 'surface'],
	['muted-foreground', 'background'],
	['muted-foreground', 'surface'],
	['muted-foreground', 'muted'],
	['primary-foreground', 'primary'],
	['primary-foreground', 'primary-dark'],
	['primary-text', 'background'],
	['primary-text', 'surface'],
	['destructive-foreground', 'destructive'],
	['destructive-foreground', 'destructive-dark'],
	['destructive-text', 'background'],
	['destructive-text', 'surface'],
	['success-foreground', 'success'],
	['warning-foreground', 'warning'],
	['secondary-foreground', 'secondary'],
	['accent-foreground', 'accent'],
	['card-foreground', 'card'],
	['popover-foreground', 'popover'],
	['paper-foreground', 'paper']
];

describe.each([
	['light', ':root'],
	['dark', '.dark']
])('%s theme colours', (_name, selector) => {
	const t = tokens(selector);

	it.each(TEXT_PAIRS)('%s on %s is readable (4.5:1)', (text, background) => {
		expect(t[text], `--${text}`).toBeDefined();
		expect(t[background], `--${background}`).toBeDefined();
		expect(contrast(t[text], t[background])).toBeGreaterThanOrEqual(4.5);
	});

	it('focus ring and input borders stand out from the page (3:1)', () => {
		expect(contrast(t.ring, t.background)).toBeGreaterThanOrEqual(3);
		expect(contrast(t.input, t.background)).toBeGreaterThanOrEqual(3);
	});
});

describe('the paper', () => {
	it('is the same white in both themes, so a document looks the same whatever the theme', () => {
		expect(tokens(':root').paper).toEqual(tokens('.dark').paper);
		expect(tokens(':root').paper).toEqual([0, 0, 100]);
	});
});
