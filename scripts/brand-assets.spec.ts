import { existsSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

// Guards the generated brand assets (scripts/generate-brand-assets.mjs): they must exist at the sizes
// the page, the manifest and social networks expect.

const png = (file: string) => {
	const bytes = readFileSync(`static/${file}`);
	expect(bytes.subarray(1, 4).toString()).toBe('PNG');
	return { width: bytes.readUInt32BE(16), height: bytes.readUInt32BE(20), bytes: bytes.length };
};

describe('social preview image', () => {
	it('is 1200x630, the size og:image declares, and small enough for every crawler', () => {
		const { width, height, bytes } = png('og-image.png');
		expect([width, height]).toEqual([1200, 630]);
		expect(bytes).toBeLessThan(600 * 1024);
	});

	it('is the size the page says it is', () => {
		const seo = readFileSync('src/lib/components/Seo.svelte', 'utf-8');
		expect(seo).toContain('og:image:width" content="1200"');
		expect(seo).toContain('og:image:height" content="630"');
	});
});

describe('app manifest', () => {
	const manifest = JSON.parse(readFileSync('static/favicon/site.webmanifest', 'utf-8'));

	it('lists icons that exist, at the sizes it declares', () => {
		expect(manifest.icons.length).toBeGreaterThanOrEqual(4);
		for (const icon of manifest.icons) {
			const { width, height } = png(icon.src.replace(/^\//, ''));
			expect(`${width}x${height}`, icon.src).toBe(icon.sizes);
		}
	});

	it('has separate "any" and "maskable" icons, never one image for both', () => {
		const purposes = manifest.icons.map((i: { purpose: string }) => i.purpose);
		expect(purposes).toContain('any');
		expect(purposes).toContain('maskable');
		const bySource = manifest.icons.map((i: { src: string }) => i.src);
		expect(new Set(bySource).size).toBe(bySource.length);
	});

	it('uses the brand colour', () => {
		expect(manifest.theme_color.toLowerCase()).toBe('#0f6cbd');
		const html = readFileSync('src/app.html', 'utf-8');
		expect(html).toContain('name="theme-color" content="#0f6cbd"');
	});
});

describe('favicons', () => {
	it('the touch icon is 180x180', () => {
		const { width, height } = png('favicon/apple-touch-icon.png');
		expect([width, height]).toEqual([180, 180]);
	});

	it('the .ico holds 16, 32 and 48 pixel images', () => {
		const ico = readFileSync('static/favicon/favicon.ico');
		expect(ico.readUInt16LE(2)).toBe(1); // an icon
		const count = ico.readUInt16LE(4);
		const sizes = Array.from({ length: count }, (_, i) => ico.readUInt8(6 + i * 16)).sort(
			(a, b) => a - b
		);
		expect(sizes).toEqual([16, 32, 48]);
	});

	it('the vector favicon is the layers alone: brand blue, white on a dark tab bar', () => {
		const svg = readFileSync('static/favicon/favicon.svg', 'utf-8');
		expect(svg).toContain('#0f6cbd');
		expect(svg).toContain('prefers-color-scheme:dark');
		expect(svg).toContain('#ffffff');
		expect(svg).not.toContain('<rect'); // no tile behind them
		expect(svg).not.toContain('#4F46E5'); // the old indigo
	});

	it('every icon the page links to exists', () => {
		const html = readFileSync('src/app.html', 'utf-8');
		for (const [, href] of html.matchAll(
			/rel="(?:icon|apple-touch-icon|manifest)" href="([^"]+)"/g
		)) {
			expect(existsSync(`static${href}`), href).toBe(true);
		}
	});
});
