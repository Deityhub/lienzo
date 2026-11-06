/**
 * Draws the brand assets: the favicons, the app icons and the social preview image.
 *
 *   node scripts/generate-brand-assets.mjs
 *
 * They all come from the same mark (the layers, see src/lib/icons/Logo.svelte), so
 * changing the brand means changing this file and running it again. Needs the Playwright browser
 * (`yarn playwright install chromium`).
 */
import { chromium } from '@playwright/test';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const root = resolve(import.meta.dirname, '..');
const BRAND = '#0f6cbd';

/**
 * The layers on a 32-unit square. `scale` sizes them (they fill 22 of the 32 units at 1); `background` puts
 * them on a tile, which only the icons that need an opaque or full-bleed image have.
 */
function mark({ color = BRAND, scale = 1.27, background = null, rx = 0 } = {}) {
	return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" width="32" height="32">
${background ? `<rect width="32" height="32" rx="${rx}" fill="${background}"/>` : ''}<g transform="translate(16 16) scale(${scale}) translate(-12 -12)" stroke="${color}">
<path d="M12 2L2 7L12 12L22 7L12 2Z" fill="${color}" stroke-linejoin="round"/>
<path d="M2 17L12 22L22 17" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
<path d="M2 12L12 17L22 12" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
</g>
</svg>`;
}

/** The browser-tab icon: blue on a light tab bar, white on a dark one */
const faviconSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="1 1 22 22" width="32" height="32">
<style>.l{stroke:${BRAND}}.f{fill:${BRAND}}@media (prefers-color-scheme:dark){.l{stroke:#ffffff}.f{fill:#ffffff}}</style>
<g class="l">
<path class="f" d="M12 2L2 7L12 12L22 7L12 2Z" stroke-linejoin="round"/>
<path d="M2 17L12 22L22 17" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
<path d="M2 12L12 17L22 12" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
</g>
</svg>
`;

const ICONS = [
	// "any": just the layers, on a transparent background
	{ file: 'favicon/favicon-96x96.png', size: 96, svg: mark() },
	{ file: 'favicon/web-app-manifest-192x192.png', size: 192, svg: mark() },
	{ file: 'favicon/web-app-manifest-512x512.png', size: 512, svg: mark() },
	// "maskable": full bleed, with the layers inside the safe zone, because the system cuts its own shape
	{
		file: 'favicon/web-app-manifest-maskable-192x192.png',
		size: 192,
		svg: mark({ background: '#ffffff', scale: 0.85 })
	},
	{
		file: 'favicon/web-app-manifest-maskable-512x512.png',
		size: 512,
		svg: mark({ background: '#ffffff', scale: 0.85 })
	},
	// iOS rounds the corners itself and does not like transparency
	{
		file: 'favicon/apple-touch-icon.png',
		size: 180,
		svg: mark({ background: '#ffffff', scale: 1 })
	}
];
const ICO_SIZES = [16, 32, 48];

const font = pathToFileURL(join(root, 'src/lib/fonts/inter/Inter-Variable-latin.woff2')).href;

const socialImage = `<!doctype html><html><head><style>
@font-face{font-family:Inter;src:url('${font}') format('woff2');font-weight:100 900}
*{box-sizing:border-box}
body{margin:0;width:1200px;height:630px;background:#1f1f1f;color:#fff;font-family:Inter,sans-serif;position:relative;overflow:hidden}
.glow{position:absolute;right:-120px;top:-160px;width:760px;height:760px;border-radius:50%;background:radial-gradient(closest-side,rgba(15,108,189,.35),transparent)}
.left{position:absolute;left:80px;top:72px;width:560px}
.brand{display:flex;align-items:center;gap:18px;font-size:36px;font-weight:600;letter-spacing:-.01em}
h1{margin:64px 0 0;font-size:62px;line-height:72px;white-space:nowrap;font-weight:600;letter-spacing:-.03em}
p{margin:28px 0 0;font-size:26px;line-height:36px;color:#d6d6d6}
.url{position:absolute;left:80px;bottom:56px;font-size:24px;font-weight:500;color:#479ef5}
.page{position:absolute;background:#fff;color:#242424}
.bar{position:absolute;height:9px;border-radius:5px;background:#d1d1d1}
</style></head><body>
<div class="glow"></div>
<div class="left">
<div class="brand">${mark({ color: '#ffffff', scale: 1.1 }).replace('width="32" height="32"', 'width="64" height="64"')}Lienzo</div>
<h1>Design it. Export it.<br>Edit it again.</h1>
<p>A free A4 document builder. Your PDF keeps real text and carries your editable document inside.</p>
</div>
<div class="url">lienzo.deityhub.com</div>
<div class="page" style="left:700px;top:120px;width:200px;height:283px">
<div style="position:absolute;left:20px;top:22px;font-size:19px;font-weight:700;letter-spacing:-.02em">Ada Lovelace</div>
<div style="position:absolute;left:20px;top:50px;font-size:10px;color:#616161">Analyst · London</div>
<div class="bar" style="left:20px;top:84px;width:150px"></div><div class="bar" style="left:20px;top:100px;width:150px"></div><div class="bar" style="left:20px;top:116px;width:110px"></div>
<div style="position:absolute;left:20px;top:146px;width:150px;height:1px;background:#d1d1d1"></div>
<div class="bar" style="left:20px;top:172px;width:150px;background:#e0e0e0"></div><div class="bar" style="left:20px;top:188px;width:150px;background:#e0e0e0"></div><div class="bar" style="left:20px;top:204px;width:90px;background:#e0e0e0"></div>
</div>
<div class="page" style="left:930px;top:200px;width:200px;height:283px;background:#ebf3fc;color:#0c3b5e">
<div style="position:absolute;left:20px;top:26px;width:130px;font-size:24px;line-height:26px;font-weight:700;letter-spacing:-.03em">Summer market</div>
<div style="position:absolute;left:20px;top:88px;font-size:10px;color:#115ea3">Saturday 14 June · Riverside</div>
<div style="position:absolute;left:108px;top:120px;width:72px;height:72px;border-radius:50%;background:#0f6cbd"></div>
<div style="position:absolute;left:20px;top:140px;width:62px;height:46px;border-radius:5px;border:2px solid #0f6cbd;background:#cfe4fa"></div>
<div style="position:absolute;left:20px;top:226px;padding:7px 14px;border-radius:4px;background:#0f6cbd;color:#fff;font-size:10px;font-weight:600">Reserve a stall</div>
</div>
</body></html>`;

/** An .ico holding PNG images, which every current browser reads */
function ico(images) {
	const header = Buffer.alloc(6 + images.length * 16);
	header.writeUInt16LE(1, 2); // type: icon
	header.writeUInt16LE(images.length, 4);
	let offset = header.length;
	images.forEach(({ size, data }, i) => {
		const entry = 6 + i * 16;
		header.writeUInt8(size, entry); // width and height (0 would mean 256)
		header.writeUInt8(size, entry + 1);
		header.writeUInt16LE(1, entry + 4); // colour planes
		header.writeUInt16LE(32, entry + 6); // bits per pixel
		header.writeUInt32LE(data.length, entry + 8);
		header.writeUInt32LE(offset, entry + 12);
		offset += data.length;
	});
	return Buffer.concat([header, ...images.map((i) => i.data)]);
}

const out = (file, data) => writeFileSync(join(root, 'static', file), data);

const browser = await chromium.launch();
const scratch = mkdtempSync(join(tmpdir(), 'lienzo-brand-'));
try {
	const page = await browser.newPage();

	/** Draw an SVG at a size, on a transparent background */
	async function png(svg, size) {
		await page.setViewportSize({ width: size, height: size });
		await page.setContent(
			`<body style="margin:0;background:transparent">${svg.replace('width="32" height="32"', `width="${size}" height="${size}"`)}</body>`
		);
		return page.screenshot({
			omitBackground: true,
			clip: { x: 0, y: 0, width: size, height: size }
		});
	}

	out('favicon/favicon.svg', faviconSvg);
	for (const { file, size, svg } of ICONS) out(file, await png(svg, size));
	out(
		'favicon/favicon.ico',
		ico(await Promise.all(ICO_SIZES.map(async (size) => ({ size, data: await png(mark(), size) }))))
	);

	const html = join(scratch, 'social.html');
	writeFileSync(html, socialImage);
	await page.setViewportSize({ width: 1200, height: 630 });
	await page.goto(pathToFileURL(html).href);
	await page.evaluate(() => document.fonts.ready);
	out('og-image.png', await page.screenshot());
} finally {
	await browser.close();
	rmSync(scratch, { recursive: true, force: true });
}
process.stdout.write('Brand assets written to static/\n');
