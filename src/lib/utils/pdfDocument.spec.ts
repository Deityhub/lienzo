import { PDFDocument } from '@cantoo/pdf-lib';
import { describe, expect, it } from 'vitest';
import { parseDocumentFile, serializeDocuments } from './documentFile';
import { createPdf, extractEmbeddedDocument, finishPdf } from './pdfDocument';
import { sampleDoc } from './testDocument';

async function buildPdf(json: string, title = 'Doc') {
	const pdf = await createPdf(title);
	pdf.addPage([595.28, 841.89]);
	return finishPdf(pdf, json);
}

describe('pdfDocument', () => {
	it('sets title and producer', async () => {
		const pdf = await PDFDocument.load(await buildPdf('{}', 'My Resume'), {
			updateMetadata: false
		});
		expect(pdf.getTitle()).toBe('My Resume');
		expect(pdf.getProducer()).toMatch(/^Lienzo /);
	});

	it('embeds the document so it can be read back unchanged', async () => {
		const doc = sampleDoc('a', 'Résumé – ünïcode');
		const json = serializeDocuments([doc]);

		const bytes = await buildPdf(json, doc.name);
		const text = await extractEmbeddedDocument(bytes);

		expect(text).toBe(json);
		expect(parseDocumentFile(text!).documents).toEqual([doc]);
	});

	it('returns null for a PDF without an embedded document', async () => {
		const plain = await PDFDocument.create();
		plain.addPage();
		expect(await extractEmbeddedDocument(await plain.save())).toBeNull();
	});

	it('ignores other attachments', async () => {
		const pdf = await PDFDocument.create();
		pdf.addPage();
		await pdf.attach(new TextEncoder().encode('hello'), 'notes.txt', { mimeType: 'text/plain' });
		expect(await extractEmbeddedDocument(await pdf.save())).toBeNull();
	});

	it('throws a friendly error for files that are not PDFs', async () => {
		await expect(extractEmbeddedDocument(new TextEncoder().encode('hello'))).rejects.toThrow(
			'This file could not be read as a PDF.'
		);
	});
});
