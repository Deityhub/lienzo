export interface Size {
	width: number;
	height: number;
}
export interface Rect extends Size {
	x: number;
	y: number;
}

/**
 * Where an image is drawn inside its box for the editor's object-fit options (centred in every
 * case). Anything other than contain, cover and fill shows the image at its natural size, like the editor.
 */
export function fitImage(fit: string | undefined, box: Size, natural: Size): Rect {
	let { width, height } = natural;
	if (fit === 'fill') {
		width = box.width;
		height = box.height;
	} else if (fit === 'contain' || fit === 'cover') {
		const pick = fit === 'contain' ? Math.min : Math.max;
		const scale = pick(box.width / natural.width, box.height / natural.height);
		width = natural.width * scale;
		height = natural.height * scale;
	}
	return { x: (box.width - width) / 2, y: (box.height - height) / 2, width, height };
}
