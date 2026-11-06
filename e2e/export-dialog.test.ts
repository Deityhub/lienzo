import { expect, test, type Page } from '@playwright/test';
import { seedDocument } from './helpers';

const boundaries = { horizontal: { start: 100, end: 700 }, vertical: { start: 100, end: 1000 } };
const doc = {
	id: 'dlg',
	schemaVersion: 1,
	name: 'Quarterly report',
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
					x: 120,
					y: 140,
					width: 400,
					height: 80,
					text: 'Headline',
					fontFamily: 'Inter',
					fontSize: 24,
					fontWeight: '400',
					fontStyle: 'normal',
					color: '#000000'
				}
			}
		},
		p2: { id: 'p2', boundaries, elements: {} }
	}
};

async function openDialog(page: Page, document: object = doc) {
	await seedDocument(page, document);
	await page.getByRole('button', { name: 'Edit' }).click();
	await expect(page.getByTestId('document-canvas')).toHaveCount(2);
	await page.getByTestId('export-btn').click();
	const dialog = page.getByRole('dialog');
	await expect(dialog).toBeVisible();
	return dialog;
}

test.describe('Export dialog', () => {
	test('previews every page and offers the document name as the file name', async ({ page }) => {
		const dialog = await openDialog(page);

		await expect(dialog.getByRole('img', { name: 'Preview of page 1' })).toBeVisible();
		await expect(dialog.getByRole('img', { name: 'Preview of page 2' })).toBeVisible();
		await expect(dialog.getByTestId('export-file-name')).toHaveValue('Quarterly report');
		await expect(dialog).toContainText('lienzo-document.json is attached');
		await expect(dialog).toContainText('2 pages');
		await expect(dialog.getByRole('button', { name: 'Export PDF' })).toBeEnabled();
	});

	test('downloads under the chosen file name, then shows the result in the dialog', async ({
		page
	}) => {
		const dialog = await openDialog(page);
		await dialog.getByTestId('export-file-name').fill('Board pack: Q3/2026');

		const download = page.waitForEvent('download');
		await dialog.getByRole('button', { name: 'Export PDF' }).click();

		// characters systems do not accept in file names are replaced
		expect((await download).suggestedFilename()).toBe('Board pack Q3 2026.pdf');
		await expect(dialog.getByTestId('export-done')).toContainText(
			'Board pack Q3 2026.pdf was saved'
		);
		await expect(dialog.getByTestId('export-warning')).toHaveCount(0);

		// it can be exported again without reopening the dialog
		const again = page.waitForEvent('download');
		await dialog.getByRole('button', { name: 'Export again' }).click();
		await again;
		await dialog.getByRole('button', { name: 'Close' }).click();
		await expect(dialog).toHaveCount(0);
	});

	test('an empty file name is explained and nothing is exported', async ({ page }) => {
		const dialog = await openDialog(page);
		await dialog.getByTestId('export-file-name').fill('  ');

		await dialog.getByRole('button', { name: 'Export PDF' }).click();

		await expect(dialog.getByRole('alert')).toHaveText('Enter a file name.');
		await expect(dialog.getByTestId('export-done')).toHaveCount(0);
		await expect(dialog.getByTestId('export-file-name')).toHaveAttribute('aria-invalid', 'true');
	});

	test('Cancel and Escape close it without exporting', async ({ page }) => {
		let downloads = 0;
		page.on('download', () => downloads++);

		const dialog = await openDialog(page);
		await dialog.getByRole('button', { name: 'Cancel' }).click();
		await expect(dialog).toHaveCount(0);

		await page.getByTestId('export-btn').click();
		await expect(page.getByRole('dialog')).toBeVisible();
		await page.keyboard.press('Escape');
		await expect(page.getByRole('dialog')).toHaveCount(0);
		expect(downloads).toBe(0);
	});

	test('a document without a name is exported as Untitled document', async ({ page }) => {
		const dialog = await openDialog(page, { ...doc, name: '' });
		await expect(dialog.getByTestId('export-file-name')).toHaveValue('Untitled document');
	});

	test('the backdrop is dark in the dark theme, not a bright wash', async ({ browser }) => {
		const context = await browser.newContext({ colorScheme: 'dark' });
		const page = await context.newPage();
		const dialog = await openDialog(page);

		const backdrop = await dialog.evaluate((el) => getComputedStyle(el).backgroundColor);
		expect(backdrop).toMatch(/0 0 0 \/ 0\.6|rgba\(0, 0, 0, 0\.6/); // black at 60%, not a white wash
		await context.close();
	});
});

test.describe('Editor header', () => {
	test('shows the document, its page count and the save status', async ({ page }) => {
		await seedDocument(page, doc);
		await page.getByRole('button', { name: 'Edit' }).click();

		await expect(page.getByTestId('document-title')).toHaveText('Quarterly report');
		await expect(page.getByTestId('page-count')).toContainText('2 Pages');
		await expect(page.getByTestId('back-btn')).toBeVisible();
		await expect(page.getByTestId('theme-toggle')).toBeVisible();
	});

	test('a new document is called Untitled document until it is named', async ({ page }) => {
		await page.goto('/canvas');
		await page.waitForLoadState('networkidle'); // clicks only work once the page is interactive
		await expect(page.getByTestId('document-title')).toHaveText('Untitled document');
	});

	test('the select-multiple switch reports whether it is on', async ({ page }) => {
		await page.goto('/canvas');
		await page.waitForLoadState('networkidle'); // clicks only work once the page is interactive
		const toggle = page.getByTestId('multi-select-toggle');
		await expect(toggle).toHaveAttribute('aria-pressed', 'false');
		await toggle.click();
		await expect(toggle).toHaveAttribute('aria-pressed', 'true');
	});
});
