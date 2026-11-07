/**
 * Takes the screenshots used in the README (docs/screenshots), in the light and the dark theme.
 *
 *   yarn docs:screenshots     (builds the app first)
 *
 * It starts the production preview itself. Needs the Playwright browser (`yarn playwright install chromium`).
 */
import { chromium } from '@playwright/test';
import { spawn } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const out = resolve(root, 'docs/screenshots');
const PORT = 4174; // not 4173, so it does not clash with the end-to-end tests
const BASE = `http://localhost:${PORT}`;
mkdirSync(out, { recursive: true });

const server = spawn(
	process.execPath,
	['node_modules/vite/bin/vite.js', 'preview', '--port', String(PORT), '--strictPort'],
	{
		cwd: root,
		stdio: 'ignore'
	}
);
const stop = () => server.kill();
process.on('exit', stop);

async function waitForServer() {
	for (let i = 0; i < 60; i++) {
		try {
			if ((await fetch(BASE)).ok) return;
		} catch {
			// not up yet
		}
		await new Promise((r) => setTimeout(r, 500));
	}
	throw new Error('The preview server did not start. Run `yarn build` first.');
}

const shots = [
	{
		name: 'home',
		run: async (page) => {
			await page.goto(BASE);
		}
	},
	{
		name: 'templates',
		run: async (page) => {
			await page.goto(`${BASE}/templates`);
		}
	},
	{
		name: 'editor',
		run: async (page) => {
			await page.goto(`${BASE}/templates`);
			await page.waitForLoadState('networkidle'); // hydrated: the button works
			await page.getByTestId('use-invoice').click();
			await page.waitForURL('**/canvas');
			await page.locator('textarea').first().waitFor();
		}
	}
];

const browser = await chromium.launch();
try {
	await waitForServer();
	for (const theme of ['light', 'dark']) {
		const context = await browser.newContext({
			viewport: { width: 1440, height: 900 },
			colorScheme: theme
		});
		await context.addInitScript((value) => localStorage.setItem('lienzo-theme', value), theme);
		for (const shot of shots) {
			const page = await context.newPage();
			await shot.run(page);
			await page.waitForLoadState('networkidle');
			await page.evaluate(() => document.fonts.ready);
			await page.screenshot({ path: resolve(out, `${shot.name}-${theme}.png`) });
			await page.close();
			process.stdout.write(`docs/screenshots/${shot.name}-${theme}.png\n`);
		}
		await context.close();
	}
} finally {
	await browser.close();
	stop();
}
