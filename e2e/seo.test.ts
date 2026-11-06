import { expect, test } from '@playwright/test';

const SITE = 'https://lienzo.deityhub.com';

test.describe('SEO', () => {
	test('landing page has title, canonical, social tags and structured data', async ({ page }) => {
		await page.goto('/');

		await expect(page).toHaveTitle(/Lienzo/);
		await expect(page.locator('meta[name="description"]')).toHaveAttribute('content', /.{50,}/);
		await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', `${SITE}/`);
		await expect(page.locator('meta[property="og:image"]')).toHaveAttribute(
			'content',
			`${SITE}/og-image.png`
		);
		await expect(page.locator('meta[name="twitter:card"]')).toHaveAttribute(
			'content',
			'summary_large_image'
		);
		await expect(page.locator('meta[name="robots"]')).toHaveCount(0);
		await expect(page.locator('meta[name="viewport"]')).not.toHaveAttribute(
			'content',
			/user-scalable|maximum-scale/
		);

		const jsonLd = JSON.parse(
			(await page.locator('script[type="application/ld+json"]').textContent()) ?? '{}'
		);
		const app = jsonLd['@graph'][0];
		expect(app['@type']).toBe('WebApplication');
		expect(app.url).toBe(SITE);
		expect(app.author).toMatchObject({
			'@type': 'Person',
			name: 'Chizoba Jude Ojini',
			url: 'https://judeojini.com'
		});
	});

	for (const path of ['/canvas', '/documents']) {
		test(`${path} is noindex`, async ({ page }) => {
			await page.goto(path);
			await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', /noindex/);
			await expect(page.locator('link[rel="canonical"]')).toHaveCount(0);
		});
	}

	test('sitemap lists the landing page, not the private pages', async ({ request }) => {
		const res = await request.get('/sitemap.xml');
		expect(res.ok()).toBe(true);
		const body = await res.text();
		expect(body).toContain(`<loc>${SITE}/</loc>`);
		expect(body).not.toContain('/canvas');
	});

	test('every template has its own indexable page, listed in the sitemap', async ({
		page,
		request
	}) => {
		const body = await (await request.get('/sitemap.xml')).text();
		expect(body).toContain(`<loc>${SITE}/templates</loc>`);
		expect(body).toContain(`<loc>${SITE}/templates/resume</loc>`);
		const listed = body.match(/\/templates\/[a-z-]+</g) ?? [];
		expect(listed.length).toBeGreaterThanOrEqual(22);

		await page.goto('/templates/invoice');
		await expect(page).toHaveTitle(/Invoice template/);
		await expect(page.locator('meta[name="robots"]')).toHaveCount(0);
		await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
			'href',
			`${SITE}/templates/invoice`
		);
		await expect(page.getByRole('heading', { level: 1 })).toHaveText('Invoice template');
		const jsonLd = JSON.parse(
			(await page.locator('script[type="application/ld+json"]').textContent()) ?? '{}'
		);
		expect(jsonLd['@graph'].map((n: { '@type': string }) => n['@type'])).toEqual([
			'CreativeWork',
			'BreadcrumbList'
		]);

		// links in the prerendered page are absolute: relative ones pointed at /templates/templates
		const hrefs = await page
			.locator('main a')
			.evaluateAll((all) => all.map((a) => a.getAttribute('href')));
		expect(hrefs.length).toBeGreaterThan(0);
		expect(hrefs.every((h) => h?.startsWith('/'))).toBe(true);

		await page.getByTestId('use-this-template').click();
		await expect(page).toHaveURL(/\/canvas$/);
		await expect(page.getByTestId('document-title')).toHaveText('Invoice');
	});

	test('an unknown template is a 404', async ({ request }) => {
		expect((await request.get('/templates/not-a-template')).status()).toBe(404);
	});

	test('robots.txt points to the sitemap', async ({ request }) => {
		const res = await request.get('/robots.txt');
		expect(await res.text()).toContain(`Sitemap: ${SITE}/sitemap.xml`);
	});
});
