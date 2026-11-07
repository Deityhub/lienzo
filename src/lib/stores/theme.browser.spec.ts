// Runs in Chromium: the real document and localStorage
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { THEME_KEY, theme } from './theme.svelte';

const root = document.documentElement;

beforeEach(() => {
	localStorage.removeItem(THEME_KEY);
	root.classList.remove('dark');
	theme.set('light');
	localStorage.removeItem(THEME_KEY);
});
afterEach(() => {
	vi.restoreAllMocks();
	localStorage.removeItem(THEME_KEY);
	root.classList.remove('dark');
	root.style.colorScheme = '';
});

describe('theme', () => {
	it('choosing a theme puts it on the page and remembers it', () => {
		theme.set('dark');

		expect(theme.current).toBe('dark');
		expect(theme.isDark).toBe(true);
		expect(root.classList.contains('dark')).toBe(true);
		expect(root.style.colorScheme).toBe('dark');
		expect(localStorage.getItem(THEME_KEY)).toBe('dark');

		theme.set('light');
		expect(root.classList.contains('dark')).toBe(false);
		expect(root.style.colorScheme).toBe('light');
	});

	it('toggle switches between the two', () => {
		theme.toggle();
		expect(theme.current).toBe('dark');
		theme.toggle();
		expect(theme.current).toBe('light');
	});

	it('init takes the saved choice, whatever the system says', () => {
		localStorage.setItem(THEME_KEY, 'dark');
		const stop = theme.init();

		expect(theme.current).toBe('dark');
		expect(root.classList.contains('dark')).toBe(true);
		stop();
	});

	it('system forgets the saved choice and follows the device', () => {
		theme.set('dark');
		theme.set('system');

		expect(theme.preference).toBe('system');
		expect(localStorage.getItem(THEME_KEY)).toBeNull();
		expect(['light', 'dark']).toContain(theme.current);
	});

	it('init ignores a saved value it does not know', () => {
		localStorage.setItem(THEME_KEY, 'sepia');
		const stop = theme.init();

		// falls back to the system setting, which is light or dark: never "sepia"
		expect(['light', 'dark']).toContain(theme.current);
		stop();
	});

	it('still switches when the browser blocks storage', () => {
		vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
			throw new Error('blocked');
		});
		vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
			throw new Error('blocked');
		});

		expect(() => theme.set('dark')).not.toThrow();
		expect(theme.current).toBe('dark');
		expect(root.classList.contains('dark')).toBe(true);
		const stop = theme.init(); // reading is blocked too: no crash
		stop();
	});

	it('updates the colour of the browser chrome', () => {
		const meta = document.createElement('meta');
		meta.name = 'theme-color';
		meta.content = '#0f6cbd';
		document.head.appendChild(meta);

		theme.set('dark');
		expect(meta.content).toBe('#292929');
		theme.set('light');
		expect(meta.content).toBe('#0f6cbd');
		meta.parentNode?.removeChild(meta);
	});
});
