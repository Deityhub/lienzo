import { expect, test, type Page } from '@playwright/test';
import { seedDocument } from './helpers';

const boundaries = { horizontal: { start: 100, end: 2380 }, vertical: { start: 100, end: 3408 } };
const doc = {
	id: 'tools',
	schemaVersion: 1,
	name: 'Tools',
	createdAt: 1,
	updatedAt: 2,
	pages: {
		p1: { id: 'p1', boundaries, elements: {} },
		p2: { id: 'p2', boundaries, elements: {} }
	}
};

const onPage = (page: Page, id: string) =>
	page.locator(`[data-page-id="${id}"] [data-testid="document-canvas"] > .cursor-move`);

async function open(page: Page) {
	await seedDocument(page, doc);
	await page.getByRole('button', { name: 'Edit' }).click();
	await expect(page.getByTestId('document-canvas')).toHaveCount(2);
}

test.describe('Tool palette', () => {
	test('each tool has an icon and a name, and is a real button', async ({ page }) => {
		await open(page);
		for (const name of ['Text', 'Shape', 'Image']) {
			await expect(page.getByTestId('toolbar').getByRole('button', { name })).toBeVisible();
		}
		await expect(page.getByRole('navigation', { name: 'Add to page' })).toBeVisible();
	});

	test('clicking a tool adds the element to the page that was last clicked', async ({ page }) => {
		await open(page);
		await page.locator('[data-page-id="p2"] [data-testid="document-canvas"]').click();

		await page.getByTestId('toolbar').getByRole('button', { name: 'Shape' }).click();

		await expect(onPage(page, 'p2')).toHaveCount(1);
		await expect(onPage(page, 'p1')).toHaveCount(0);
		await expect(page.getByTestId('property-panel-title')).toHaveText('Shape Properties'); // selected
	});

	test('each added element sits a little lower, so they do not hide each other', async ({
		page
	}) => {
		await open(page);
		const text = page.getByTestId('toolbar').getByRole('button', { name: 'Text' });

		await text.click();
		await text.click();
		await text.click();

		await expect(onPage(page, 'p1')).toHaveCount(3);
		const tops = await onPage(page, 'p1').evaluateAll((els) =>
			els.map((el) => el.getBoundingClientRect().top).sort((a, b) => a - b)
		);
		expect(tops[1]).toBeGreaterThan(tops[0] + 5);
		expect(tops[2]).toBeGreaterThan(tops[1] + 5);
	});

	test('the keyboard can add a tool, and dragging still works', async ({ page }) => {
		await open(page);
		await page.getByTestId('toolbar').getByRole('button', { name: 'Text' }).focus();
		await page.keyboard.press('Enter');
		await expect(onPage(page, 'p1')).toHaveCount(1);

		await page
			.getByTestId('tool-shape')
			.dragTo(page.locator('[data-page-id="p2"] [data-testid="document-canvas"]'), {
				targetPosition: { x: 100, y: 100 }
			});
		await expect(onPage(page, 'p2')).toHaveCount(1);
	});
});

test.describe('Tool bar on a phone', () => {
	test.use({ viewport: { width: 390, height: 844 }, hasTouch: true });

	test('is a bar along the bottom with the tools, Select and Page', async ({ page }) => {
		await open(page);
		const bar = page.getByRole('navigation', { name: 'Add to page' });
		const box = (await bar.boundingBox())!;

		expect(box.y + box.height).toBeCloseTo(844, 0);
		expect(box.width).toBeCloseTo(390, 0);
		for (const name of ['Text', 'Shape', 'Image', 'Select', 'Page']) {
			const button = bar.getByRole('button', { name });
			await expect(button).toBeVisible();
			expect((await button.boundingBox())!.height).toBeGreaterThanOrEqual(44); // a comfortable target
		}
	});

	test('tapping a tool adds it, Page adds a page and Select switches to multiple selection', async ({
		page
	}) => {
		await open(page);
		const bar = page.getByRole('navigation', { name: 'Add to page' });

		await bar.getByRole('button', { name: 'Text' }).tap();
		await expect(onPage(page, 'p1')).toHaveCount(1);

		await bar.getByTestId('add-page-bar-btn').tap();
		await expect(page.getByTestId('document-canvas')).toHaveCount(3);

		const select = bar.getByTestId('multi-select-bar-btn');
		await expect(select).toHaveAttribute('aria-pressed', 'false');
		await select.tap();
		await expect(select).toHaveAttribute('aria-pressed', 'true');
	});

	test('the header keeps to one row: Back, the title and Export, with the rest in a menu', async ({
		page
	}) => {
		await open(page);
		const header = page.locator('header');
		await expect(header.getByTestId('document-title')).toBeVisible();
		await expect(header.getByTestId('export-btn-phone')).toBeVisible();
		await expect(header.getByTestId('add-page-btn')).toBeHidden(); // in the bar instead
		expect((await header.boundingBox())!.height).toBeLessThan(90);

		const menuButton = header.getByTestId('more-menu-btn');
		await menuButton.click();
		const menu = page.getByRole('menu', { name: 'More actions' });
		for (const name of ['Paste', 'Import', 'Save']) {
			await expect(menu.getByRole('menuitem', { name })).toBeVisible();
		}
		await expect(menuButton).toHaveAttribute('aria-expanded', 'true');

		await page.keyboard.press('Escape');
		await expect(menu).toHaveCount(0);
	});

	test('the menu switches the theme and closes when you tap elsewhere', async ({ page }) => {
		await open(page);
		await page.getByTestId('more-menu-btn').click();
		const themeItem = page.getByTestId('menu-theme');
		await expect(themeItem).toHaveAttribute('aria-checked', 'false');

		await themeItem.click();
		expect(await page.evaluate(() => document.documentElement.classList.contains('dark'))).toBe(
			true
		);

		await page.getByTestId('more-menu-btn').click();
		await page
			.locator('[data-testid="document-canvas"]')
			.first()
			.click({ position: { x: 20, y: 200 } });
		await expect(page.getByRole('menu')).toHaveCount(0);
	});

	test('the property sheet sits above the tool bar, not behind it', async ({ page }) => {
		await open(page);
		await page
			.getByRole('navigation', { name: 'Add to page' })
			.getByRole('button', { name: 'Text' })
			.tap();
		const sheet = (await page.getByTestId('property-panel').boundingBox())!;
		const bar = (await page.getByRole('navigation', { name: 'Add to page' }).boundingBox())!;

		expect(sheet.y + sheet.height).toBeLessThanOrEqual(bar.y + 1);
	});
});

test.describe('Documents page on a phone', () => {
	test.use({ viewport: { width: 390, height: 844 } });

	test('the header fits without sideways scrolling, with the main action and the file actions in reach', async ({
		page
	}) => {
		await page.goto('/documents');
		await page.waitForLoadState('networkidle');

		const overflow = await page.evaluate(
			() => document.documentElement.scrollWidth - document.documentElement.clientWidth
		);
		expect(overflow).toBeLessThanOrEqual(0);
		await expect(page.getByTestId('new-document-btn')).toBeVisible();
		await expect(page.getByRole('searchbox', { name: 'Search documents' })).toBeVisible();
		// icon buttons keep their names for screen readers and are comfortable to tap
		for (const id of ['import-btn', 'export-all-btn']) {
			const button = page.getByTestId(id);
			await expect(button).toBeVisible();
			const box = (await button.boundingBox())!;
			expect(box.width).toBeGreaterThanOrEqual(44);
			expect(box.height).toBeGreaterThanOrEqual(44);
		}
		await expect(page.getByRole('button', { name: 'Import' })).toBeVisible();
	});
});
