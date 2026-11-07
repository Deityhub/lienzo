import { expect, test } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { seedDocument } from './helpers';

const doc = {
	id: 'doc-1',
	schemaVersion: 1,
	name: 'My Resume',
	createdAt: 1,
	updatedAt: 2,
	pages: {
		p1: {
			id: 'p1',
			boundaries: { horizontal: { start: 100, end: 700 }, vertical: { start: 100, end: 1000 } },
			elements: {}
		}
	}
};

test.describe('Import / export', () => {
	test('export all is disabled when there are no documents', async ({ page }) => {
		await page.goto('/documents');
		await expect(page.getByTestId('export-all-btn')).toBeDisabled();
	});

	test('exports a document and shows the file contents', async ({ page }) => {
		await seedDocument(page, doc);

		const downloadPromise = page.waitForEvent('download');
		await page.getByTestId('export-document-btn').click();
		const download = await downloadPromise;
		expect(download.suggestedFilename()).toBe('my-resume.lienzo.json');

		const file = JSON.parse(await readFile(await download.path(), 'utf-8'));
		expect(file).toMatchObject({ app: 'lienzo', formatVersion: 1 });
		expect(file.documents[0].name).toBe('My Resume');
	});

	test('importing into an empty library restores the document without asking', async ({ page }) => {
		await page.goto('/documents');
		await page.waitForLoadState('networkidle'); // the page must be interactive before a file is chosen
		await page.getByTestId('import-input').setInputFiles({
			name: 'resume.lienzo.json',
			mimeType: 'application/json',
			buffer: Buffer.from(JSON.stringify({ app: 'lienzo', formatVersion: 1, documents: [doc] }))
		});

		await expect(page.getByTestId('import-notice')).toContainText('Imported 1 document');
		await expect(page.getByRole('heading', { name: 'My Resume' })).toBeVisible();
		await expect(page.getByTestId('import-keep-both-btn')).toBeHidden();
	});

	test.describe('when an imported document already exists', () => {
		const file = {
			name: 'resume.lienzo.json',
			mimeType: 'application/json',
			buffer: Buffer.from(
				JSON.stringify({
					app: 'lienzo',
					formatVersion: 1,
					documents: [{ ...doc, name: 'My Resume (edited)' }]
				})
			)
		};

		test('asks, and "Keep both" imports a separate copy', async ({ page }) => {
			await seedDocument(page, doc);
			await page.getByTestId('import-input').setInputFiles(file);

			await expect(page.getByTestId('conflict-list')).toContainText('My Resume (edited)');
			await page.getByTestId('import-keep-both-btn').click();

			await expect(page.getByTestId('import-notice')).toContainText('Imported 1 document');
			await expect(page.getByRole('heading', { name: 'My Resume', exact: true })).toBeVisible();
			await expect(page.getByRole('heading', { name: 'My Resume (edited)' })).toBeVisible();
		});

		test('"Replace existing" overwrites the saved document', async ({ page }) => {
			await seedDocument(page, doc);
			await page.getByTestId('import-input').setInputFiles(file);
			await page.getByTestId('import-replace-btn').click();

			await expect(page.getByRole('heading', { name: 'My Resume (edited)' })).toBeVisible();
			await expect(page.getByRole('heading', { name: 'My Resume', exact: true })).toHaveCount(0);
		});

		test('Cancel imports nothing', async ({ page }) => {
			await seedDocument(page, doc);
			await page.getByTestId('import-input').setInputFiles(file);
			await page.getByRole('button', { name: 'Cancel' }).click();

			await expect(page.getByTestId('import-notice')).toBeHidden();
			await expect(page.getByRole('heading', { name: 'My Resume', exact: true })).toBeVisible();
			await expect(page.getByRole('heading', { name: 'My Resume (edited)' })).toHaveCount(0);
		});
	});

	test('importing an invalid file shows an error and keeps existing documents', async ({
		page
	}) => {
		await seedDocument(page, doc);

		await page.getByTestId('import-input').setInputFiles({
			name: 'broken.json',
			mimeType: 'application/json',
			buffer: Buffer.from('{"not":"lienzo"}')
		});

		const notice = page.getByTestId('import-notice');
		await expect(notice).toContainText('Nothing was imported');
		await expect(notice).toContainText('broken.json – This is not a Lienzo document file.');
		await expect(page.getByRole('heading', { name: 'My Resume' })).toHaveCount(1);
	});

	test.describe('importing into the canvas', () => {
		const twoPageDocument = {
			...doc,
			id: 'canvas-doc',
			name: 'Imported Doc',
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
							text: 'Imported headline',
							fontFamily: 'Inter',
							fontSize: 24,
							fontWeight: '400',
							fontStyle: 'normal',
							color: '#000000'
						}
					}
				},
				p2: {
					id: 'p2',
					boundaries: { horizontal: { start: 100, end: 700 }, vertical: { start: 100, end: 1000 } },
					elements: {}
				}
			}
		};
		const fileOf = (documents: unknown[], name = 'doc.lienzo.json') => ({
			name,
			mimeType: 'application/json',
			buffer: Buffer.from(JSON.stringify({ app: 'lienzo', formatVersion: 1, documents }))
		});

		test('an empty canvas is replaced right away', async ({ page }) => {
			await page.goto('/canvas');
			await page.waitForLoadState('networkidle'); // clicks only work once the page is interactive
			await page.getByTestId('canvas-import-input').setInputFiles(fileOf([twoPageDocument]));

			await expect(page.getByTestId('page-count')).toContainText('2 Pages');
			await expect(page.locator('textarea')).toHaveValue('Imported headline');
			await expect(page.getByTestId('canvas-import-confirm')).toBeHidden();
		});

		test('a canvas with content asks before replacing it', async ({ page }) => {
			await page.goto('/canvas');
			await page.waitForLoadState('networkidle'); // clicks only work once the page is interactive
			await page.getByTestId('tool-text').dragTo(page.getByTestId('document-canvas'), {
				targetPosition: { x: 200, y: 200 }
			});
			await expect(page.getByTestId('property-panel-title')).toContainText('Text Properties');

			await page.getByTestId('canvas-import-input').setInputFiles(fileOf([twoPageDocument]));
			await expect(page.getByTestId('canvas-import-confirm')).toContainText('Imported Doc');
			await expect(page.getByTestId('page-count')).toContainText('1 Page');

			await page.getByRole('button', { name: 'Replace canvas' }).click();
			await expect(page.getByTestId('page-count')).toContainText('2 Pages');
			await expect(page.locator('textarea')).toHaveValue('Imported headline');
		});

		test('cancelling keeps the current canvas', async ({ page }) => {
			await page.goto('/canvas');
			await page.waitForLoadState('networkidle'); // clicks only work once the page is interactive
			await page.getByTestId('add-page-btn').click();

			await page.getByTestId('canvas-import-input').setInputFiles(fileOf([twoPageDocument]));
			await page.getByRole('dialog').getByRole('button', { name: 'Cancel' }).click();

			await expect(page.getByTestId('page-count')).toContainText('2 Pages');
			await expect(page.locator('textarea')).toHaveCount(0);
		});

		test('a file with several documents is rejected', async ({ page }) => {
			await page.goto('/canvas');
			await page.waitForLoadState('networkidle'); // clicks only work once the page is interactive
			await page
				.getByTestId('canvas-import-input')
				.setInputFiles(fileOf([twoPageDocument, { ...twoPageDocument, id: 'other' }]));

			await expect(page.getByTestId('canvas-import-error')).toContainText(
				'contains 2 documents. Import it from the Documents page instead.'
			);
			await expect(page.getByTestId('page-count')).toContainText('1 Page');
		});

		test('an invalid file shows an error', async ({ page }) => {
			await page.goto('/canvas');
			await page.waitForLoadState('networkidle'); // clicks only work once the page is interactive
			await page.getByTestId('canvas-import-input').setInputFiles({
				name: 'bad.json',
				mimeType: 'application/json',
				buffer: Buffer.from('nope')
			});

			await expect(page.getByTestId('canvas-import-error')).toContainText('not valid JSON');
		});
	});
});
