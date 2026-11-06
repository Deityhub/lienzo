import { DISPLAY_SCALE } from '../const/dimension';

const MIN_SCALE = 0.12;
const MIN_WIDTH = 360;
const MAX_WIDTH = 1440;

/** How large the page is drawn on a screen of the given width: full display scale on wide screens, shrinking linearly on narrow ones. */
export function displayScaleForWidth(width: number): number {
	if (width >= MAX_WIDTH) return DISPLAY_SCALE;
	if (width <= MIN_WIDTH) return MIN_SCALE;

	const progress = (width - MIN_WIDTH) / (MAX_WIDTH - MIN_WIDTH);
	return Number((MIN_SCALE + progress * (DISPLAY_SCALE - MIN_SCALE)).toFixed(3));
}

/** The narrowest of the viewport measurements, so the page fits on mobile browsers whatever they report. */
export function viewportWidth(): number {
	return Math.min(
		window.innerWidth,
		document.documentElement.clientWidth || 0,
		window.screen.width || 0
	);
}

/**
 * Report the display scale now and whenever the screen size changes (resize, rotation, mobile
 * browser toolbars). Returns a function that stops tracking.
 */
export function trackDisplayScale(onScale: (scale: number) => void): () => void {
	const update = () => {
		// Use a frame so we read the most up-to-date dimensions
		requestAnimationFrame(() => onScale(displayScaleForWidth(viewportWidth())));
	};

	let timer: ReturnType<typeof setTimeout>;
	const debouncedUpdate = () => {
		clearTimeout(timer);
		timer = setTimeout(update, 100);
	};

	update();
	window.addEventListener('resize', debouncedUpdate, { passive: true });
	window.addEventListener('orientationchange', debouncedUpdate, { passive: true });
	window.visualViewport?.addEventListener('resize', debouncedUpdate, { passive: true });

	return () => {
		clearTimeout(timer);
		window.removeEventListener('resize', debouncedUpdate);
		window.removeEventListener('orientationchange', debouncedUpdate);
		window.visualViewport?.removeEventListener('resize', debouncedUpdate);
	};
}
