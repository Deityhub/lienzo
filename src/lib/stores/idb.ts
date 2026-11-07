// Minimal IndexedDB wrapper for storing documents
import type { DocumentData } from '../types/canvas';
import { CURRENT_SCHEMA_VERSION, migrateDocument } from './migrations';

export type DocumentRecord = DocumentData;

const DB_NAME = 'lienzo-db';
const STORE_NAME = 'documents';
const DB_VERSION = 1;

export class StorageQuotaError extends Error {
	constructor() {
		super('Not enough browser storage to save this document. Free up space and try again.');
		this.name = 'StorageQuotaError';
	}
}

export const asStorageError = (error: unknown) =>
	error instanceof DOMException && error.name === 'QuotaExceededError'
		? new StorageQuotaError()
		: error;

export function isIndexedDBSupported(): boolean {
	// Check for IndexedDB support
	if (!window?.indexedDB) {
		return false;
	}

	// Check for required features
	try {
		return !!(
			window.indexedDB &&
			window.IDBTransaction &&
			window.IDBKeyRange &&
			window.IDBObjectStore
		);
	} catch {
		return false;
	}
}

// One shared connection. It is dropped when another tab upgrades the database
// (versionchange) or the browser closes it, so the next call reopens it.
let dbPromise: Promise<IDBDatabase> | null = null;

function openDB(): Promise<IDBDatabase> {
	dbPromise ??= new Promise<IDBDatabase>((resolve, reject) => {
		if (!isIndexedDBSupported()) {
			reject(new Error('IndexedDB not supported in this browser'));
			return;
		}

		const req = window.indexedDB.open(DB_NAME, DB_VERSION);
		req.onupgradeneeded = () => {
			const db = req.result;
			if (!db.objectStoreNames.contains(STORE_NAME)) {
				db.createObjectStore(STORE_NAME, { keyPath: 'id' });
			}
		};
		req.onblocked = () =>
			reject(
				new Error('Storage upgrade is blocked by another open Lienzo tab. Close it and retry.')
			);
		req.onsuccess = () => {
			const db = req.result;
			const reset = () => {
				db.close();
				dbPromise = null;
			};
			db.onversionchange = reset;
			db.onclose = () => (dbPromise = null);
			resolve(db);
		};
		req.onerror = () => reject(req.error);
	}).catch((error) => {
		dbPromise = null;
		throw error;
	});
	return dbPromise;
}

// Clean the document data to ensure it can be stored in IndexedDB
function cleanDocumentData(record: DocumentData): DocumentData {
	return JSON.parse(JSON.stringify(record));
}

export async function saveDocument(record: DocumentData): Promise<void> {
	const db = await openDB();

	return new Promise((resolve, reject) => {
		const tx = db.transaction(STORE_NAME, 'readwrite');

		tx.oncomplete = () => {
			resolve();
		};

		tx.onerror = () => {
			reject(asStorageError(tx.error) || new Error('Unknown transaction error'));
		};

		tx.onabort = () => {
			reject(asStorageError(tx.error) || new Error('Transaction was aborted'));
		};

		try {
			const store = tx.objectStore(STORE_NAME);
			// Clean the data and add updatedAt
			const cleanData = {
				...cleanDocumentData(record),
				schemaVersion: CURRENT_SCHEMA_VERSION,
				updatedAt: Date.now()
			};
			const request = store.put(cleanData);

			request.onsuccess = () => {
				resolve();
			};

			request.onerror = () => {
				reject(asStorageError(request.error) || new Error('Unknown store error'));
			};
		} catch (error) {
			console.error('Error in transaction:', error);
			reject(asStorageError(error));
		}
	});
}

export async function getAllDocuments(): Promise<DocumentData[]> {
	const db = await openDB();

	return new Promise((resolve, reject) => {
		const store = db.transaction(STORE_NAME).objectStore(STORE_NAME);
		const req = store.getAll();
		req.onsuccess = () => {
			// A record that is invalid or from a newer app version must not hide the other documents
			const documents: DocumentData[] = [];
			for (const raw of req.result) {
				try {
					documents.push(migrateDocument(raw));
				} catch (error) {
					console.warn('Skipping unreadable document:', error);
				}
			}
			resolve(documents);
		};
		req.onerror = () => reject(req.error);
	});
}

export async function getDocument(id: string): Promise<DocumentData | undefined> {
	const db = await openDB();

	return new Promise((resolve, reject) => {
		const store = db.transaction(STORE_NAME).objectStore(STORE_NAME);
		const req = store.get(id);
		req.onsuccess = () => {
			try {
				resolve(req.result === undefined ? undefined : migrateDocument(req.result));
			} catch (error) {
				reject(error);
			}
		};
		req.onerror = () => reject(req.error);
	});
}

export async function deleteDocument(id: string): Promise<void> {
	const db = await openDB();

	return new Promise((resolve, reject) => {
		const tx = db.transaction(STORE_NAME, 'readwrite');
		tx.objectStore(STORE_NAME).delete(id);
		tx.oncomplete = () => resolve();
		tx.onerror = () => reject(tx.error);
	});
}
