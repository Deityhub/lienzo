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

	test('sitemap lists only the landing page', async ({ request }) => {
		const res = await request.get('/sitemap.xml');
		expect(res.ok()).toBe(true);
		const body = await res.text();
		expect(body).toContain(`<loc>${SITE}/</loc>`);
		expect(body).not.toContain('/canvas');
	});

	test('robots.txt points to the sitemap', async ({ request }) => {
		const res = await request.get('/robots.txt');
		expect(await res.text()).toContain(`Sitemap: ${SITE}/sitemap.xml`);
	});
});
