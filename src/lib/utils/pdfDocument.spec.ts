import { PDFDocument } from '@cantoo/pdf-lib';
import { describe, expect, it } from 'vitest';
import { parseDocumentFile, serializeDocuments } from './documentFile';
import { buildPdf, extractEmbeddedDocument } from './pdfDocument';
import { sampleDoc } from './testDocument';

// 1x1 transparent PNG
const PNG = Uint8Array.from(
	atob(
		'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=='
	),
	(c) => c.charCodeAt(0)
);
const A4 = { widthMm: 210, heightMm: 297 };

describe('pdfDocument', () => {
	it('builds one A4 page per image, with title and producer', async () => {
		const bytes = await buildPdf([PNG, PNG], A4, '{}', 'My Resume');

		const pdf = await PDFDocument.load(bytes, { updateMetadata: false });
		expect(pdf.getPageCount()).toBe(2);
		const { width, height } = pdf.getPage(0).getSize();
		expect(width).toBeCloseTo(595.28, 1);
		expect(height).toBeCloseTo(841.89, 1);
		expect(pdf.getTitle()).toBe('My Resume');
		expect(pdf.getProducer()).toMatch(/^Lienzo /);
	});

	it('embeds the document so it can be read back unchanged', async () => {
		const doc = sampleDoc('a', 'Résumé – ünïcode');
		const json = serializeDocuments([doc]);

		const bytes = await buildPdf([PNG], A4, json, doc.name);
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
