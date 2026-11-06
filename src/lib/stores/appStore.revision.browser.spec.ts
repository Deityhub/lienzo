import { beforeEach, describe, expect, it } from 'vitest';
import { appStore } from './appStore.svelte.ts';

describe('appStore revision', () => {
	beforeEach(() => appStore.initNewDocument());

	const firstPageId = () => Object.keys(appStore.getPages())[0];

	it('changes when pages or elements change', () => {
		const before = appStore.getRevision();
		appStore.addElement({ type: 'text', x: 0, y: 0, pageId: firstPageId() });
		const afterAdd = appStore.getRevision();
		appStore.addPage();

		expect(afterAdd).toBeGreaterThan(before);
		expect(appStore.getRevision()).toBeGreaterThan(afterAdd);
	});

	it('counts deleting a page', () => {
		appStore.addPage();
		const before = appStore.getRevision();
		appStore.deletePage(firstPageId());

		expect(appStore.getRevision()).toBeGreaterThan(before);
		expect(Object.keys(appStore.getPages())).toHaveLength(1);
	});

	it('does not change when a document is opened, started or renamed', () => {
		const before = appStore.getRevision();
		appStore.setCurrentDocument({ ...appStore.getCurrentDocument(), id: 'other' });
		appStore.updateCurrentDocument({ name: 'Renamed' });
		appStore.initNewDocument();

		expect(appStore.getRevision()).toBe(before);
	});
});
