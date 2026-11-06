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

const boundaries = { horizontal: { start: 100, end: 2380 }, vertical: { start: 100, end: 3408 } };
const doc = (id = 'copy') => ({
	id,
	schemaVersion: 1,
	name: 'Copy',
	createdAt: 1,
	updatedAt: 2,
	pages: {
		p1: { id: 'p1', boundaries, elements: { a: shape('a', 300, 300), b: shape('b', 900, 300) } },
		p2: { id: 'p2', boundaries, elements: {} }
	}
});

async function openEditor(page: Page, document = doc()) {
	await seedDocument(page, document);
	await page.getByRole('button', { name: 'Edit' }).click();
	await expect(page.getByTestId('document-canvas')).toHaveCount(2);
}

const onPage = (page: Page, id: string) =>
	page.locator(`[data-page-id="${id}"] [data-testid="document-canvas"] > .cursor-move`);
const title = (page: Page) => page.getByTestId('property-panel-title');

/** The stored document's elements per page, once autosave has written it. */
async function stored(page: Page) {
	await expect(page.getByTestId('save-status')).toHaveText('Saved', { timeout: 10000 });
	return page.evaluate(
		() =>
			new Promise<Record<string, Record<string, Record<string, unknown>>>>((resolve, reject) => {
				const open = indexedDB.open('lienzo-db');
				open.onerror = () => reject(open.error);
				open.onsuccess = () => {
					const all = open.result.transaction('documents').objectStore('documents').getAll();
					all.onsuccess = () =>
						resolve(
							Object.fromEntries(
								Object.entries(
									all.result[0].pages as Record<
										string,
										{ elements: Record<string, Record<string, unknown>> }
									>
								).map(([id, p]) => [id, p.elements])
							)
						);
					all.onerror = () => reject(all.error);
				};
			})
	);
}

test.describe('Copy and paste', () => {
	test('Ctrl+C and Ctrl+V paste a copy, a little to the side, and select it', async ({ page }) => {
		await openEditor(page);
		await onPage(page, 'p1').first().click();

		await page.keyboard.press('ControlOrMeta+c');
		await page.keyboard.press('ControlOrMeta+v');

		await expect(onPage(page, 'p1')).toHaveCount(3);
		await expect(title(page)).toContainText('Shape Properties'); // the copy is selected

		await page.keyboard.press('ControlOrMeta+v'); // again: a further copy, further along
		await expect(onPage(page, 'p1')).toHaveCount(4);

		const elements = Object.values((await stored(page)).p1);
		const xs = elements.map((el) => el.x as number).sort((m, n) => m - n);
		expect(xs).toEqual([300, 340, 380, 900]); // original, two pastes, the other element
	});

	test('Ctrl+X removes the elements and Ctrl+V puts them back where they were', async ({
		page
	}) => {
		await openEditor(page);
		await onPage(page, 'p1').first().click();

		await page.keyboard.press('ControlOrMeta+x');
		await expect(onPage(page, 'p1')).toHaveCount(1);
		await page.keyboard.press('ControlOrMeta+v');

		await expect(onPage(page, 'p1')).toHaveCount(2);
		const xs = Object.values((await stored(page)).p1)
			.map((el) => el.x as number)
			.sort((m, n) => m - n);
		expect(xs).toEqual([300, 900]);
	});

	test('a selection or group is pasted as a group', async ({ page }) => {
		await openEditor(page);
		await onPage(page, 'p1').nth(0).click();
		await onPage(page, 'p1')
			.nth(1)
			.click({ modifiers: ['Shift'] });
		await page.keyboard.press('ControlOrMeta+g');

		await page.keyboard.press('ControlOrMeta+c');
		await page.keyboard.press('ControlOrMeta+v');

		await expect(onPage(page, 'p1')).toHaveCount(4);
		await expect(title(page)).toHaveText('Group of 2 elements'); // the pasted pair is a group of its own
		const groups = Object.values((await stored(page)).p1).map((el) => el.groupId as string);
		expect(new Set(groups).size).toBe(2);
	});

	test('pastes onto the page that was clicked last, in the same position', async ({ page }) => {
		await openEditor(page);
		await onPage(page, 'p1').first().click();
		await page.keyboard.press('ControlOrMeta+c');

		await page.locator('[data-page-id="p2"] [data-testid="document-canvas"]').click();
		await page.keyboard.press('ControlOrMeta+v');

		await expect(onPage(page, 'p2')).toHaveCount(1);
		await expect(onPage(page, 'p1')).toHaveCount(2);
		const { p2 } = await stored(page);
		expect(Object.values(p2)[0]).toMatchObject({ x: 300, y: 300 });
	});

	test('the Copy and Paste buttons and Duplicate work without the keyboard', async ({ page }) => {
		await openEditor(page);
		await onPage(page, 'p1').first().click();

		await page.getByTestId('duplicate-btn').click();
		await expect(onPage(page, 'p1')).toHaveCount(3);

		await page.getByTestId('copy-btn').click();
		await page.locator('[data-page-id="p2"] [data-testid="document-canvas"]').click();
		await page.getByTestId('paste-btn').click();
		await expect(onPage(page, 'p2')).toHaveCount(1);
		await expect(onPage(page, 'p1')).toHaveCount(3);

		await page.getByTestId('cut-btn').click();
		await expect(onPage(page, 'p2')).toHaveCount(0);
	});

	test('Ctrl+D duplicates the selection', async ({ page }) => {
		await openEditor(page);
		await onPage(page, 'p1').first().click();

		await page.keyboard.press('ControlOrMeta+d');

		await expect(onPage(page, 'p1')).toHaveCount(3);
	});

	test('copy and paste keep working as normal text editing inside a text box', async ({ page }) => {
		await page.goto('/canvas');
		await page.waitForLoadState('networkidle');
		await page.getByTestId('tool-text').dragTo(page.getByTestId('document-canvas'), {
			targetPosition: { x: 100, y: 100 }
		});
		const textarea = page.locator('textarea');
		await textarea.fill('hello');
		await textarea.press('ControlOrMeta+a');
		await page.keyboard.press('ControlOrMeta+c');
		await page.keyboard.press('ControlOrMeta+v');
		await page.keyboard.press('ControlOrMeta+v');

		await expect(textarea).toHaveValue('hellohello'); // text pasted into the text, not new elements
		await expect(page.locator('[data-testid="document-canvas"] > .cursor-move')).toHaveCount(1);
	});

	test('a picture pasted from the clipboard becomes an image element', async ({ page }) => {
		await openEditor(page);
		await page.locator('[data-page-id="p2"] [data-testid="document-canvas"]').click();

		await page.evaluate(async () => {
			// A 300x150 picture, as a screenshot would be
			const canvas = document.createElement('canvas');
			canvas.width = 300;
			canvas.height = 150;
			canvas.getContext('2d')!.fillRect(0, 0, 300, 150);
			const blob = await new Promise<Blob>((resolve) =>
				canvas.toBlob((b) => resolve(b!), 'image/png')
			);
			const data = new DataTransfer();
			data.items.add(new File([blob], 'screenshot.png', { type: 'image/png' }));
			document.dispatchEvent(
				new ClipboardEvent('paste', { clipboardData: data, bubbles: true, cancelable: true })
			);
		});

		await expect(onPage(page, 'p2')).toHaveCount(1);
		await expect(title(page)).toContainText('Image Properties');
		const { p2 } = await stored(page);
		expect(Object.values(p2)[0]).toMatchObject({
			type: 'image',
			alt: 'screenshot.png',
			width: 300,
			height: 150
		});
		expect(String(Object.values(p2)[0].src)).toMatch(/^data:image\/png;base64,/);
	});

	test('copied elements can be pasted into another document in a new tab', async ({
		page,
		context
	}) => {
		await openEditor(page);
		await onPage(page, 'p1').first().click();
		await page.keyboard.press('ControlOrMeta+c');

		// A new tab with a new, empty document
		const other = await context.newPage();
		await other.goto('/canvas');
		await other.waitForLoadState('networkidle');
		await other.getByTestId('document-canvas').click();
		await other.keyboard.press('ControlOrMeta+v');

		await expect(other.locator('[data-testid="document-canvas"] > .cursor-move')).toHaveCount(1);
	});
});
