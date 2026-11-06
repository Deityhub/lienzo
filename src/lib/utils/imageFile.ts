export const MAX_IMAGE_FILE_BYTES = 25 * 1024 * 1024;
/** Pictures bigger than this are shrunk before they are stored in the document */
const MAX_STORED_BYTES = 5 * 1024 * 1024;
const MAX_SIDE = 2000;

export interface ReadImage {
	/** The picture as a data URL, so it is stored inside the document */
	src: string;
	width: number;
	height: number;
}

const toDataUrl = (blob: Blob) =>
	new Promise<string>((resolve, reject) => {
		const reader = new FileReader();
		reader.onload = () => resolve(reader.result as string);
		reader.onerror = () => reject(reader.error);
		reader.readAsDataURL(blob);
	});

/**
 * Read a picture file (from the clipboard) so it can be an image element. Large pictures are shrunk, as the
 * document keeps them inside it. Throws for files that are too big or not a readable picture.
 */
export async function readImageFile(file: File): Promise<ReadImage> {
	if (file.size > MAX_IMAGE_FILE_BYTES) throw new Error('The picture is too large (over 25 MB).');
	const bitmap = await createImageBitmap(file);
	const { width, height } = bitmap;

	try {
		if (file.size <= MAX_STORED_BYTES) return { src: await toDataUrl(file), width, height };

		const scale = Math.min(1, MAX_SIDE / Math.max(width, height));
		const target = { width: Math.round(width * scale), height: Math.round(height * scale) };
		const canvas = new OffscreenCanvas(target.width, target.height);
		canvas.getContext('2d')!.drawImage(bitmap, 0, 0, target.width, target.height);
		const type = file.type === 'image/png' ? 'image/png' : 'image/jpeg';
		const shrunk = await canvas.convertToBlob({ type, quality: 0.85 });
		return { src: await toDataUrl(shrunk), ...target };
	} finally {
		bitmap.close();
	}
}
