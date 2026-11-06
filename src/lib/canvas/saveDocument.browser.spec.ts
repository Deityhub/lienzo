// Runs in Chromium (real IndexedDB), see the "client" project in vite.config.ts
import { beforeEach, describe, expect, it } from 'vitest';
import { appStore } from '../stores/appStore.svelte.ts';
import { deleteDocument, getAllDocuments, getDocument } from '../stores/idb';
import type { DocumentData } from '../types/canvas';
import { saveCurrentDocument } from './saveDocument';

describe('saveCurrentDocument', () => {
	beforeEach(async () => {
		for (const doc of await getAllDocuments()) await deleteDocument(doc.id);
		appStore.initNewDocument();
	});

	it('saves the current document under the given name and updates the editor', async () => {
		const id = appStore.getCurrentDocument().id;

		const error = await saveCurrentDocument('My Resume');

		expect(error).toBeNull();
		expect(appStore.getCurrentDocument().name).toBe('My Resume');
		const stored = await getDocument(id);
		expect(stored?.name).toBe('My Resume');
		expect(Object.keys(stored!.pages)).toEqual(Object.keys(appStore.getPages()));
	});

	it('saving again under another name renames the same document', async () => {
		await saveCurrentDocument('First');
		await saveCurrentDocument('Second');

		const all = await getAllDocuments();
		expect(all).toHaveLength(1);
		expect(all[0].name).toBe('Second');
	});

	it('returns a message instead of throwing when saving fails', async () => {
		const circular: Record<string, unknown> = {};
		circular.self = circular; // cannot be serialised
		appStore.updateCurrentDocument({ circular } as unknown as Partial<DocumentData>);

		const error = await saveCurrentDocument('Broken');

		expect(error).toMatch(/^Failed to save\. Please try again: /);
		expect(appStore.getCurrentDocument().name).toBe('');
	});
});
