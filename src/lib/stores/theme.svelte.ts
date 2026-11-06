import { browser } from '$app/environment';

export type Theme = 'light' | 'dark';

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

	/** Choose a theme and remember it. */
	set(next: Theme) {
		current = next;
		apply(next);
		try {
			localStorage.setItem(THEME_KEY, next);
		} catch {
			// not remembered, but it still applies for this visit
		}
	},

	toggle() {
		theme.set(current === 'dark' ? 'light' : 'dark');
	},

	/** Call once in the browser: sync with the page and follow the system until a choice is saved. Returns a stop function. */
	init() {
		current = stored() ?? systemTheme();
		apply(current);

		const query = window.matchMedia('(prefers-color-scheme: dark)');
		const follow = () => {
			if (stored()) return; // the user chose
			current = systemTheme();
			apply(current);
		};
		query.addEventListener('change', follow);
		return () => query.removeEventListener('change', follow);
	}
};
