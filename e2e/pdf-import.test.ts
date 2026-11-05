import { expect, test, type Page } from '@playwright/test';
import { seedDocument } from './helpers';

const doc = {
	id: 'pdf-doc',
	schemaVersion: 1,
	name: 'PDF Resume',
	createdAt: 1,
	updatedAt: 2,
	pages: {
		p1: {
			id: 'p1',
			boundaries: { horizontal: { start: 100, end: 700 }, vertical: { start: 100, end: 1000 } },
			elements: {
				t1: {
					id: 't1',
					type: 'text',
					pageId: 'p1',
					zIndex: 0,
					x: 120,
					y: 140,
					width: 400,
					height: 80,
					text: 'Editable headline',
					fontFamily: 'Inter',
					fontSize: 24,
					fontWeight: '400',
					fontStyle: 'normal',
					color: '#000000'
				}
			}
		}
	}
};

/** Open the seeded document in the editor and export it as a PDF. Returns the downloaded file path. */
async function exportPdf(page: Page): Promise<string> {
	await seedDocument(page, doc);
	await page.getByRole('button', { name: 'Edit' }).click();
	await expect(page.locator('textarea')).toHaveValue('Editable headline');

	await page.getByTestId('export-btn').click();
	await page.getByRole('dialog').getByRole('button', { name: 'Preview PDF' }).click();
	const download = page.waitForEvent('download');
	await page.getByRole('dialog').getByRole('button', { name: 'Export PDF' }).click();

	const file = await download;
	expect(file.suggestedFilename()).toBe('PDF Resume.pdf');
	return (await file.path())!;
}

test.describe('PDF import', () => {
	test('a PDF exported from Lienzo can be imported on the Documents page', async ({ page }) => {
		const pdfPath = await exportPdf(page);

		await page.getByTestId('back-btn').click();
		await expect(page).toHaveURL(/\/documents/);
		await page.getByTestId('import-input').setInputFiles(pdfPath);

		// It is the same document id, so the user decides what to do
		await expect(page.getByTestId('conflict-list')).toContainText('PDF Resume');
		await page.getByTestId('import-keep-both-btn').click();

		await expect(page.getByTestId('import-notice')).toContainText('Imported 1 document');
		await expect(page.getByRole('heading', { name: 'PDF Resume (imported)' })).toBeVisible();
	});

	test('a PDF exported from Lienzo can be imported into the editor, fully editable', async ({
		page
	}) => {
		const pdfPath = await exportPdf(page);

		await page.goto('/canvas'); // a fresh, empty canvas
		await page.getByTestId('canvas-import-input').setInputFiles(pdfPath);

		await expect(page.locator('textarea')).toHaveValue('Editable headline');
	});

	test('a PDF that did not come from Lienzo is rejected with an explanation', async ({ page }) => {
		await page.goto('/canvas');
		await page.getByTestId('canvas-import-input').setInputFiles({
			name: 'plain.pdf',
			mimeType: 'application/pdf',
			buffer: Buffer.from('%PDF-1.4\n%%EOF')
		});

		await expect(page.getByTestId('canvas-import-error')).toContainText('plain.pdf');
	});
});
