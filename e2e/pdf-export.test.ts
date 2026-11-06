import { expect, test } from '@playwright/test';
import fs from 'node:fs';
import * as pdfjs from 'pdfjs-dist/legacy/build/pdf.mjs';
import { seedDocument } from './helpers';

// 2x2 PNG, red and blue
const PNG =
	'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAIAAAD91JpzAAAAE0lEQVR4nGO4o6ammvyaAYiBLAAkaAU3/SddMwAAAABJRU5ErkJggg==';

const base = (id: string, extra: object) => ({
	id,
	pageId: 'p1',
	x: 150,
	y: 150,
	width: 1100,
	height: 200,
	zIndex: 0,
	...extra
});
const text = (id: string, extra: object) =>
	base(id, {
		type: 'text',
		text: 'The quick brown fox jumps over the lazy dog',
		fontFamily: 'Inter',
		fontSize: 34,
		fontWeight: '400',
		fontStyle: 'normal',
		color: '#111111',
		...extra
	});
const shape = (id: string, extra: object) =>
	base(id, {
		type: 'shape',
		strokeColor: '#1d4ed8',
		strokeWidth: 8,
		width: 300,
		height: 200,
		...extra
	});

const doc = {
	id: 'vector',
	schemaVersion: 1,
	name: 'Vector',
	createdAt: 1,
	updatedAt: 2,
	pages: {
		p1: {
			id: 'p1',
			boundaries: { horizontal: { start: 100, end: 2380 }, vertical: { start: 100, end: 3408 } },
			elements: {
				t1: text('t1', { text: 'Invoice #0042', fontWeight: '800', fontSize: 60, width: 1500 }),
				t2: text('t2', { y: 330, fontFamily: 'Merriweather', fontWeight: '300' }),
				t3: text('t3', {
					y: 520,
					fontFamily: 'Lato',
					fontWeight: '700',
					fontStyle: 'italic',
					textAlign: 'center',
					backgroundColor: '#ffe08a',
					backgroundOpacity: 0.6
				}),
				t4: text('t4', {
					y: 710,
					fontFamily: 'Poppins',
					fontWeight: '600',
					text: 'Résumé uppercase',
					textTransform: 'uppercase',
					textDecoration: 'underline'
				}),
				t5: text('t5', {
					y: 900,
					fontFamily: 'Playfair Display',
					fontWeight: '900',
					textAlign: 'justify',
					height: 300,
					text: 'Justified text wraps over several lines so that the browser decides where each line breaks. '.repeat(
						3
					)
				}),
				t6: text('t6', { y: 1250, fontFamily: 'Georgia', text: 'System font' }),
				s1: shape('s1', {
					x: 1300,
					y: 150,
					shapeType: 'rectangle',
					cornerRadius: 20,
					strokeStyle: 'dashed',
					fillColor: '#bfdbfe',
					fillOpacity: 0.5
				}),
				s2: shape('s2', {
					x: 1300,
					y: 450,
					shapeType: 'ellipse',
					fillColor: '#fecaca',
					fillOpacity: 1
				}),
				s3: shape('s3', { x: 1300, y: 750, shapeType: 'triangle', rotation: 30 }),
				s4: shape('s4', { x: 1300, y: 1050, shapeType: 'arrow-right', fillColor: '#bbf7d0' }),
				s5: shape('s5', { x: 1300, y: 1350, shapeType: 'line-horizontal', height: 20 }),
				i1: base('i1', {
					type: 'image',
					y: 1500,
					x: 150,
					src: PNG,
					alt: 'red',
					objectFit: 'fill',
					width: 400,
					height: 300,
					borderWidth: 6,
					borderColor: '#111111',
					borderRadius: 10
				})
			}
		}
	}
};

test('exports a PDF with real text, vector shapes and a single image', async ({ page }) => {
	await seedDocument(page, doc);
	await page.getByRole('button', { name: 'Edit' }).click();
	await expect(page.locator('textarea').first()).toBeVisible();

	await page.getByTestId('export-btn').click();
	await page.getByRole('dialog').getByRole('button', { name: 'Preview PDF' }).click();
	const download = page.waitForEvent('download');
	await page.getByRole('dialog').getByRole('button', { name: 'Export PDF' }).click();
	const file = await download;
	const path = (await file.path())!;
	if (process.env.KEEP_PDF) fs.copyFileSync(path, process.env.KEEP_PDF);

	const pdf = await pdfjs.getDocument({
		data: new Uint8Array(fs.readFileSync(path)),
		standardFontDataUrl: 'node_modules/pdfjs-dist/standard_fonts/'
	}).promise;
	expect(pdf.numPages).toBe(1);
	const pdfPage = await pdf.getPage(1);
	const [, , width, height] = pdfPage.view;
	expect(width).toBeCloseTo(595.2, 0);
	expect(height).toBeCloseTo(841.9, 0);

	// Real, selectable text
	const content = await pdfPage.getTextContent();
	const items = content.items.filter(
		(i): i is (typeof content.items)[number] & { str: string } => 'str' in i && !!i.str.trim()
	);
	const all = items.map((i) => i.str).join(' ');
	expect(all).toContain('Invoice #0042');
	expect(all).toContain('RÉSUMÉ UPPERCASE'); // text-transform applied to the text itself
	expect(all).toContain('System font');
	expect(new Set(items.map((i) => i.fontName)).size).toBeGreaterThanOrEqual(5); // one font per family/weight

	// The headline sits where the editor draws it: box left + 8px padding at the display scale
	const headline = items.find((i) => i.str === 'Invoice #0042')!;
	const pt = 595.2 / 2480;
	expect(headline.transform[4]).toBeCloseTo(150 * pt + (8 / 0.35) * pt, 0);

	// Only the picture is an image, everything else is vector
	const ops = await pdfPage.getOperatorList();
	expect(ops.fnArray.filter((fn) => fn === pdfjs.OPS.paintImageXObject)).toHaveLength(1);
});

test('tells the user when an image cannot be included, and still exports the rest', async ({
	page
}) => {
	const broken = JSON.parse(JSON.stringify(doc));
	broken.pages.p1.elements.i1.src = 'data:image/png;base64,AAAA'; // not a real image
	await seedDocument(page, broken);
	await page.getByRole('button', { name: 'Edit' }).click();
	await expect(page.locator('textarea').first()).toBeVisible();

	const dialogs: string[] = [];
	page.on('dialog', (d) => {
		dialogs.push(d.message());
		void d.dismiss();
	});
	await page.getByTestId('export-btn').click();
	await page.getByRole('dialog').getByRole('button', { name: 'Preview PDF' }).click();
	const download = page.waitForEvent('download');
	await page.getByRole('dialog').getByRole('button', { name: 'Export PDF' }).click();
	await download;

	await expect.poll(() => dialogs.join('\n')).toContain('could not be included');
});
