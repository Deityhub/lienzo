import { StandardFonts, type PDFDocument, type PDFFont } from '@cantoo/pdf-lib';
import { resolveFont, type FontManifest } from './fontResolver';

const FONT_DIR = '/pdf-fonts';

let manifest: Promise<FontManifest> | undefined;
const files = new Map<string, Promise<Uint8Array>>();

function loadManifest(): Promise<FontManifest> {
	manifest ??= fetch(`${FONT_DIR}/manifest.json`).then((r) => {
		if (!r.ok) throw new Error('Could not load the font list');
		return r.json();
	});
	manifest.catch(() => (manifest = undefined)); // retry on the next export
	return manifest;
}

function loadFile(file: string): Promise<Uint8Array> {
	let bytes = files.get(file);
	if (!bytes) {
		bytes = fetch(`${FONT_DIR}/${file}`).then(async (r) => {
			if (!r.ok) throw new Error(`Could not load font ${file}`);
			return new Uint8Array(await r.arrayBuffer());
		});
		bytes.catch(() => files.delete(file));
		files.set(file, bytes);
	}
	return bytes;
}

/** Embeds the fonts a document uses into one PDF, once each, and only the characters it uses. */
export async function createFontEmbedder(pdf: PDFDocument, warnings: string[]) {
	const [{ default: fontkit }, fontManifest] = await Promise.all([
		import('@cantoo/fontkit'),
		loadManifest()
	]);
	pdf.registerFontkit(fontkit);
	const embedded = new Map<string, Promise<PDFFont>>();

	return (family: string, weight: string, style: string): Promise<PDFFont> => {
		const font = resolveFont(fontManifest, family, weight, style);
		const key = font.kind === 'file' ? font.file : font.name;
		let result = embedded.get(key);
		if (!result) {
			result = (
				font.kind === 'file'
					? loadFile(font.file).then((bytes) => pdf.embedFont(bytes, { subset: true }))
					: pdf.embedFont(font.name as StandardFonts)
			).catch(() => {
				warnings.push(`The font ${family} could not be loaded, so Helvetica is used instead.`);
				return pdf.embedFont(StandardFonts.Helvetica);
			});
			embedded.set(key, result);
		}
		return result;
	};
}
