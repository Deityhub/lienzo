import { expect, test, type Page } from '@playwright/test';
import { seedDocument } from './helpers';

/** The stored documents, read straight from IndexedDB. */
const storedDocuments = (page: Page) =>
	page.evaluate(
		() =>
			new Promise<
				Array<{ name: string; pages: Record<string, { elements: Record<string, unknown> }> }>
			>((resolve, reject) => {
				const open = indexedDB.open('lienzo-db');
				open.onerror = () => reject(open.error);
				open.onsuccess = () => {
					const all = open.result.transaction('documents').objectStore('documents').getAll();
					all.onsuccess = () => resolve(all.result);
					all.onerror = () => reject(all.error);
				};
			})
	);

test.describe('Autosave', () => {
	test('a new document is saved as "Untitled document" on its first edit', async ({ page }) => {
		await page.goto('/canvas');
		await page.waitForLoadState('networkidle');
		await expect(page.getByTestId('save-status')).toHaveText('');

		await page.getByTestId('tool-text').dragTo(page.getByTestId('document-canvas'), {
			targetPosition: { x: 60, y: 60 }
		});

		await expect(page.getByTestId('save-status')).toHaveText('Saving…', { timeout: 10000 });
		await expect(page.getByTestId('save-status')).toHaveText('Saved');
		const [stored] = await storedDocuments(page);
		expect(stored.name).toBe('Untitled document');
		expect(Object.values(Object.values(stored.pages)[0].elements)).toHaveLength(1);

		await page.getByTestId('back-btn').click();
		await expect(page).toHaveURL(/\/documents/);
		await expect(page.getByRole('heading', { name: 'Untitled document' })).toBeVisible();
	});

	test('edits to a saved document are stored without pressing Save', async ({ page }) => {
		await seedDocument(page, {
			id: 'auto-1',
			schemaVersion: 1,
			name: 'My Resume',
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
							text: 'Before',
							fontFamily: 'Inter',
							fontSize: 24,
							fontWeight: '400',
							fontStyle: 'normal',
							color: '#000000'
						}
					}
				}
			}
		});
		await page.getByRole('button', { name: 'Edit' }).click();
		await expect(page.locator('textarea')).toHaveValue('Before');

		// Opening a document is not an edit
		await page.waitForTimeout(2500);
		expect((await storedDocuments(page))[0].pages.p1.elements).toMatchObject({
			t1: { text: 'Before' }
		});

		await page.locator('textarea').fill('After');
		await expect(page.getByTestId('save-status')).toHaveText('Saved', { timeout: 10000 });

		const [stored] = await storedDocuments(page);
		expect(stored.name).toBe('My Resume');
		expect(stored.pages.p1.elements).toMatchObject({ t1: { text: 'After' } });
	});

	test('leaving right after an edit still saves it', async ({ page }) => {
		await page.goto('/canvas');
		await page.waitForLoadState('networkidle');
		await page.getByTestId('add-page-btn').click();

		await page.getByTestId('back-btn').click(); // well before the autosave delay
		await expect(page).toHaveURL(/\/documents/);

		await expect(page.getByRole('heading', { name: 'Untitled document' })).toBeVisible();
	});

	test('shows Saving… and Saved once per edit, not twice', async ({ page }) => {
		await page.goto('/canvas');
		await page.waitForLoadState('networkidle');
		await page.evaluate(() => {
			const w = window as unknown as { statuses: string[] };
			w.statuses = [];
			const el = document.querySelector('[data-testid="save-status"]')!;
			new MutationObserver(() => w.statuses.push(el.textContent?.trim() ?? '')).observe(el, {
				childList: true,
				subtree: true,
				characterData: true
			});
		});

		await page.getByTestId('tool-text').dragTo(page.getByTestId('document-canvas'), {
			targetPosition: { x: 60, y: 60 }
		});
		await expect(page.getByTestId('save-status')).toHaveText('Saved', { timeout: 10000 });
		await page.waitForTimeout(3000); // long enough for a stray second save

		expect(
			await page.evaluate(() => (window as unknown as { statuses: string[] }).statuses)
		).toEqual(['Saving…', 'Saved']);
	});
});
