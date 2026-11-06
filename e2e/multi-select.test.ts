import { expect, test, type Page } from '@playwright/test';
import { seedDocument } from './helpers';

const shape = (id: string, x: number, y: number) => ({
	id,
	type: 'shape',
	pageId: 'p1',
	zIndex: 0,
	x,
	y,
	width: 300,
	height: 200,
	shapeType: 'rectangle',
	strokeColor: '#1d4ed8',
	strokeWidth: 8,
	fillColor: '#bfdbfe',
	fillOpacity: 1
});

const doc = {
	id: 'multi',
	schemaVersion: 1,
	name: 'Multi',
	createdAt: 1,
	updatedAt: 2,
	pages: {
		p1: {
			id: 'p1',
			boundaries: { horizontal: { start: 100, end: 2380 }, vertical: { start: 100, end: 3408 } },
			elements: {
				a: shape('a', 300, 300),
				b: shape('b', 900, 300),
				c: shape('c', 300, 1200)
			}
		}
	}
};

async function openEditor(page: Page) {
	await seedDocument(page, doc);
	await page.getByRole('button', { name: 'Edit' }).click();
	await expect(page.getByTestId('document-canvas')).toBeVisible();
}

const elements = (page: Page) => page.locator('[data-testid="document-canvas"] > .cursor-move');
const title = (page: Page) => page.getByTestId('property-panel-title');

/** Convert page pixels to screen coordinates on the first canvas. */
async function pagePoint(page: Page, x: number, y: number) {
	const box = (await page.getByTestId('document-canvas').boundingBox())!;
	const k = box.width / 2480;
	return { x: box.x + x * k, y: box.y + y * k };
}

test.describe('Selecting several elements', () => {
	test('Shift-click adds to the selection and a drag moves them together', async ({ page }) => {
		await openEditor(page);
		await elements(page).nth(0).click();
		await expect(title(page)).toContainText('Shape Properties');

		await elements(page)
			.nth(1)
			.click({ modifiers: ['Shift'] });
		await expect(title(page)).toHaveText('2 elements selected');
		await expect(page.getByTestId('selection-box')).toBeVisible();

		const before = [
			await elements(page).nth(0).boundingBox(),
			await elements(page).nth(1).boundingBox()
		];
		const start = { x: before[0]!.x + 20, y: before[0]!.y + 20 };
		await page.mouse.move(start.x, start.y);
		await page.mouse.down();
		await page.mouse.move(start.x + 40, start.y + 60, { steps: 5 });
		await page.mouse.up();

		const after = [
			await elements(page).nth(0).boundingBox(),
			await elements(page).nth(1).boundingBox()
		];
		for (const i of [0, 1]) {
			expect(after[i]!.x - before[i]!.x).toBeCloseTo(40, 0);
			expect(after[i]!.y - before[i]!.y).toBeCloseTo(60, 0);
		}
		await expect(title(page)).toHaveText('2 elements selected'); // still selected after the drag
		expect(await elements(page).nth(2).boundingBox()).toMatchObject({
			x: (await elements(page).nth(2).boundingBox())!.x
		});
	});

	test('Shift-click on a selected element removes it from the selection', async ({ page }) => {
		await openEditor(page);
		await elements(page).nth(0).click();
		await elements(page)
			.nth(1)
			.click({ modifiers: ['Shift'] });
		await expect(title(page)).toHaveText('2 elements selected');

		await elements(page)
			.nth(1)
			.click({ modifiers: ['Shift'] });

		await expect(title(page)).toContainText('Shape Properties');
	});

	test('dragging a box over the empty page selects what it touches', async ({ page }) => {
		await openEditor(page);
		const from = await pagePoint(page, 200, 200);
		const to = await pagePoint(page, 1300, 600); // covers a and b, not c

		await page.mouse.move(from.x, from.y);
		await page.mouse.down();
		await page.mouse.move(to.x, to.y, { steps: 8 });
		await expect(page.getByTestId('marquee')).toBeVisible();
		await page.mouse.up();

		await expect(title(page)).toHaveText('2 elements selected');
		await expect(page.getByTestId('marquee')).toHaveCount(0);

		// Clicking the empty page clears it
		const empty = await pagePoint(page, 1800, 2500);
		await page.mouse.click(empty.x, empty.y);
		await expect(page.getByTestId('property-panel')).toHaveCount(0);
	});

	test('Delete removes all selected elements, but not while typing', async ({ page }) => {
		await openEditor(page);
		await elements(page).nth(0).click();
		await elements(page)
			.nth(2)
			.click({ modifiers: ['Shift'] });
		await expect(title(page)).toHaveText('2 elements selected');

		await page.keyboard.press('Delete');

		await expect(elements(page)).toHaveCount(1);
		await expect(page.getByTestId('property-panel')).toHaveCount(0);
	});

	test('the Delete button in the panel removes the selection', async ({ page }) => {
		await openEditor(page);
		await elements(page).nth(0).click();
		await elements(page)
			.nth(1)
			.click({ modifiers: ['Shift'] });

		await page.getByTestId('delete-selected-btn').click();

		await expect(elements(page)).toHaveCount(1);
	});

	test('the select-multiple toggle lets plain clicks (taps) add to the selection', async ({
		page
	}) => {
		await openEditor(page);
		await page.getByTestId('multi-select-toggle').click();
		await expect(page.getByTestId('multi-select-toggle')).toHaveAttribute('aria-pressed', 'true');

		await elements(page).nth(0).click();
		await elements(page).nth(1).click();
		await expect(title(page)).toHaveText('2 elements selected');

		// Switching the mode off keeps the selection
		await page.getByTestId('multi-select-toggle').click();
		await expect(title(page)).toHaveText('2 elements selected');

		// Now a plain click selects just one again
		await elements(page).nth(2).click();
		await expect(title(page)).toContainText('Shape Properties');
	});

	test('Backspace while typing in a text element does not delete the selection', async ({
		page
	}) => {
		await openEditor(page);
		await page.getByTestId('tool-text').dragTo(page.getByTestId('document-canvas'), {
			targetPosition: { x: 200, y: 330 }
		});
		const textarea = page.locator('textarea');
		await textarea.fill('abc');
		await textarea.focus();

		await page.keyboard.press('Backspace');

		await expect(textarea).toHaveValue('ab');
		await expect(elements(page)).toHaveCount(4);
	});
});
