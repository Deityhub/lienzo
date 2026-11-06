import { expect, test, type Locator, type Page } from '@playwright/test';
import { seedDocument } from './helpers';

const shape = (id: string, pageId: string, x: number, y: number, extra: object = {}) => ({
	id,
	type: 'shape',
	pageId,
	zIndex: 0,
	x,
	y,
	width: 300,
	height: 200,
	shapeType: 'rectangle',
	strokeColor: '#1d4ed8',
	strokeWidth: 8,
	fillColor: '#bfdbfe',
	fillOpacity: 1,
	...extra
});

const boundaries = {
	horizontal: { start: 100, end: 2380 },
	vertical: { start: 100, end: 3408 }
};

const doc = {
	id: 'pages',
	schemaVersion: 1,
	name: 'Pages',
	createdAt: 1,
	updatedAt: 2,
	pages: {
		p1: {
			id: 'p1',
			boundaries,
			elements: { a: shape('a', 'p1', 300, 300), b: shape('b', 'p1', 900, 300) }
		},
		p2: { id: 'p2', boundaries, elements: {} }
	}
};

async function openEditor(page: Page) {
	await seedDocument(page, doc);
	await page.getByRole('button', { name: 'Edit' }).click();
	await expect(page.getByTestId('document-canvas')).toHaveCount(2);
}

/** The element's box once the layout has stopped moving (panels slide, scroll bars appear). */
async function settledBox(locator: Locator) {
	let last = JSON.stringify(await locator.boundingBox());
	await expect
		.poll(async () => {
			await locator.page().waitForTimeout(150);
			const now = JSON.stringify(await locator.boundingBox());
			const same = now === last;
			last = now;
			return same;
		})
		.toBe(true);
	return (await locator.boundingBox())!;
}

const PAGE_WIDTH = 2480;

const onPage = (page: Page, id: string) =>
	page.locator(`[data-page-id="${id}"] [data-testid="document-canvas"] > .cursor-move`);

/** The stored copy of the document: autosave writes it after an edit. */
const storedPages = (page: Page) =>
	page.evaluate(
		() =>
			new Promise<Record<string, { elements: Record<string, unknown> }>>((resolve, reject) => {
				const open = indexedDB.open('lienzo-db');
				open.onerror = () => reject(open.error);
				open.onsuccess = () => {
					const all = open.result.transaction('documents').objectStore('documents').getAll();
					all.onsuccess = () => resolve(all.result[0].pages);
					all.onerror = () => reject(all.error);
				};
			})
	);

test.describe('Moving elements between pages', () => {
	test('dragging an element onto the next page moves it there', async ({ page }) => {
		await page.setViewportSize({ width: 1400, height: 2900 }); // both pages are on screen
		await openEditor(page);
		const nextPage = page.locator('[data-page-id="p2"] [data-testid="document-canvas"]');

		// Playwright waits for the layout to settle and finds the positions itself
		await onPage(page, 'p1')
			.first()
			.dragTo(nextPage, { sourcePosition: { x: 20, y: 20 }, targetPosition: { x: 150, y: 200 } });

		await expect(onPage(page, 'p1')).toHaveCount(1);
		await expect(onPage(page, 'p2')).toHaveCount(1);
		await expect(page.getByTestId('page-drop-preview')).toHaveCount(0);

		// The change is saved, in page units: the element's corner is where the pointer was, minus the
		// 20px it was grabbed at. Screen pixels become page pixels by the display scale, whatever the machine.
		await expect(page.getByTestId('save-status')).toHaveText('Saved', { timeout: 10000 });
		const stored = await storedPages(page);
		expect(Object.keys(stored.p1.elements)).toEqual(['b']);
		expect(Object.keys(stored.p2.elements)).toEqual(['a']);

		const scale = (await nextPage.boundingBox())!.width / PAGE_WIDTH;
		const landed = stored.p2.elements.a as { x: number; y: number };
		expect(Math.abs(landed.x - 130 / scale)).toBeLessThan(10);
		expect(Math.abs(landed.y - 180 / scale)).toBeLessThan(10);
	});

	test('a selection or group moves together', async ({ page }) => {
		await page.setViewportSize({ width: 1400, height: 2900 });
		await openEditor(page);
		await onPage(page, 'p1').nth(0).click();
		await onPage(page, 'p1')
			.nth(1)
			.click({ modifiers: ['Shift'] });
		await page.getByTestId('group-btn').click();

		await onPage(page, 'p1')
			.first()
			.dragTo(page.locator('[data-page-id="p2"] [data-testid="document-canvas"]'), {
				sourcePosition: { x: 20, y: 20 },
				targetPosition: { x: 100, y: 100 }
			});

		await expect(onPage(page, 'p1')).toHaveCount(0);
		await expect(onPage(page, 'p2')).toHaveCount(2);
		await expect(page.getByTestId('property-panel-title')).toHaveText('Group of 2 elements');

		// Still the same distance apart, in page units (300 and 900 on the page before)
		await expect(page.getByTestId('save-status')).toHaveText('Saved', { timeout: 10000 });
		const { a, b } = (await storedPages(page)).p2.elements as Record<string, { x: number }>;
		expect(b.x - a.x).toBeCloseTo(600, 0);
	});

	test('dragging near the bottom edge scrolls to a page that is out of view', async ({ page }) => {
		await openEditor(page); // the default window shows only the first page
		const container = page.getByTestId('canvas-container');
		const from = await settledBox(onPage(page, 'p1').first());
		await page.mouse.move(from.x + 20, from.y + 20);
		await page.mouse.down();

		const window = page.viewportSize()!;
		await page.mouse.move(from.x + 20, window.height - 20, { steps: 5 });
		await expect
			.poll(() => container.evaluate((el) => el.scrollTop), { timeout: 10000 })
			.toBeGreaterThan(1000);

		// Stop scrolling by moving to the middle, then drop it on the second page, which has come into view
		await page.mouse.move(from.x + 20, window.height / 2);
		await expect // wait until the list has stopped scrolling
			.poll(async () => {
				const before = await container.evaluate((el) => el.scrollTop);
				await page.waitForTimeout(100);
				return before === (await container.evaluate((el) => el.scrollTop));
			})
			.toBe(true);
		const target = await settledBox(
			page.locator('[data-page-id="p2"] [data-testid="document-canvas"]')
		);
		const y = Math.min(Math.max(target.y + 100, 250), window.height - 250);
		await page.mouse.move(target.x + 200, y, { steps: 5 });
		await expect(page.getByTestId('page-drop-preview')).toBeVisible();
		await page.mouse.up();

		await expect(onPage(page, 'p2')).toHaveCount(1);
	});

	test('Escape while dragging over another page cancels the move', async ({ page }) => {
		await page.setViewportSize({ width: 1400, height: 2900 });
		await openEditor(page);
		const from = await settledBox(onPage(page, 'p1').first());
		const target = await settledBox(
			page.locator('[data-page-id="p2"] [data-testid="document-canvas"]')
		);

		await page.getByTestId('document-canvas').first().focus();
		await page.mouse.move(from.x + 20, from.y + 20);
		await page.mouse.down();
		await page.mouse.move(target.x + 150, target.y + 200, { steps: 10 });
		await expect(page.getByTestId('page-drop-preview')).toBeVisible();
		await page.keyboard.press('Escape');
		await page.mouse.up();

		await expect(page.getByTestId('page-drop-preview')).toHaveCount(0);
		await expect(onPage(page, 'p1')).toHaveCount(2);
	});

	test('the Move to Page selector moves the selection without dragging', async ({ page }) => {
		await openEditor(page);
		await onPage(page, 'p1').first().click();

		await page.getByTestId('move-to-page').click();
		await expect(page.getByTestId('move-to-page-option-p1')).toHaveCount(0); // not its own page
		await page.getByTestId('move-to-page-option-p2').click();

		await expect(onPage(page, 'p1')).toHaveCount(1);
		await expect(onPage(page, 'p2')).toHaveCount(1);
		await expect(page.getByTestId('property-panel-title')).toContainText('Shape Properties'); // still selected
	});

	test('there is nothing to choose with a single page', async ({ page }) => {
		await page.goto('/canvas');
		await page.getByTestId('tool-shape').dragTo(page.getByTestId('document-canvas'), {
			targetPosition: { x: 200, y: 200 }
		});
		await expect(page.getByTestId('property-panel')).toBeVisible();
		await expect(page.getByTestId('move-to-page')).toHaveCount(0);
	});
});
