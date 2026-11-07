// Runs in Chromium (File and IndexedDB), see the "client" project in vite.config.ts
import { beforeEach, describe, expect, it } from 'vitest';
import { appStore } from '../stores/appStore.svelte.ts';
import { serializeDocuments } from '../utils/documentFile';
import { sampleDoc } from '../utils/testDocument';
import { createCanvasImport } from './canvasImport.svelte';

const file = (name: string, content: string) =>
	new File([content], name, { type: 'application/json' });
const docFile = (name = 'Imported') =>
	file('doc.lienzo.json', serializeDocuments([sampleDoc('src-id', name)]));

describe('createCanvasImport', () => {
	beforeEach(() => {
		appStore.initNewDocument();
	});

	it('replaces an empty canvas right away, as a new document', async () => {
		const importer = createCanvasImport(() => false);

		await importer.importFile(docFile('Fresh'));

		expect(importer.pending).toBeNull();
		expect(importer.error).toBe('');
		expect(appStore.getCurrentDocument().name).toBe('Fresh');
		expect(appStore.getCurrentDocument().id).not.toBe('src-id');
		expect(appStore.getSelectedElement()).toBeNull();
	});

	it('asks before replacing a canvas that has content, and only replaces on confirm', async () => {
		const before = appStore.getCurrentDocument().id;
		const importer = createCanvasImport(() => true);

		await importer.importFile(docFile('Asked'));
		expect(importer.pending?.name).toBe('Asked');
		expect(appStore.getCurrentDocument().id).toBe(before);

		importer.confirm();
		expect(importer.pending).toBeNull();
		expect(appStore.getCurrentDocument().name).toBe('Asked');
	});

	it('cancelling keeps the canvas as it is', async () => {
		const before = appStore.getCurrentDocument().id;
		const importer = createCanvasImport(() => true);

		await importer.importFile(docFile());
		importer.cancel();

		expect(importer.pending).toBeNull();
		expect(appStore.getCurrentDocument().id).toBe(before);
	});

	it('reports unreadable files and can dismiss the message', async () => {
		const before = appStore.getCurrentDocument().id;
		const importer = createCanvasImport(() => false);

		await importer.importFile(file('bad.json', 'nope'));
		expect(importer.error).toMatch(/not valid JSON/);
		expect(appStore.getCurrentDocument().id).toBe(before);

		importer.dismissError();
		expect(importer.error).toBe('');
	});

	it('asks the canvas state at import time, not at creation time', async () => {
		let hasContent = false;
		const importer = createCanvasImport(() => hasContent);

		hasContent = true;
		await importer.importFile(docFile());

		expect(importer.pending).not.toBeNull();
	});
});
