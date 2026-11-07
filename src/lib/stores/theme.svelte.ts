import { browser } from '$app/environment';

export type Theme = 'light' | 'dark';
/** What the user picked: a theme, or to follow the system */
export type ThemePreference = Theme | 'system';

export const THEME_KEY = 'lienzo-theme';
/** The colour of the browser's own chrome (address bar on phones) for each theme */
const CHROME_COLOR: Record<Theme, string> = { light: '#0f6cbd', dark: '#292929' };

const isTheme = (value: unknown): value is Theme => value === 'light' || value === 'dark';

function stored(): Theme | null {
	try {
		const value = localStorage.getItem(THEME_KEY);
		return isTheme(value) ? value : null;
	} catch {
		return null; // storage can be blocked
	}
}

const systemTheme = (): Theme =>
	window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';

/** Put the theme on the page: the .dark class drives every colour token. */
function apply(theme: Theme) {
	const root = document.documentElement;
	root.classList.toggle('dark', theme === 'dark');
	root.style.colorScheme = theme;
	document.querySelector('meta[name="theme-color"]')?.setAttribute('content', CHROME_COLOR[theme]);
}

// app.html already applied the right theme before the first paint: start from what is on the page
let preference = $state<ThemePreference>('system');
let current = $state<Theme>(
	browser && document.documentElement.classList.contains('dark') ? 'dark' : 'light'
);

/**
 * Light or dark. Starts from the saved choice, else the system setting (and follows it until the user
 * picks one with the switch).
 */
export const theme = {
	get current() {
		return current;
	},
	get isDark() {
		return current === 'dark';
	},

	/** The user's choice: light, dark, or system (follow the device) */
	get preference() {
		return preference;
	},

	/** Choose a theme (or 'system') and remember it. */
	set(next: ThemePreference) {
		preference = next;
		current = next === 'system' ? systemTheme() : next;
		apply(current);
		try {
			if (next === 'system') localStorage.removeItem(THEME_KEY);
			else localStorage.setItem(THEME_KEY, next);
		} catch {
			// not remembered, but it still applies for this visit
		}
	},

	toggle() {
		theme.set(current === 'dark' ? 'light' : 'dark');
	},

	/** Call once in the browser: sync with the page and follow the system until a choice is saved. Returns a stop function. */
	init() {
		const saved = stored();
		preference = saved ?? 'system';
		current = saved ?? systemTheme();
		apply(current);

		const query = window.matchMedia('(prefers-color-scheme: dark)');
		const follow = () => {
			if (preference !== 'system') return; // the user chose
			current = systemTheme();
			apply(current);
		};
		query.addEventListener('change', follow);
		return () => query.removeEventListener('change', follow);
	}
};
