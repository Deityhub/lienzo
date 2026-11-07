import { expect, test, type Page } from '@playwright/test';
import { seedDocument } from './helpers';

const boundaries = { horizontal: { start: 100, end: 2380 }, vertical: { start: 100, end: 3408 } };
const doc = {
	id: 'panel',
	schemaVersion: 1,
	name: 'Panel',
	createdAt: 1,
	updatedAt: 2,
	pages: {
		p1: {
			id: 'p1',
			boundaries,
			elements: {
				t: {
					id: 't',
					type: 'text',
					pageId: 'p1',
					zIndex: 0,
					x: 300,
					y: 300,
					width: 800,
					height: 200,
					text: 'Hello',
					fontFamily: 'Inter',
					fontSize: 40,
					fontWeight: '400',
					fontStyle: 'normal',
					color: '#000000'
				},
				s: {
					id: 's',
					type: 'shape',
					pageId: 'p1',
					zIndex: 1,
					x: 300,
					y: 800,
					width: 400,
					height: 300,
					shapeType: 'rectangle',
					strokeColor: '#1d4ed8',
					strokeWidth: 8
				}
			}
		}
	}
};

async function select(page: Page, index: number) {
	await seedDocument(page, doc);
	await page.getByRole('button', { name: 'Edit' }).click();
	await page.locator('[data-testid="document-canvas"] > .cursor-move').nth(index).click();
	await expect(page.getByTestId('property-panel')).toBeVisible();
}

/** The stored element, once autosave has written it */
async function stored(page: Page, id: string) {
	await expect(page.getByTestId('save-status')).toHaveText('Saved', { timeout: 10000 });
	return page.evaluate(
		(elementId) =>
			new Promise<Record<string, unknown>>((resolve, reject) => {
				const open = indexedDB.open('lienzo-db');
				open.onerror = () => reject(open.error);
				open.onsuccess = () => {
					const all = open.result.transaction('documents').objectStore('documents').getAll();
					all.onsuccess = () => resolve(all.result[0].pages.p1.elements[elementId]);
				};
			}),
		id
	);
}

test.describe('Property panel', () => {
	test('groups the text properties into Font, Paragraph and Colour', async ({ page }) => {
		await select(page, 0);
		const panel = page.getByTestId('property-panel');

		for (const title of [
			'Position and size',
			'Layering',
			'Copy and paste',
			'Font',
			'Paragraph',
			'Colour'
		]) {
			await expect(panel.getByRole('heading', { name: title, exact: true })).toBeVisible();
		}
	});

	test('alignment, style, decoration and capitalisation are buttons that show what is on', async ({
		page
	}) => {
		await select(page, 0);
		const align = (value: string) => page.getByTestId(`select-text-alignment-option-${value}`);

		await expect(align('left')).toHaveAttribute('aria-pressed', 'true');
		await align('center').click();
		await expect(align('center')).toHaveAttribute('aria-pressed', 'true');
		await expect(align('left')).toHaveAttribute('aria-pressed', 'false');

		await page.getByTestId('select-font-style-option-italic').click();
		await page.getByTestId('select-text-decoration-option-underline').click();
		await page.getByTestId('select-text-transform-option-uppercase').click();

		const element = await stored(page, 't');
		expect(element).toMatchObject({
			textAlign: 'center',
			fontStyle: 'italic',
			textDecoration: 'underline',
			textTransform: 'uppercase'
		});
	});

	test('the buttons are named for assistive technology', async ({ page }) => {
		await select(page, 0);
		await expect(page.getByRole('group', { name: 'Alignment' })).toBeVisible();
		await expect(page.getByRole('button', { name: 'Underline', exact: true })).toHaveAttribute(
			'aria-pressed',
			'false'
		);
	});

	test('a shape has Shape, Stroke and Fill sections, with the stroke style as buttons', async ({
		page
	}) => {
		await select(page, 1);
		const panel = page.getByTestId('property-panel');
		for (const title of ['Shape', 'Stroke', 'Fill']) {
			await expect(panel.getByRole('heading', { name: title, exact: true })).toBeVisible();
		}

		await page.getByTestId('select-stroke-style-option-dashed').click();
		expect(await stored(page, 's')).toMatchObject({ strokeStyle: 'dashed' });
	});
});

test.describe('Rulers', () => {
	test('the markers are labelled and report their value', async ({ page }) => {
		await seedDocument(page, doc);
		await page.getByRole('button', { name: 'Edit' }).click();

		const start = page.getByTestId('ruler-marker-start').first();
		await expect(start).toHaveAttribute('aria-label', 'Left margin');
		await expect(start).toHaveAttribute('aria-valuenow', '100');
		await expect(page.getByTestId('ruler-marker-end').first()).toHaveAttribute(
			'aria-label',
			'Right margin'
		);
		await expect(page.getByTestId('ruler-marker-start').nth(1)).toHaveAttribute(
			'aria-label',
			'Top margin'
		);
	});

	test('the arrow keys move a marker, and its value shows while it is focused', async ({
		page
	}) => {
		await seedDocument(page, doc);
		await page.getByRole('button', { name: 'Edit' }).click();
		const start = page.getByTestId('ruler-marker-start').first();

		await start.focus();
		await expect(page.getByTestId('ruler-tooltip')).toHaveText('Left margin 100');
		await page.keyboard.press('ArrowRight');
		await expect(start).toHaveAttribute('aria-valuenow', '110');
		await page.keyboard.press('Shift+ArrowRight');
		await expect(start).toHaveAttribute('aria-valuenow', '160');
		await expect(page.getByTestId('ruler-tooltip')).toHaveText('Left margin 160');
		await page.keyboard.press('ArrowLeft');
		await expect(start).toHaveAttribute('aria-valuenow', '150');

		await start.blur();
		await expect(page.getByTestId('ruler-tooltip')).toHaveCount(0);
	});

	test('dragging a marker shows its value, and it goes away on release', async ({ page }) => {
		await seedDocument(page, doc);
		await page.getByRole('button', { name: 'Edit' }).click();
		const start = page.getByTestId('ruler-marker-start').first();
		const box = (await start.boundingBox())!;

		await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
		await page.mouse.down();
		await page.mouse.move(box.x + 60, box.y + box.height / 2, { steps: 6 });
		await expect(page.getByTestId('ruler-tooltip')).toContainText('Left margin');
		const value = Number(await start.getAttribute('aria-valuenow'));
		expect(value).toBeGreaterThan(100);
		await page.mouse.up();

		await expect(page.getByTestId('ruler-tooltip')).toHaveCount(0);
		await expect(start).toHaveAttribute('aria-valuenow', String(value));
	});

	test('the markers keep their minimum distance from each other', async ({ page }) => {
		await seedDocument(page, doc);
		await page.getByRole('button', { name: 'Edit' }).click();
		const end = page.getByTestId('ruler-marker-end').first();
		await end.focus();

		await page.keyboard.press('Home'); // not a ruler key: nothing happens
		for (let i = 0; i < 60; i++) await page.keyboard.press('Shift+ArrowLeft');

		// the start marker is at 100, so the end cannot go below 150
		await expect(end).toHaveAttribute('aria-valuenow', '150');
	});
});

test.describe('Property panel on a phone', () => {
	test.use({ viewport: { width: 390, height: 844 } });

	test('is a bottom sheet that shows only its title until it is opened', async ({ page }) => {
		await select(page, 0);
		const panel = page.getByTestId('property-panel');
		const toggle = page.getByTestId('property-panel-toggle');

		await expect(page.getByTestId('property-panel-title')).toHaveText('Text Properties');
		await expect(toggle).toHaveAttribute('aria-expanded', 'false');
		await expect(panel.getByRole('heading', { name: 'Font', exact: true })).toBeHidden();
		const closed = (await panel.boundingBox())!;
		expect(closed.height).toBeLessThan(120); // a strip, not a wall over the page
		expect(closed.y + closed.height).toBeCloseTo(844 - 64, 0); // sits right above the 64px tool bar

		await toggle.click();
		await expect(toggle).toHaveAttribute('aria-expanded', 'true');
		await expect(panel.getByRole('heading', { name: 'Font', exact: true })).toBeVisible();
		const open = (await panel.boundingBox())!;
		expect(open.height).toBeGreaterThan(closed.height);
		expect(open.height).toBeLessThanOrEqual(844 * 0.55 + 1); // never more than 55% of the screen

		await toggle.click();
		await expect(panel.getByRole('heading', { name: 'Font', exact: true })).toBeHidden();
	});

	test('each group is a row of its own, and its controls scroll along it', async ({ page }) => {
		await select(page, 0);
		await page.getByTestId('property-panel-toggle').click();
		const panel = page.getByTestId('property-panel');

		// Paragraph holds three controls, side by side in one row
		const row = panel.locator('section', { hasText: 'Paragraph' }).locator('> div');
		const boxes = await Promise.all(
			['select-text-alignment', 'select-text-decoration', 'select-text-transform'].map(
				async (id) => (await page.getByTestId(id).boundingBox())!
			)
		);
		expect(boxes[0].y).toBeCloseTo(boxes[1].y, 0);
		expect(boxes[1].y).toBeCloseTo(boxes[2].y, 0);
		expect(boxes[1].x).toBeGreaterThan(boxes[0].x);
		// more controls than the screen is wide: the row scrolls, the page does not
		expect(await row.evaluate((el) => el.scrollWidth > el.clientWidth)).toBe(true);
		const overflow = await page.evaluate(
			() => document.documentElement.scrollWidth - document.documentElement.clientWidth
		);
		expect(overflow).toBeLessThanOrEqual(0);
	});

	test('a selection of several elements gets the same sheet', async ({ page }) => {
		await seedDocument(page, doc);
		await page.getByRole('button', { name: 'Edit' }).click();
		await page.getByTestId('multi-select-bar-btn').click(); // the header has no room for it on a phone
		const elements = page.locator('[data-testid="document-canvas"] > .cursor-move');
		await elements.nth(0).click();
		await elements.nth(1).click();

		await expect(page.getByTestId('property-panel-title')).toHaveText('2 elements selected');
		await expect(page.getByTestId('group-btn')).toBeHidden();
		await page.getByTestId('property-panel-toggle').click();
		await expect(page.getByTestId('group-btn')).toBeVisible();
	});
});
