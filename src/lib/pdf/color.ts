export interface Rgba {
	r: number; // 0-1
	g: number;
	b: number;
	a: number;
}

/** Parse the colours the editor produces (#rgb, #rrggbb, #rrggbbaa, rgb(), rgba()). Anything else is null. */
export function parseColor(value: string | undefined): Rgba | null {
	if (!value) return null;
	const text = value.trim().toLowerCase();

	const hex = /^#([0-9a-f]{3,4}|[0-9a-f]{6}|[0-9a-f]{8})$/.exec(text)?.[1];
	if (hex) {
		const full = hex.length <= 4 ? [...hex].map((c) => c + c).join('') : hex;
		const channel = (i: number) => parseInt(full.slice(i * 2, i * 2 + 2), 16) / 255;
		return { r: channel(0), g: channel(1), b: channel(2), a: full.length === 8 ? channel(3) : 1 };
	}

	const fn = /^rgba?\(([^)]+)\)$/.exec(text)?.[1];
	if (fn) {
		const parts = fn
			.split(/[\s,/]+/)
			.filter(Boolean)
			.map(parseFloat);
		if (parts.length >= 3 && parts.every((n) => !Number.isNaN(n))) {
			return { r: parts[0] / 255, g: parts[1] / 255, b: parts[2] / 255, a: parts[3] ?? 1 };
		}
	}
	return null;
}
