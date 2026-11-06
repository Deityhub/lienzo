import { appStore } from '../stores/appStore.svelte.ts';

/** Where pasted elements go: the page last clicked, else the one nearest the middle of the screen. */
export function targetPageId(): string | null {
	const active = appStore.getActivePageId();
	if (active) return active;

	const container = document.querySelector('[data-testid="canvas-container"]');
	const middle = container
		? container.getBoundingClientRect().top + container.getBoundingClientRect().height / 2
		: window.innerHeight / 2;
	let best: { id: string; distance: number } | null = null;
	for (const id of Object.keys(appStore.getPages())) {
		const canvas = document.getElementById(`canvas-${id}`);
		if (!canvas) continue;
		const rect = canvas.getBoundingClientRect();
		// zero when the middle of the screen is on the page
		const distance = Math.max(rect.top - middle, middle - rect.bottom, 0);
		if (!best || distance < best.distance) best = { id, distance };
	}
	return best?.id ?? Object.keys(appStore.getPages())[0] ?? null;
}

/** After a cut the originals are gone, so the first paste may land exactly where they were (no source page). */
