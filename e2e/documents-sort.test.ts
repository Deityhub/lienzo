import { expect, test, type Page } from '@playwright/test';

const doc = (id: string, name: string, createdAt: number, updatedAt: number) => ({
	id,
	schemaVersion: 1,
	name,
	createdAt,
	updatedAt,
	pages: {
		p1: {
			id: 'p1',
			boundaries: { horizontal: { start: 100, end: 700 }, vertical: { start: 100, end: 1000 } },
			elements: {}
		}
	}
});

// Names are chosen so each sort order gives a different, easy to read list
const docs = [
	doc('a', 'Invoice 10', 100, 5000),
	doc('b', 'invoice 2', 300, 9000),
	doc('c', 'Zebra', 200, 1000),
	doc('d', 'apple', 400, 7000)
];

async function seed(page: Page) {
	await page.goto('/documents');
	await page.getByText('No documents').waitFor();
	await page.evaluate(
		(records) =>
			new Promise<void>((resolve, reject) => {
				const open = indexedDB.open('lienzo-db', 1);
				open.onsuccess = () => {
					const tx = open.result.transaction('documents', 'readwrite');
					for (const record of records) tx.objectStore('documents').put(record);
					tx.oncomplete = () => resolve();
					tx.onerror = () => reject(tx.error);
				};
				open.onerror = () => reject(open.error);
			}),
		docs
	);
	await page.reload();
	await page.waitForLoadState('networkidle');
}

const names = (page: Page) => page.locator('main h3').allTextContents();

test.describe('Documents sorting', () => {
	test('starts with the most recently updated, and each option reorders the list', async ({
		page
	}) => {
		await seed(page);
		const select = page.getByTestId('sort-select');
		await expect(select).toHaveValue('updated-desc');
		expect(await names(page)).toEqual(['invoice 2', 'apple', 'Invoice 10', 'Zebra']);

		await select.selectOption('updated-asc');
		expect(await names(page)).toEqual(['Zebra', 'Invoice 10', 'apple', 'invoice 2']);

		await select.selectOption('created-desc');
		expect(await names(page)).toEqual(['apple', 'invoice 2', 'Zebra', 'Invoice 10']);

		await select.selectOption('name-asc');
		expect(await names(page)).toEqual(['apple', 'invoice 2', 'Invoice 10', 'Zebra']);

		await select.selectOption('name-desc');
		expect(await names(page)).toEqual(['Zebra', 'Invoice 10', 'invoice 2', 'apple']);
	});

	test('the choice is remembered, and the search keeps the order', async ({ page }) => {
		await seed(page);
		await page.getByTestId('sort-select').selectOption('name-asc');

		await page.reload();
		await page.waitForLoadState('networkidle');
		await expect(page.getByTestId('sort-select')).toHaveValue('name-asc');
		expect(await names(page)).toEqual(['apple', 'invoice 2', 'Invoice 10', 'Zebra']);

		await page.getByLabel('Search documents').fill('invoice');
		await expect.poll(() => names(page)).toEqual(['invoice 2', 'Invoice 10']);
	});

	test('on a phone the control sits on the right', async ({ browser }) => {
		const context = await browser.newContext({ viewport: { width: 375, height: 812 } });
		const page = await context.newPage();
		await seed(page);
		const box = await page.getByTestId('sort-select').boundingBox();
		expect(box).not.toBeNull();
		expect(box!.x + box!.width).toBeGreaterThan(375 - 24); // against the right edge, not the left
		await context.close();
	});

	test('an unknown saved choice falls back to the default', async ({ page }) => {
		await page.addInitScript(() => localStorage.setItem('lienzo-documents-sort', 'sideways'));
		await seed(page);
		await expect(page.getByTestId('sort-select')).toHaveValue('updated-desc');
	});
});
