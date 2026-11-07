import { expect, test } from '@playwright/test';

test.describe('Template gallery', () => {
	test('lists every template, and the blank document first', async ({ page }) => {
		await page.goto('/templates');
		await expect(page.getByRole('heading', { level: 1 })).toHaveText('Start from a template');
		await expect(page.getByTestId('template-blank')).toBeVisible();
		expect(await page.getByTestId('template-card').count()).toBeGreaterThanOrEqual(22);
	});

	test('filters by category and by search', async ({ page }) => {
		await page.goto('/templates');
		await page.waitForLoadState('networkidle');
		const cards = page.getByTestId('template-card');
		const all = await cards.count();

		await page.getByTestId('category-Events').click();
		await expect(page.getByTestId('category-Events')).toHaveAttribute('aria-pressed', 'true');
		const events = await cards.count();
		expect(events).toBeGreaterThan(0);
		expect(events).toBeLessThan(all);
		await expect(page.getByTestId('use-resume')).toHaveCount(0);

		await page.getByTestId('category-All').click();
		await page.getByLabel('Search templates').fill('invoice');
		await expect(cards).toHaveCount(1);
		await expect(page.getByTestId('use-invoice')).toBeVisible();

		await page.getByLabel('Search templates').fill('zzzz');
		await expect(cards).toHaveCount(0);
		await expect(page.getByRole('status')).toContainText('No templates match');
	});

	test('a template opens in the editor as its own editable document', async ({ page }) => {
		await page.goto('/templates');
		await page.waitForLoadState('networkidle');
		await page.getByTestId('use-resume').click();

		await expect(page).toHaveURL(/\/canvas$/);
		await expect(page.getByTestId('document-title')).toHaveText('Resume');
		const texts = page.locator('textarea');
		await expect(texts.first()).toBeVisible();
		expect(await texts.count()).toBeGreaterThan(8);
		const values = await texts.evaluateAll((all) =>
			all.map((t) => (t as HTMLTextAreaElement).value)
		);
		expect(values).toContain('Alex Morgan');
	});

	test('each card links to the template’s own page', async ({ page }) => {
		await page.goto('/templates');
		await page.getByRole('link', { name: 'Resume', exact: true }).click();
		await expect(page).toHaveURL(/\/templates\/resume$/);
		await expect(page.getByRole('heading', { level: 1 })).toHaveText('Resume template');
		await expect(page.getByRole('navigation', { name: 'Breadcrumb' })).toContainText('Templates');
	});

	test('the blank document starts empty', async ({ page }) => {
		await page.goto('/templates');
		await page.waitForLoadState('networkidle');
		await page.getByTestId('template-blank').click();

		await expect(page).toHaveURL(/\/canvas$/);
		await expect(page.locator('textarea')).toHaveCount(0);
	});

	test('the home page shows a few of them, and links to all', async ({ page, request }) => {
		await page.goto('/');
		await page.waitForLoadState('networkidle');
		await expect(page.getByRole('heading', { name: 'Start from a template' })).toBeVisible();
		await expect(page.getByTestId('featured-templates').getByRole('listitem')).toHaveCount(6);
		await expect(page.getByTestId('browse-templates')).toHaveAttribute('href', '/templates');

		const sitemap = await (await request.get('/sitemap.xml')).text();
		expect(sitemap).toContain('/templates');
	});

	test('a template on the home page opens in the editor', async ({ page }) => {
		await page.goto('/');
		await page.waitForLoadState('networkidle');
		await page.getByTestId('featured-invoice').click();

		await expect(page).toHaveURL(/\/canvas$/);
		await expect(page.getByTestId('document-title')).toHaveText('Invoice');
	});

	test('fits a phone: no sideways scroll, and the previews stay white in the dark theme', async ({
		browser
	}) => {
		const context = await browser.newContext({
			viewport: { width: 375, height: 812 },
			colorScheme: 'dark'
		});
		const page = await context.newPage();
		await page.goto('/templates');
		await page.waitForLoadState('networkidle');
		const overflow = await page.evaluate(
			() => document.documentElement.scrollWidth - document.documentElement.clientWidth
		);
		expect(overflow).toBeLessThanOrEqual(0);
		const paper = await page
			.getByTestId('template-card')
			.nth(1)
			.locator('[aria-hidden="true"]')
			.first()
			.evaluate((el) => getComputedStyle(el).backgroundColor);
		expect(paper).toBe('rgb(255, 255, 255)');
		await context.close();
	});
});
