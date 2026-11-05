import { describe, expect, it } from 'vitest';
import type { DocumentData } from '../types/canvas';
import { sampleDoc } from './testDocument';
import {
	asImportedCopy,
	findConflicts,
	parseDocumentFile,
	serializeDocuments
} from './documentFile';

describe('document files', () => {
	it('round-trips documents without loss', () => {
		const docs = [sampleDoc('a', 'One'), sampleDoc('b', 'Two')];
		const { documents, errors } = parseDocumentFile(serializeDocuments(docs));

		expect(errors).toEqual([]);
		expect(documents).toEqual(docs);
	});

	it('writes an identifiable envelope', () => {
		const file = JSON.parse(serializeDocuments([sampleDoc()]));
		expect(file).toMatchObject({ app: 'lienzo', formatVersion: 1 });
		expect(typeof file.exportedAt).toBe('string');
		expect(typeof file.appVersion).toBe('string');
	});

	it('rejects invalid JSON and files that are not Lienzo files', () => {
		expect(() => parseDocumentFile('{nope')).toThrow(/not valid JSON/);
		expect(() => parseDocumentFile('[]')).toThrow(/not a Lienzo document file/);
		expect(() => parseDocumentFile('{"app":"other","documents":[]}')).toThrow(/not a Lienzo/);
		expect(() => parseDocumentFile('{"app":"lienzo","documents":"x"}')).toThrow(/not a Lienzo/);
	});

	it('rejects files from a newer file format', () => {
		const file = { app: 'lienzo', formatVersion: 99, documents: [] };
		expect(() => parseDocumentFile(JSON.stringify(file))).toThrow(/newer version/);
	});

	it('migrates documents saved before schemaVersion existed', () => {
		const legacy: Partial<DocumentData> = sampleDoc();
		delete legacy.schemaVersion;
		const file = { app: 'lienzo', formatVersion: 1, documents: [legacy] };

		const { documents } = parseDocumentFile(JSON.stringify(file));
		expect(documents[0].schemaVersion).toBe(1);
	});

	it('keeps the valid documents and reports the invalid ones by name', () => {
		const file = {
			app: 'lienzo',
			formatVersion: 1,
			documents: [sampleDoc('a', 'Good'), { ...sampleDoc('b', 'Broken'), pages: 5 }, 42]
		};
		const { documents, errors } = parseDocumentFile(JSON.stringify(file));

		expect(documents.map((d) => d.name)).toEqual(['Good']);
		expect(errors).toHaveLength(2);
		expect(errors[0]).toMatch(/"Broken".*pages must be an object/);
		expect(errors[1]).toMatch(/#3/);
	});

	describe('asImportedCopy', () => {
		it('always assigns a new id and keeps the content', () => {
			const original = sampleDoc('a', 'Resume');
			const copy = asImportedCopy(original, new Set());

			expect(copy.id).not.toBe('a');
			expect(copy.name).toBe('Resume');
			expect(copy.pages).toEqual(original.pages);
		});

		it('renames when the name is taken, including earlier imports in the same batch', () => {
			const taken = new Set(['Resume']);
			const doc = sampleDoc('a', 'Resume');

			expect(asImportedCopy(doc, taken).name).toBe('Resume (imported)');
			expect(asImportedCopy(doc, taken).name).toBe('Resume (imported 2)');
			expect(asImportedCopy(doc, taken).name).toBe('Resume (imported 3)');
		});
	});

	describe('findConflicts', () => {
		it('finds documents whose id already exists', () => {
			const existing = [sampleDoc('a', 'A')];
			const incoming = [sampleDoc('a', 'A edited'), sampleDoc('b', 'B')];

			expect(findConflicts(incoming, existing).map((d) => d.name)).toEqual(['A edited']);
		});

		it('treats a repeated id within the same import as a conflict', () => {
			const incoming = [sampleDoc('a', 'First'), sampleDoc('a', 'Second')];
			expect(findConflicts(incoming, []).map((d) => d.name)).toEqual(['Second']);
		});

		it('returns nothing when there is no overlap', () => {
			expect(findConflicts([sampleDoc('b')], [sampleDoc('a')])).toEqual([]);
		});
	});
});
