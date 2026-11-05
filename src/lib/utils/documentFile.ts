import type { DocumentData } from '../types/canvas';
import { saveDocument } from '../stores/idb';
import { migrateDocument } from '../stores/migrations';
import { uuidv4 } from './uuid';

/** Version of the file envelope (not of the documents inside, which carry their own schemaVersion). */
const FORMAT_VERSION = 1;
const APP_ID = 'lienzo';
export const FILE_EXTENSION = '.lienzo.json';
const MAX_FILE_BYTES = 25 * 1024 * 1024;

export interface DocumentFile {
	app: typeof APP_ID;
	formatVersion: number;
	exportedAt: string;
	appVersion: string;
	documents: DocumentData[];
}

export interface ParsedFile {
	documents: DocumentData[];
	/** One message per document in the file that could not be read */
	errors: string[];
}

export function serializeDocuments(documents: DocumentData[]): string {
	const file: DocumentFile = {
		app: APP_ID,
		formatVersion: FORMAT_VERSION,
		exportedAt: new Date().toISOString(),
		appVersion: __APP_VERSION__,
		documents
	};
	return JSON.stringify(file, null, 2);
}

/** Parse and validate a Lienzo file. Throws for anything that is not a Lienzo file at all. */
export function parseDocumentFile(text: string): ParsedFile {
	let data: unknown;
	try {
		data = JSON.parse(text);
	} catch {
		throw new Error('This file is not valid JSON.');
	}

	const file = data as Partial<DocumentFile> | null;
	if (!file || typeof file !== 'object' || file.app !== APP_ID || !Array.isArray(file.documents)) {
		throw new Error('This is not a Lienzo document file.');
	}
	if (typeof file.formatVersion !== 'number' || file.formatVersion > FORMAT_VERSION) {
		throw new Error('This file was created with a newer version of Lienzo. Please update the app.');
	}

	const documents: DocumentData[] = [];
	const errors: string[] = [];
	file.documents.forEach((raw, index) => {
		try {
			documents.push(migrateDocument(raw));
		} catch (error) {
			const label = (raw as { name?: unknown } | null)?.name;
			const name = typeof label === 'string' && label ? `"${label}"` : `#${index + 1}`;
			errors.push(`Document ${name}: ${error instanceof Error ? error.message : 'unreadable'}`);
		}
	});
	return { documents, errors };
}

export type ConflictChoice = 'replace' | 'copy';

/** A copy of the document with a new id, and a new name if the name is already taken. */
export function asImportedCopy(document: DocumentData, takenNames: Set<string>): DocumentData {
	let name = document.name;
	if (takenNames.has(name)) {
		name = `${document.name} (imported)`;
		for (let n = 2; takenNames.has(name); n++) name = `${document.name} (imported ${n})`;
	}
	takenNames.add(name);
	return { ...document, id: uuidv4(), name };
}

/** Documents whose id already exists, or appeared earlier in the same import. */
export function findConflicts(documents: DocumentData[], existing: DocumentData[]): DocumentData[] {
	const seen = new Set(existing.map((d) => d.id));
	return documents.filter((d) => {
		const conflict = seen.has(d.id);
		seen.add(d.id);
		return conflict;
	});
}

/** Read and validate the files. Nothing is saved yet. */
export async function readDocumentFiles(files: File[]): Promise<ParsedFile> {
	const documents: DocumentData[] = [];
	const errors: string[] = [];

	for (const file of files) {
		try {
			if (file.size > MAX_FILE_BYTES) throw new Error('The file is too large (max 25 MB).');
			const parsed = parseDocumentFile(await file.text());
			documents.push(...parsed.documents);
			errors.push(...parsed.errors.map((message) => `${file.name} – ${message}`));
		} catch (error) {
			errors.push(
				`${file.name} – ${error instanceof Error ? error.message : 'could not be imported'}`
			);
		}
	}
	return { documents, errors };
}

/** Read a file that must hold exactly one document, for loading into the editor. */
export async function readSingleDocument(file: File): Promise<DocumentData> {
	const { documents, errors } = await readDocumentFiles([file]);
	const count = documents.length + errors.length;
	if (count > 1) {
		throw new Error(
			`${file.name} contains ${count} documents. Import it from the Documents page instead.`
		);
	}
	if (errors.length) throw new Error(errors[0]);
	if (!documents.length) throw new Error(`${file.name} contains no documents.`);
	return documents[0];
}

/**
 * Save the documents. New ids are added as they are; on an id conflict the existing
 * document is overwritten ('replace') or the import is kept as a separate copy ('copy').
 */
export async function saveImportedDocuments(
	documents: DocumentData[],
	existing: DocumentData[],
	onConflict: ConflictChoice
): Promise<number> {
	const knownIds = new Set(existing.map((d) => d.id));
	const takenNames = new Set(existing.map((d) => d.name));

	for (const document of documents) {
		const conflict = knownIds.has(document.id);
		const toSave =
			conflict && onConflict === 'copy' ? asImportedCopy(document, takenNames) : document;
		await saveDocument(toSave);
		knownIds.add(toSave.id);
		takenNames.add(toSave.name);
	}
	return documents.length;
}

function downloadText(filename: string, text: string) {
	const url = URL.createObjectURL(new Blob([text], { type: 'application/json' }));
	const link = document.createElement('a');
	link.href = url;
	link.download = filename;
	link.click();
	URL.revokeObjectURL(url);
}

const slug = (name: string) =>
	name
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-|-$/g, '') || 'document';

export function exportDocument(doc: DocumentData) {
	downloadText(`${slug(doc.name)}${FILE_EXTENSION}`, serializeDocuments([doc]));
}

export function exportAllDocuments(docs: DocumentData[]) {
	const date = new Date().toISOString().slice(0, 10);
	downloadText(`lienzo-documents-${date}${FILE_EXTENSION}`, serializeDocuments(docs));
}
