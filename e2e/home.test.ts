import { expect, test } from '@playwright/test';

test.describe('Home page', () => {
	test('has the search essentials: title, description, one h1, landmarks', async ({ page }) => {
		await page.goto('/');

		await expect(page).toHaveTitle(/Free Document Builder with Editable PDF Export/);
		const description = await page.locator('meta[name="description"]').getAttribute('content');
		expect(description!.length).toBeGreaterThan(70);
		expect(description!.length).toBeLessThanOrEqual(160);
		await expect(page.locator('h1')).toHaveCount(1);
		await expect(page.getByRole('banner')).toBeVisible();
		await expect(page.getByRole('main')).toBeVisible();
		await expect(page.getByRole('contentinfo')).toBeVisible();
		await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
			'href',
			'https://lienzo.deityhub.com/'
		);
	});

	test('describes the app and its questions as structured data', async ({ page }) => {
		await page.goto('/');

		const data = JSON.parse(
			(await page.locator('script[type="application/ld+json"]').first().textContent())!
		);
		const types = data['@graph'].map((item: { '@type': string }) => item['@type']);
		expect(types).toEqual(['WebApplication', 'FAQPage']);

		// Every question in the structured data is on the page, word for word
		for (const question of data['@graph'][1].mainEntity as Array<{ name: string }>) {
			await expect(page.getByText(question.name, { exact: true })).toBeVisible();
		}
	});

	test('the questions open and close without JavaScript', async ({ page }) => {
		await page.goto('/');
		const second = page.locator('details').nth(1);

		await expect(page.locator('details').first()).toHaveAttribute('open', '');
		await expect(second).not.toHaveAttribute('open', '');
		await second.locator('summary').click();
		await expect(second).toHaveAttribute('open', '');
	});

	test('the editor can be opened from the header and the hero', async ({ page }) => {
		await page.goto('/');
		await expect(page.getByRole('link', { name: 'Open the editor' }).first()).toHaveAttribute(
			'href',
			'/canvas'
		);
		await expect(page.getByRole('link', { name: 'Start designing' })).toHaveAttribute(
			'href',
			'/canvas'
		);
	});

	test('fits a phone: nothing sideways, and the main actions are reachable', async ({ page }) => {
		await page.setViewportSize({ width: 390, height: 844 });
		await page.goto('/');

		const overflow = await page.evaluate(
			() => document.documentElement.scrollWidth - document.documentElement.clientWidth
		);
		expect(overflow).toBeLessThanOrEqual(0);
		await expect(page.getByRole('link', { name: 'Start designing' })).toBeVisible();
		await expect(page.getByTestId('theme-toggle')).toBeVisible();
	});
});
