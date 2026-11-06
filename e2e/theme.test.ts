import { expect, test } from '@playwright/test';
import { seedDocument } from './helpers';

const isDark = (page: import('@playwright/test').Page) =>
	page.evaluate(() => document.documentElement.classList.contains('dark'));

test.describe('Theme', () => {
	test('follows the system setting by default', async ({ browser }) => {
		for (const [scheme, dark] of [
			['dark', true],
			['light', false]
		] as const) {
			const context = await browser.newContext({ colorScheme: scheme });
			const page = await context.newPage();
			await page.goto('/');
			expect(await isDark(page)).toBe(dark);
			await context.close();
		}
	});

	test('the switch changes the theme, and the choice survives a reload', async ({ page }) => {
		await page.goto('/');
		await page.waitForLoadState('networkidle');
		const toggle = page.getByTestId('theme-toggle');
		await expect(toggle).toHaveAttribute('role', 'switch');
		await expect(toggle).toHaveAttribute('aria-checked', 'false');

		await toggle.click();
		await expect(toggle).toHaveAttribute('aria-checked', 'true');
		expect(await isDark(page)).toBe(true);

		await page.reload();
		expect(await isDark(page)).toBe(true); // applied before the first paint, not after hydration
		await expect(page.getByTestId('theme-toggle')).toHaveAttribute('aria-checked', 'true');

		await page.getByTestId('theme-toggle').click();
		expect(await isDark(page)).toBe(false);
	});

	test('a saved choice wins over the system setting', async ({ browser }) => {
		const context = await browser.newContext({ colorScheme: 'dark' });
		await context.addInitScript(() => localStorage.setItem('lienzo-theme', 'light'));
		const page = await context.newPage();

		await page.goto('/');

		expect(await isDark(page)).toBe(false);
		await context.close();
	});

	test('the theme is on every page, and the page you design stays white in the dark theme', async ({
		browser
	}) => {
		const context = await browser.newContext({ colorScheme: 'dark' });
		const page = await context.newPage();
		await seedDocument(page, {
			id: 'theme',
			schemaVersion: 1,
			name: 'Theme',
			createdAt: 1,
			updatedAt: 2,
			pages: {
				p1: {
					id: 'p1',
					boundaries: {
						horizontal: { start: 100, end: 2380 },
						vertical: { start: 100, end: 3408 }
					},
					elements: {}
				}
			}
		});
		await page.waitForLoadState('networkidle');
		await expect(page.getByTestId('theme-toggle')).toBeVisible(); // documents page

		await page.getByRole('button', { name: 'Edit' }).click();
		await expect(page.getByTestId('theme-toggle')).toBeVisible(); // editor
		expect(await isDark(page)).toBe(true);

		const colours = await page.getByTestId('document-canvas').evaluate((el) => {
			const style = getComputedStyle(el);
			return { paper: style.backgroundColor, app: getComputedStyle(document.body).color };
		});
		expect(colours.paper).toBe('rgb(255, 255, 255)');
		expect(colours.app).not.toBe('rgb(36, 36, 36)'); // the interface itself is light on dark
		await context.close();
	});
});
