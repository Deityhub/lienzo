import type { Page } from '@playwright/test';

/** Put a raw record into the app's IndexedDB (opening /documents first creates the database). */
export async function seedDocument(page: Page, doc: unknown) {
	await page.goto('/documents');
	await page.getByText('No documents').waitFor();
	await page.evaluate(
		(record) =>
			new Promise<void>((resolve, reject) => {
				const open = indexedDB.open('lienzo-db', 1);
				open.onsuccess = () => {
					const tx = open.result.transaction('documents', 'readwrite');
					tx.objectStore('documents').put(record);
					tx.oncomplete = () => resolve();
					tx.onerror = () => reject(tx.error);
				};
				open.onerror = () => reject(open.error);
			}),
		doc
	);
	await page.reload();
}
