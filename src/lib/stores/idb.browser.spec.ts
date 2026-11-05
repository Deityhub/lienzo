// Runs in Chromium (real IndexedDB), see the "client" project in vite.config.ts
import { beforeEach, describe, expect, it } from 'vitest';
import type { DocumentData } from '../types/canvas';
import {
	deleteDocument,
	getAllDocuments,
	getDocument,
	asStorageError,
	isIndexedDBSupported,
	saveDocument,
	StorageQuotaError
} from './idb';
import { CURRENT_SCHEMA_VERSION } from './migrations';

const makeDoc = (id: string, name = id): DocumentData => ({
	id,
	schemaVersion: 1,
	name,
	pages: {
		p1: {
			id: 'p1',
			elements: {
				e1: {
					id: 'e1',
					type: 'text',
					pageId: 'p1',
					zIndex: 0,
					x: 10,
					y: 20,
					width: 100,
					height: 30,
					text: 'Hello',
					fontFamily: 'Inter',
					fontSize: 16,
					fontWeight: '400',
					fontStyle: 'normal',
					color: '#000000'
				}
			},
			boundaries: { horizontal: { start: 0, end: 100 }, vertical: { start: 0, end: 100 } }
		}
	},
	createdAt: 1,
	updatedAt: 1
});

// Write a record straight into the store, bypassing saveDocument (simulates old or foreign data)
function putRaw(record: unknown): Promise<void> {
	return new Promise((resolve, reject) => {
		const open = indexedDB.open('lienzo-db', 1);
		open.onsuccess = () => {
			const db = open.result;
			const tx = db.transaction('documents', 'readwrite');
			tx.objectStore('documents').put(record);
			tx.oncomplete = () => (db.close(), resolve());
			tx.onerror = () => reject(tx.error);
		};
		open.onerror = () => reject(open.error);
	});
}

async function clearAll() {
	for (const doc of await getAllDocuments()) await deleteDocument(doc.id);
}

describe('idb', () => {
	beforeEach(clearAll);

	it('reports IndexedDB support', () => {
		expect(isIndexedDBSupported()).toBe(true);
	});

	it('saves and reads back a document, including nested elements', async () => {
		await saveDocument(makeDoc('a', 'Resume'));

		const doc = await getDocument('a');
		expect(doc?.name).toBe('Resume');
		expect(doc?.pages.p1.elements.e1).toMatchObject({ type: 'text', text: 'Hello', x: 10 });
	});

	it('returns undefined for a missing document', async () => {
		expect(await getDocument('missing')).toBeUndefined();
	});

	it('sets updatedAt on every save and keeps createdAt', async () => {
		const before = Date.now();
		await saveDocument(makeDoc('a'));

		const doc = await getDocument('a');
		expect(doc?.updatedAt).toBeGreaterThanOrEqual(before);
		expect(doc?.createdAt).toBe(1);
	});

	it('overwrites an existing document with the same id', async () => {
		await saveDocument(makeDoc('a', 'First'));
		await saveDocument(makeDoc('a', 'Second'));

		expect(await getAllDocuments()).toHaveLength(1);
		expect((await getDocument('a'))?.name).toBe('Second');
	});

	it('lists all documents', async () => {
		await saveDocument(makeDoc('a'));
		await saveDocument(makeDoc('b'));

		const ids = (await getAllDocuments()).map((d) => d.id).sort();
		expect(ids).toEqual(['a', 'b']);
	});

	it('deletes a document and ignores unknown ids', async () => {
		await saveDocument(makeDoc('a'));
		await saveDocument(makeDoc('b'));

		await deleteDocument('a');
		await deleteDocument('does-not-exist');

		expect((await getAllDocuments()).map((d) => d.id)).toEqual(['b']);
	});

	it('strips non-serializable values instead of failing', async () => {
		const doc = makeDoc('a') as DocumentData & { extra?: unknown };
		doc.extra = { fn: () => 1, undef: undefined };

		await saveDocument(doc);

		const saved = (await getDocument('a')) as typeof doc;
		expect(saved.extra).toEqual({});
	});

	describe('schema versioning', () => {
		it('stamps the current schemaVersion on save', async () => {
			await saveDocument({ ...makeDoc('a'), schemaVersion: 0 });
			expect((await getDocument('a'))?.schemaVersion).toBe(CURRENT_SCHEMA_VERSION);
		});

		it('reads documents saved before versioning (no schemaVersion)', async () => {
			const legacy: Partial<DocumentData> = makeDoc('old');
			delete legacy.schemaVersion;
			await putRaw(legacy);

			const doc = await getDocument('old');
			expect(doc?.schemaVersion).toBe(CURRENT_SCHEMA_VERSION);
			expect(doc?.name).toBe('old');
		});

		it('skips unreadable records in the list instead of failing it', async () => {
			await saveDocument(makeDoc('good'));
			await putRaw({ id: 'broken', name: 5 });
			await putRaw({ ...makeDoc('future'), schemaVersion: CURRENT_SCHEMA_VERSION + 1 });

			expect((await getAllDocuments()).map((d) => d.id)).toEqual(['good']);
		});

		it('rejects when a single requested record is invalid', async () => {
			await putRaw({ id: 'broken', name: 5 });
			await expect(getDocument('broken')).rejects.toThrow(/Invalid document/);
		});
	});

	describe('connection handling', () => {
		it('releases the connection when another tab upgrades the database', async () => {
			await saveDocument(makeDoc('a'));

			// Would stay blocked forever if our connection ignored versionchange
			const upgraded = await new Promise<IDBDatabase>((resolve, reject) => {
				const req = indexedDB.open('lienzo-db', 2);
				req.onupgradeneeded = () => {};
				req.onblocked = () => reject(new Error('upgrade was blocked'));
				req.onsuccess = () => resolve(req.result);
				req.onerror = () => reject(req.error);
			});
			upgraded.close();
			await new Promise<void>((resolve) => {
				const del = indexedDB.deleteDatabase('lienzo-db');
				del.onsuccess = () => resolve();
			});

			// The next call reopens a fresh connection
			await saveDocument(makeDoc('b'));
			expect((await getAllDocuments()).map((d) => d.id)).toEqual(['b']);
		});

		it('maps quota errors to a friendly error and passes others through', () => {
			const quota = asStorageError(new DOMException('full', 'QuotaExceededError'));
			expect(quota).toBeInstanceOf(StorageQuotaError);

			const other = new Error('boom');
			expect(asStorageError(other)).toBe(other);
		});
	});
});
