import {
	PDFArray,
	PDFDict,
	PDFDocument,
	PDFHexString,
	PDFName,
	PDFRawStream,
	PDFString,
	decodePDFRawStream
} from '@cantoo/pdf-lib';

/** Name of the file attached to every PDF exported by Lienzo; it holds the editable document. */
export const ATTACHMENT_NAME = 'lienzo-document.json';

const MM_PER_INCH = 25.4;
const POINTS_PER_INCH = 72;
const mmToPoints = (mm: number) => (mm / MM_PER_INCH) * POINTS_PER_INCH;

/**
 * Build a PDF from page images and attach the document JSON, so the PDF can be
 * imported back into Lienzo with everything still editable.
 */
export async function buildPdf(
	pagePngs: Uint8Array[],
	size: { widthMm: number; heightMm: number },
	documentJson: string,
	title: string
): Promise<Uint8Array> {
	const pdf = await PDFDocument.create();
	pdf.setTitle(title);
	pdf.setCreator('Lienzo');
	pdf.setProducer(`Lienzo ${__APP_VERSION__}`);

	const width = mmToPoints(size.widthMm);
	const height = mmToPoints(size.heightMm);
	for (const png of pagePngs) {
		const page = pdf.addPage([width, height]);
		page.drawImage(await pdf.embedPng(png), { x: 0, y: 0, width, height });
	}

	await pdf.attach(new TextEncoder().encode(documentJson), ATTACHMENT_NAME, {
		mimeType: 'application/json',
		description: 'Editable Lienzo document',
		creationDate: new Date(),
		modificationDate: new Date()
	});
	return pdf.save();
}

/** The document JSON embedded in a Lienzo PDF, or null if the PDF has none. Throws if it is not a readable PDF. */
export async function extractEmbeddedDocument(bytes: Uint8Array): Promise<string | null> {
	try {
		const pdf = await PDFDocument.load(bytes, { updateMetadata: false });
		return readAttachment(pdf);
	} catch {
		// pdf-lib can "load" damaged files and then fail on missing structure
		throw new Error('This file could not be read as a PDF.');
	}
}

function readAttachment(pdf: PDFDocument): string | null {
	// Catalog -> Names -> EmbeddedFiles -> Names: [name, filespec, name, filespec, ...]
	const names = pdf.catalog.lookupMaybe(PDFName.of('Names'), PDFDict);
	const embedded = names?.lookupMaybe(PDFName.of('EmbeddedFiles'), PDFDict);
	const list = embedded?.lookupMaybe(PDFName.of('Names'), PDFArray);
	if (!list) return null;

	for (let i = 0; i + 1 < list.size(); i += 2) {
		const name = list.lookup(i, PDFString, PDFHexString).decodeText();
		if (name !== ATTACHMENT_NAME) continue;

		const spec = list.lookup(i + 1, PDFDict);
		const stream = spec.lookup(PDFName.of('EF'), PDFDict).lookup(PDFName.of('F'));
		if (!(stream instanceof PDFRawStream)) return null;
		return new TextDecoder().decode(decodePDFRawStream(stream).decode());
	}
	return null;
}
