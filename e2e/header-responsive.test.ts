import { expect, test, type Page } from '@playwright/test';
import { seedDocument } from './helpers';

const doc = {
	id: 'hdr',
	schemaVersion: 1,
	name: 'A fairly long document name for the header',
	createdAt: 1,
	updatedAt: 2,
	pages: {
		p1: {
			id: 'p1',
			boundaries: { horizontal: { start: 100, end: 2380 }, vertical: { start: 100, end: 3408 } },
			elements: {}
		}
	}
};

const IDS = [
	'add-page-btn',
	'multi-select-toggle',
	'paste-btn',
	'canvas-import-btn',
	'save-btn',
	'export-btn'
];

async function openAt(page: Page, width: number, name = doc.name) {
	await page.setViewportSize({ width, height: 800 });
	await seedDocument(page, { ...doc, name });
	await page.getByRole('button', { name: 'Edit' }).click();
	await expect(page.getByTestId('document-canvas')).toBeVisible();
	await page.waitForTimeout(300);
}

/** The visible width of a button's text, 0 when it is only an icon */
const labelWidth = (page: Page, id: string) =>
	page.getByTestId(id).evaluate((button) => {
		const label = [...button.querySelectorAll('span')].find((s) => s.textContent?.trim());
		return label ? label.getBoundingClientRect().width : 0;
	});

test.describe('Editor header at every width', () => {
	for (const width of [1920, 1360, 1280, 1180, 1024, 900, 768]) {
		test(`stays on one row at ${width}px`, async ({ page }) => {
			await openAt(page, width);

			const header = (await page.locator('header').boundingBox())!;
			expect(header.height).toBeLessThan(80); // a single row of 36px controls
			const tops = await Promise.all(
				IDS.map(async (id) => (await page.getByTestId(id).boundingBox())!.y)
			);
			expect(Math.max(...tops) - Math.min(...tops)).toBeLessThan(8); // all on the same line
			const overflow = await page.evaluate(
				() => document.documentElement.scrollWidth - document.documentElement.clientWidth
			);
			expect(overflow).toBeLessThanOrEqual(0);
		});
	}

	test('wide: every action shows its name', async ({ page }) => {
		await openAt(page, 1360);
		for (const id of IDS) expect(await labelWidth(page, id), id).toBeGreaterThan(10);
	});

	test('medium: the secondary actions become icons and Export keeps its name', async ({ page }) => {
		await openAt(page, 1100);
		for (const id of IDS.slice(0, 5)) expect(await labelWidth(page, id), id).toBeLessThan(2);
		expect(await labelWidth(page, 'export-btn')).toBeGreaterThan(10);
	});

	test('narrow: everything is an icon', async ({ page }) => {
		await openAt(page, 860);
		for (const id of IDS) expect(await labelWidth(page, id), id).toBeLessThan(2);
	});

	test('the icons keep their names for screen readers and hover tooltips', async ({ page }) => {
		await openAt(page, 860);
		for (const name of ['Add page', 'Select multiple', 'Paste', 'Import', 'Save', 'Export PDF']) {
			const button = page.getByRole('button', { name, exact: true });
			await expect(button).toBeVisible();
			await expect(button).toHaveAttribute('title', name);
		}
	});

	test('the document title shortens instead of pushing the buttons away', async ({ page }) => {
		await openAt(
			page,
			768,
			'An extremely long document name that keeps going and going for a very long time indeed'
		);
		const title = page.getByTestId('document-title');
		expect(await title.evaluate((el) => el.scrollWidth > el.clientWidth)).toBe(true); // cut with an ellipsis
		expect((await page.getByTestId('export-btn').boundingBox())!.x).toBeGreaterThan(500); // still at the right
		const header = (await page.locator('header').boundingBox())!;
		expect(header.height).toBeLessThan(80);
	});

	test('on a phone the actions are Export and a menu', async ({ page }) => {
		await openAt(page, 390);
		await expect(page.getByTestId('export-btn-phone')).toBeVisible();
		await expect(page.getByTestId('more-menu-btn')).toBeVisible();
		await expect(page.getByTestId('export-btn')).toBeHidden();
	});
});
