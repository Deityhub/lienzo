import { appStore } from '../stores/appStore.svelte.ts';
import type { DocumentData } from '../types/canvas';
import { readSingleDocument } from '../utils/documentFile';
import { uuidv4 } from '../utils/uuid';

/**
 * Importing a document file into the editor, replacing whatever is on the canvas.
 * If the canvas has content the user is asked to confirm first.
 */
export function createCanvasImport(hasContent: () => boolean) {
	let pending = $state<DocumentData | null>(null);
	let error = $state('');

	function load(document: DocumentData) {
		// New id: saving must not silently overwrite a saved document that has the same id
		appStore.setCurrentDocument({ ...document, id: uuidv4() });
		appStore.selectElement(null);
		pending = null;
	}

	return {
		/** A document waiting for the user to confirm replacing the canvas */
		get pending() {
			return pending;
		},
		get error() {
			return error;
		},
		async importFile(file: File) {
			try {
				const document = await readSingleDocument(file);
				if (hasContent()) pending = document;
				else load(document);
			} catch (e) {
				error = e instanceof Error ? e.message : 'The file could not be imported.';
			}
		},
		confirm() {
			if (pending) load(pending);
		},
		cancel() {
			pending = null;
		},
		dismissError() {
			error = '';
		}
	};
}
