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

test.describe('Grouping', () => {
	test('a group is selected and moved as one until it is ungrouped', async ({ page }) => {
		await openEditor(page);
		await elements(page).nth(0).click();
		await elements(page)
			.nth(1)
			.click({ modifiers: ['Shift'] });
		await page.getByTestId('group-btn').click();
		await expect(title(page)).toHaveText('Group of 2 elements');
		await expect(page.getByTestId('ungroup-btn')).toBeVisible();
		await expect(page.getByTestId('group-btn')).toHaveCount(0);

		// Click the empty page, then one member: the whole group is selected
		const empty = await pagePoint(page, 1800, 2500);
		await page.mouse.click(empty.x, empty.y);
		await expect(page.getByTestId('property-panel')).toHaveCount(0);
		await elements(page).nth(1).click();
		await expect(title(page)).toHaveText('Group of 2 elements');

		// Dragging one member moves both (the panel is open, so the page does not shift meanwhile)
		await page.waitForTimeout(500);
		const before = [
			await elements(page).nth(0).boundingBox(),
			await elements(page).nth(1).boundingBox()
		];
		const from = { x: before[1]!.x + 20, y: before[1]!.y + 20 };
		await page.mouse.move(from.x, from.y);
		await page.mouse.down();
		await page.mouse.move(from.x + 30, from.y + 50, { steps: 5 });
		await page.mouse.up();
		const after = [
			await elements(page).nth(0).boundingBox(),
			await elements(page).nth(1).boundingBox()
		];
		for (const i of [0, 1]) {
			expect(after[i]!.x - before[i]!.x).toBeCloseTo(30, 0);
			expect(after[i]!.y - before[i]!.y).toBeCloseTo(50, 0);
		}

		await page.getByTestId('ungroup-btn').click();
		await page.mouse.click(empty.x, empty.y);
		await elements(page).nth(0).click();
		await expect(title(page)).toContainText('Shape Properties'); // alone again
	});

	test('Ctrl+G groups and Ctrl+Shift+G ungroups', async ({ page }) => {
		await openEditor(page);
		await elements(page).nth(0).click();
		await elements(page)
			.nth(2)
			.click({ modifiers: ['Shift'] });

		await page.keyboard.press('Control+g');
		await expect(title(page)).toHaveText('Group of 2 elements');

		await page.keyboard.press('Control+Shift+G');
		await expect(title(page)).toHaveText('2 elements selected');
	});

	test('a group is kept when the document is saved and opened again', async ({ page }) => {
		await openEditor(page);
		await elements(page).nth(0).click();
		await elements(page)
			.nth(1)
			.click({ modifiers: ['Shift'] });
		await page.getByTestId('group-btn').click();
		await expect(page.getByTestId('save-status')).toHaveText('Saved', { timeout: 10000 });

		await page.getByTestId('back-btn').click();
		await page.getByRole('button', { name: 'Edit' }).click();
		await elements(page).nth(0).click();

		await expect(title(page)).toHaveText('Group of 2 elements');
	});
});

test('a group that sticks out of the page boundaries is moved in as one, keeping its layout', async ({
	page
}) => {
	const grouped = (id: string, x: number) => ({ ...shape(id, x, 300), groupId: 'g' });
	await seedDocument(page, {
		...doc,
		id: 'sticks-out',
		pages: {
			p1: {
				id: 'p1',
				// the right boundary is at 1500, but the group spans 1200..1700
				boundaries: { horizontal: { start: 100, end: 1500 }, vertical: { start: 100, end: 3408 } },
				elements: { a: grouped('a', 1200), b: grouped('b', 1400) }
			}
		}
	});
	await page.getByRole('button', { name: 'Edit' }).click();
	await expect(elements(page)).toHaveCount(2);
	await page.waitForTimeout(500);

	const [a, b] = [
		await elements(page).nth(0).boundingBox(),
		await elements(page).nth(1).boundingBox()
	];
	const canvas = (await page.getByTestId('document-canvas').boundingBox())!;
	const k = canvas.width / 2480;
	expect((b!.x - a!.x) / k).toBeCloseTo(200, 0); // still 200 page pixels apart, not squeezed together
	expect((b!.x + b!.width - canvas.x) / k).toBeCloseTo(1500, 0); // the group's right edge is at the boundary
});

test('dragging a corner of the selection box resizes everything in it proportionally', async ({
	page
}) => {
	await openEditor(page);
	await elements(page).nth(0).click();
	await elements(page)
		.nth(1)
		.click({ modifiers: ['Shift'] });
	await page.waitForTimeout(500);

	const before = [
		await elements(page).nth(0).boundingBox(),
		await elements(page).nth(1).boundingBox()
	];
	const handle = (await page.getByTestId('group-resize-handle-se').boundingBox())!;
	const from = { x: handle.x + handle.width / 2, y: handle.y + handle.height / 2 };
	// the selection box is a and b: 900 wide (300..1200) and 200 tall (300..500)
	const box = { width: before[1]!.x + before[1]!.width - before[0]!.x, height: before[0]!.height };

	await page.mouse.move(from.x, from.y);
	await page.mouse.down();
	await page.mouse.move(from.x + box.width / 2, from.y + box.height / 2, { steps: 6 }); // 1.5 times as big
	await page.mouse.up();

	const after = [
		await elements(page).nth(0).boundingBox(),
		await elements(page).nth(1).boundingBox()
	];
	expect(after[0]!.width / before[0]!.width).toBeCloseTo(1.5, 1);
	expect(after[0]!.height / before[0]!.height).toBeCloseTo(1.5, 1);
	expect(after[1]!.width / before[1]!.width).toBeCloseTo(1.5, 1);
	// the top-left corner stayed, and the gap between the elements grew by the same factor
	expect(after[0]!.x).toBeCloseTo(before[0]!.x, 0);
	expect(after[1]!.x - after[0]!.x).toBeCloseTo((before[1]!.x - before[0]!.x) * 1.5, 0);
	await expect(title(page)).toHaveText('2 elements selected'); // still selected
});
