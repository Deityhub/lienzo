export interface LoadedImage {
	bytes: Uint8Array;
	format: 'png' | 'jpg';
	width: number;
	height: number;
}

/**
 * Read an image so it can be embedded in the PDF. PNG and JPEG are embedded as they are; other formats are
 * converted to PNG. Returns null when the image cannot be read, e.g. a website that does not allow other
 * sites to fetch its images.
 */
export async function loadImage(src: string): Promise<LoadedImage | null> {
	try {
		const blob = await (await fetch(src)).blob();
		const bitmap = await createImageBitmap(blob);
		const { width, height } = bitmap;
		if (blob.type === 'image/png' || blob.type === 'image/jpeg') {
			bitmap.close();
			return {
				bytes: new Uint8Array(await blob.arrayBuffer()),
				format: blob.type === 'image/png' ? 'png' : 'jpg',
				width,
				height
			};
		}

		const canvas = new OffscreenCanvas(width, height);
		canvas.getContext('2d')!.drawImage(bitmap, 0, 0);
		bitmap.close();
		const png = await canvas.convertToBlob({ type: 'image/png' });
		return { bytes: new Uint8Array(await png.arrayBuffer()), format: 'png', width, height };
	} catch {
		return null;
	}
}
