import { describe, expect, it } from 'vitest';
import {
	CURRENT_SCHEMA_VERSION,
	InvalidDocumentError,
	UnsupportedVersionError,
	migrateDocument,
	validateDocument
} from './migrations';

const validDoc = () => ({
	id: 'd1',
	name: 'Doc',
	createdAt: 1,
	updatedAt: 2,
	pages: {
		p1: {
			id: 'p1',
			boundaries: { horizontal: { start: 0, end: 10 }, vertical: { start: 0, end: 10 } },
			elements: {
				t: {
					id: 't',
					type: 'text',
					pageId: 'p1',
					zIndex: 0,
					x: 1,
					y: 2,
					width: 3,
					height: 4,
					text: 'Hi'
				},
				s: {
					id: 's',
					type: 'shape',
					pageId: 'p1',
					zIndex: 1,
					x: 1,
					y: 2,
					width: 3,
					height: 4,
					shapeType: 'circle'
				},
				i: {
					id: 'i',
					type: 'image',
					pageId: 'p1',
					zIndex: 2,
					x: 1,
					y: 2,
					width: 3,
					height: 4,
					src: 'a.png'
				}
			}
		}
	}
});

describe('validateDocument', () => {
	it('accepts a valid document', () => {
		expect(() => validateDocument(validDoc())).not.toThrow();
	});

	it.each([
		['not an object', null, /document must be an object/],
		['missing id', { ...validDoc(), id: '' }, /id must be a non-empty string/],
		['bad createdAt', { ...validDoc(), createdAt: 'x' }, /createdAt must be a number/],
		['pages array', { ...validDoc(), pages: [] }, /pages must be an object/]
	])('rejects %s', (_name, doc, message) => {
		expect(() => validateDocument(doc)).toThrow(message);
		expect(() => validateDocument(doc)).toThrow(InvalidDocumentError);
	});

	it('reports the path of an invalid element', () => {
		const doc = validDoc();
		(doc.pages.p1.elements.t as Record<string, unknown>).x = 'left';
		expect(() => validateDocument(doc)).toThrow(/pages\.p1\.elements\.t\.x must be a number/);
	});

	it('rejects unknown element types and missing type-specific fields', () => {
		const unknownType = validDoc();
		(unknownType.pages.p1.elements.t as Record<string, unknown>).type = 'video';
		expect(() => validateDocument(unknownType)).toThrow(/type must be/);

		const noSrc = validDoc();
		delete (noSrc.pages.p1.elements.i as Record<string, unknown>).src;
		expect(() => validateDocument(noSrc)).toThrow(/src must be a string/);
	});
});

describe('migrateDocument', () => {
	it('treats documents without schemaVersion as v1 and stamps the current version', () => {
		const doc = migrateDocument(validDoc());
		expect(doc.schemaVersion).toBe(CURRENT_SCHEMA_VERSION);
	});

	it('rejects documents from a newer app version', () => {
		expect(() =>
			migrateDocument({ ...validDoc(), schemaVersion: CURRENT_SCHEMA_VERSION + 1 })
		).toThrow(UnsupportedVersionError);
	});

	it.each([0, -1, 1.5, 'x'])('rejects invalid schemaVersion %s', (schemaVersion) => {
		expect(() => migrateDocument({ ...validDoc(), schemaVersion })).toThrow(InvalidDocumentError);
	});

	it('runs migrations in order, one version at a time', () => {
		const calls: number[] = [];
		const migrations = {
			1: (d: Record<string, unknown>) => (calls.push(1), { ...d, tags: [] }),
			2: (d: Record<string, unknown>) => (calls.push(2), { ...d, tags: ['a'] })
		};
		const doc = migrateDocument({ ...validDoc(), schemaVersion: 1 }, 3, migrations) as unknown as {
			schemaVersion: number;
			tags: string[];
		};
		expect(calls).toEqual([1, 2]);
		expect(doc.tags).toEqual(['a']);
		expect(doc.schemaVersion).toBe(3);
	});

	it('fails when a migration step is missing', () => {
		expect(() => migrateDocument(validDoc(), 2, {})).toThrow(/No migration from schema v1/);
	});

	it('does not mutate the input', () => {
		const raw = validDoc();
		migrateDocument(raw);
		expect('schemaVersion' in raw).toBe(false);
	});
});
