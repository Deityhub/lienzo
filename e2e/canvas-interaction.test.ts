import { expect, test, type Page } from '@playwright/test';

async function addTextElement(page: Page) {
	await page.goto('/canvas');
	await page.getByTestId('tool-text').dragTo(page.getByTestId('document-canvas'), {
		targetPosition: { x: 200, y: 200 }
	});
	await expect(page.getByTestId('property-panel-title')).toContainText('Text Properties');
}

async function geometry(page: Page) {
	const read = async (id: string) => Number(await page.getByTestId(id).inputValue());
	return {
		x: await read('input-x'),
		y: await read('input-y'),
		width: await read('input-width'),
		height: await read('input-height')
	};
}

/** Press on the centre of `target`, move by (dx, dy) screen pixels, release. */
async function dragBy(page: Page, target: ReturnType<Page['locator']>, dx: number, dy: number) {
	const box = (await target.boundingBox())!;
	const startX = box.x + box.width / 2;
	const startY = box.y + box.height / 2;
	await page.mouse.move(startX, startY);
	await page.mouse.down();
	await page.mouse.move(startX + dx / 2, startY + dy / 2, { steps: 4 });
	await page.mouse.move(startX + dx, startY + dy, { steps: 4 });
	await page.mouse.up();
	await page.waitForTimeout(100); // let the last animation frame apply
}

// Boundary clamping, snapping and resize maths are covered by unit tests in utils/geometry.spec.ts.
// These check that the pointer handling in Canvas.svelte is wired to them.
test.describe('Canvas interaction', () => {
	test('dragging an element moves it without resizing it', async ({ page }) => {
		await addTextElement(page);
		const before = await geometry(page);

		await dragBy(page, page.locator('textarea'), 60, 40);

		const after = await geometry(page);
		expect(after.x).toBeGreaterThan(before.x);
		expect(after.y).toBeGreaterThan(before.y);
		expect(after.width).toBe(before.width);
		expect(after.height).toBe(before.height);
	});

	test('the north-west handle moves the origin and grows the element', async ({ page }) => {
		await addTextElement(page);
		await dragBy(page, page.locator('textarea'), 80, 80); // make room first
		const before = await geometry(page);

		await dragBy(page, page.getByTestId('resize-handle-nw'), -30, -20);

		const after = await geometry(page);
		expect(after.x).toBeLessThan(before.x);
		expect(after.y).toBeLessThan(before.y);
		expect(after.width).toBeGreaterThan(before.width);
		expect(after.height).toBeGreaterThan(before.height);
	});
});
