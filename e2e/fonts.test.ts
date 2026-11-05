import { expect, test } from '@playwright/test';

const isFontFile = (url: string) => /\.(woff2?|ttf|otf)(\?|$)/.test(url);

test.describe('Fonts', () => {
	test('landing page loads only the Inter UI font', async ({ page }) => {
		const fonts: string[] = [];
		page.on('response', (res) => isFontFile(res.url()) && fonts.push(res.url()));

		await page.goto('/');
		await page.waitForLoadState('networkidle');

		expect(fonts).toHaveLength(1);
		expect(fonts[0]).toContain('Inter-Variable-latin');
	});

	test('editor fonts load only when the font picker needs them', async ({ page }) => {
		const fonts: string[] = [];
		page.on('response', (res) => isFontFile(res.url()) && fonts.push(res.url()));

		await page.goto('/canvas');
		await page.waitForLoadState('networkidle');
		expect(fonts).toHaveLength(1);

		await page.getByTestId('tool-text').dragTo(page.getByTestId('document-canvas'), {
			targetPosition: { x: 200, y: 200 }
		});
		const merriweather = page.waitForResponse((res) => res.url().includes('Merriweather-Variable'));
		await page.getByTestId('select-font-family').click();
		expect((await merriweather).ok()).toBe(true);
	});
});
