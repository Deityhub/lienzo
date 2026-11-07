// Runs in Chromium (real IndexedDB + File), see the "client" project in vite.config.ts
import { beforeEach, describe, expect, it } from 'vitest';
import { deleteDocument, getAllDocuments, getDocument, saveDocument } from '../stores/idb';
import {
	readDocumentFiles,
	readSingleDocument,
	saveImportedDocuments,
	serializeDocuments
} from './documentFile';
import { createPdf, finishPdf } from './pdfDocument';
import { sampleDoc } from './testDocument';
import { PDFDocument } from '@cantoo/pdf-lib';

const file = (name: string, content: string) =>
	new File([content], name, { type: 'application/json' });

describe('readDocumentFiles', () => {
	it('reads several files and reports the ones that fail, saving nothing', async () => {
		const result = await readDocumentFiles([
			file('good.lienzo.json', serializeDocuments([sampleDoc('a', 'One'), sampleDoc('b', 'Two')])),
			file('bad.json', 'not json'),
			file('other.json', '{"hello":"world"}')
		]);

		expect(result.documents.map((d) => d.name)).toEqual(['One', 'Two']);
		expect(result.errors).toEqual([
			'bad.json – This file is not valid JSON.',
			'other.json – This is not a Lienzo document file.'
		]);
	});

	it('keeps the valid documents of a partly broken file and reports the rest', async () => {
		const content = JSON.stringify({
			app: 'lienzo',
			formatVersion: 1,
			documents: [sampleDoc('a', 'Good'), { id: 'x', name: 'Broken' }]
		});

		const result = await readDocumentFiles([file('mixed.json', content)]);

		expect(result.documents).toHaveLength(1);
		expect(result.errors[0]).toMatch(/^mixed\.json – Document "Broken"/);
	});

	it('rejects files over the size limit', async () => {
		const big = new File([new Uint8Array(25 * 1024 * 1024 + 1)], 'big.json');
		const result = await readDocumentFiles([big]);

		expect(result.documents).toEqual([]);
		expect(result.errors[0]).toMatch(/too large/);
	});
});

async function buildPdf(json: string, title: string) {
	const pdf = await createPdf(title);
	pdf.addPage([595.28, 841.89]);
	return finishPdf(pdf, json);
}
const pdfFile = (name: string, bytes: Uint8Array) =>
	new File([new Uint8Array(bytes)], name, { type: 'application/pdf' });

describe('reading PDFs', () => {
	it('reads the document embedded in a PDF exported from Lienzo', async () => {
		const doc = sampleDoc('a', 'From PDF');
		const bytes = await buildPdf(serializeDocuments([doc]), doc.name);

		const result = await readDocumentFiles([pdfFile('from-pdf.pdf', bytes)]);

		expect(result.errors).toEqual([]);
		expect(result.documents).toEqual([doc]);
		expect(await readSingleDocument(pdfFile('from-pdf.pdf', bytes))).toEqual(doc);
	});

	it('explains that other PDFs cannot be imported', async () => {
		const other = await PDFDocument.create();
		other.addPage();

		const result = await readDocumentFiles([pdfFile('other.pdf', await other.save())]);

		expect(result.documents).toEqual([]);
		expect(result.errors).toEqual([
			'other.pdf – This PDF has no embedded Lienzo document. Only PDFs exported from Lienzo can be imported.'
		]);
	});

	it('recognises a PDF by its content, whatever the file is called', async () => {
		const doc = sampleDoc('a', 'Renamed');
		const bytes = await buildPdf(serializeDocuments([doc]), doc.name);

		const result = await readDocumentFiles([new File([new Uint8Array(bytes)], 'no-extension')]);

		expect(result.documents).toEqual([doc]);
	});

	it('reports a broken PDF', async () => {
		const result = await readDocumentFiles([
			pdfFile('broken.pdf', new TextEncoder().encode('%PDF-1.4 this is not a real pdf'))
		]);
		expect(result.errors).toEqual(['broken.pdf – This file could not be read as a PDF.']);
	});
});

describe('readSingleDocument', () => {
	it('returns the document of a single-document file', async () => {
		const doc = await readSingleDocument(
			file('one.lienzo.json', serializeDocuments([sampleDoc('a', 'Only')]))
		);
		expect(doc.name).toBe('Only');
	});

	it('rejects files with several documents', async () => {
		const content = serializeDocuments([sampleDoc('a'), sampleDoc('b')]);
		await expect(readSingleDocument(file('two.json', content))).rejects.toThrow(
			/contains 2 documents.*Documents page/
		);
	});

	it('rejects empty, invalid and unreadable files', async () => {
		await expect(readSingleDocument(file('e.json', serializeDocuments([])))).rejects.toThrow(
			/contains no documents/
		);
		await expect(readSingleDocument(file('x.json', 'nope'))).rejects.toThrow(/not valid JSON/);
		await expect(
			readSingleDocument(
				file(
					'b.json',
					JSON.stringify({ app: 'lienzo', formatVersion: 1, documents: [{ id: 'x' }] })
				)
			)
		).rejects.toThrow(/Invalid document/);
	});
});

describe('saveImportedDocuments', () => {
	beforeEach(async () => {
		for (const doc of await getAllDocuments()) await deleteDocument(doc.id);
	});

	it('adds documents with new ids as they are, keeping their ids', async () => {
		await saveImportedDocuments([sampleDoc('a', 'One'), sampleDoc('b', 'Two')], [], 'copy');

		expect((await getAllDocuments()).map((d) => d.id).sort()).toEqual(['a', 'b']);
	});

	it('replaces the existing document on conflict when asked to', async () => {
		await saveDocument(sampleDoc('a', 'Old name'));

		await saveImportedDocuments([sampleDoc('a', 'New name')], await getAllDocuments(), 'replace');

		expect(await getAllDocuments()).toHaveLength(1);
		expect((await getDocument('a'))?.name).toBe('New name');
	});

	it('keeps both on conflict when asked to copy, without touching the original', async () => {
		await saveDocument(sampleDoc('a', 'Resume'));

		await saveImportedDocuments([sampleDoc('a', 'Resume')], await getAllDocuments(), 'copy');

		const all = await getAllDocuments();
		expect(all).toHaveLength(2);
		expect(all.map((d) => d.name).sort()).toEqual(['Resume', 'Resume (imported)']);
		expect((await getDocument('a'))?.name).toBe('Resume');
	});

	it('handles the same id twice in one import', async () => {
		await saveImportedDocuments([sampleDoc('a', 'First'), sampleDoc('a', 'Second')], [], 'copy');

		expect((await getAllDocuments()).map((d) => d.name).sort()).toEqual(['First', 'Second']);
	});
});
