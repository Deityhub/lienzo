import { beforeEach, describe, expect, it } from 'vitest';
import { appStore } from './appStore.svelte.ts';
import { deleteDocument, getDocument, saveDocument } from './idb';

let pageId: string;
const ids = () => appStore.getSelectedElements().map((el) => el.id);

/** Add three shapes; returns their ids. The last one added is selected. */
function addThree() {
	return [100, 400, 700].map((x) => {
		appStore.addElement({ type: 'shape', x, y: 100, pageId, width: 100, height: 100 });
		return appStore.getSelectedElement()!.id;
	});
}

beforeEach(() => {
	appStore.initNewDocument();
	pageId = Object.keys(appStore.getPages())[0];
});

describe('selection', () => {
	it('selects several elements, and getSelectedElement is only for exactly one', () => {
		const [a, b, c] = addThree();

		appStore.selectElements(pageId, [a, b]);
		expect(ids()).toEqual([a, b]);
		expect(appStore.getSelectedElement()).toBeNull();
		expect(appStore.isSelected(a)).toBe(true);
		expect(appStore.isSelected(c)).toBe(false);

		appStore.selectElements(pageId, [c]);
		expect(appStore.getSelectedElement()?.id).toBe(c);
	});

	it('toggles an element in and out of the selection', () => {
		const [a, b] = addThree();
		appStore.selectElement(appStore.findElement(pageId, a));

		appStore.toggleSelected(appStore.findElement(pageId, b)!);
		expect(ids()).toEqual([a, b]);

		appStore.toggleSelected(appStore.findElement(pageId, a)!);
		expect(ids()).toEqual([b]);
	});

	it('selecting on another page starts a new selection', () => {
		const [a] = addThree();
		appStore.selectElements(pageId, [a]);
		appStore.addPage();
		const otherPage = Object.keys(appStore.getPages()).find((id) => id !== pageId)!;
		appStore.addElement({ type: 'shape', x: 100, y: 100, pageId: otherPage });
		const other = appStore.getSelectedElement()!;

		appStore.selectElements(pageId, [a]);
		appStore.toggleSelected(other);

		expect(ids()).toEqual([other.id]);
	});

	it('reflects changes to a selected element without being re-selected', () => {
		const [a] = addThree();
		appStore.selectElements(pageId, [a]);

		appStore.updateElement({ elementId: a, updates: { x: 555 }, pageId });

		expect(appStore.getSelectedElement()?.x).toBe(555);
	});

	it('is cleared when another document is opened and when the page is deleted', () => {
		const [a] = addThree();
		appStore.selectElements(pageId, [a]);
		appStore.setCurrentDocument({ ...appStore.getCurrentDocument() });
		expect(ids()).toEqual([]);

		appStore.selectElements(pageId, [a]);
		appStore.addPage();
		appStore.deletePage(pageId);
		expect(ids()).toEqual([]);
	});
});

describe('changing several elements at once', () => {
	it('deletes them in one change and keeps the rest selected', () => {
		const [a, b, c] = addThree();
		appStore.selectElements(pageId, [a, b, c]);
		const before = appStore.getRevision();

		appStore.deleteElements([a, b], pageId);

		expect(Object.keys(appStore.getPages()[pageId].elements)).toEqual([c]);
		expect(ids()).toEqual([c]);
		expect(appStore.getRevision()).toBe(before + 1);
	});

	it('moves them in one change', () => {
		const [a, b, c] = addThree();
		const before = appStore.getRevision();

		appStore.moveElements(pageId, {
			[a]: { x: 1, y: 2 },
			[b]: { x: 3, y: 4 },
			missing: { x: 9, y: 9 }
		});

		expect(appStore.findElement(pageId, a)).toMatchObject({ x: 1, y: 2 });
		expect(appStore.findElement(pageId, b)).toMatchObject({ x: 3, y: 4 });
		expect(appStore.findElement(pageId, c)).toMatchObject({ x: 700, y: 100 });
		expect(appStore.getRevision()).toBe(before + 1);
	});
});

describe('multi-select mode', () => {
	it('is off by default and can be switched', () => {
		expect(appStore.getMultiSelectMode()).toBe(false);
		appStore.setMultiSelectMode(true);
		expect(appStore.getMultiSelectMode()).toBe(true);
		appStore.setMultiSelectMode(false);
	});
});

describe('groups', () => {
	it('groups the selected elements and selects the whole group from any member', () => {
		const [a, b, c] = addThree();
		appStore.selectElements(pageId, [a, b]);

		appStore.groupSelected();
		const groupId = appStore.findElement(pageId, a)!.groupId;
		expect(groupId).toBeTruthy();
		expect(appStore.findElement(pageId, b)!.groupId).toBe(groupId);
		expect(appStore.findElement(pageId, c)!.groupId).toBeUndefined();

		appStore.selectElement(appStore.findElement(pageId, b));
		expect(ids().sort()).toEqual([a, b].sort());

		appStore.selectElements(pageId, [a]); // what a selection box does
		expect(ids().sort()).toEqual([a, b].sort());
	});

	it('toggling a member adds or removes the whole group', () => {
		const [a, b, c] = addThree();
		appStore.selectElements(pageId, [a, b]);
		appStore.groupSelected();
		appStore.selectElement(appStore.findElement(pageId, c));

		appStore.toggleSelected(appStore.findElement(pageId, a)!);
		expect(ids().sort()).toEqual([a, b, c].sort());

		appStore.toggleSelected(appStore.findElement(pageId, b)!);
		expect(ids()).toEqual([c]);
	});

	it('needs at least two elements to group', () => {
		const [a] = addThree();
		appStore.selectElements(pageId, [a]);
		const before = appStore.getRevision();

		appStore.groupSelected();

		expect(appStore.getRevision()).toBe(before);
		expect(appStore.findElement(pageId, a)!.groupId).toBeUndefined();
	});

	it('ungroups, keeping the elements selected', () => {
		const [a, b] = addThree();
		appStore.selectElements(pageId, [a, b]);
		appStore.groupSelected();

		appStore.ungroupSelected();

		expect(appStore.findElement(pageId, a)).not.toHaveProperty('groupId');
		expect(appStore.findElement(pageId, b)).not.toHaveProperty('groupId');
		expect(ids().sort()).toEqual([a, b].sort());
		appStore.selectElement(appStore.findElement(pageId, a));
		expect(ids()).toEqual([a]); // no longer pulls b in
	});

	it('merges groups when grouping a selection that contains one', () => {
		const [a, b, c] = addThree();
		appStore.selectElements(pageId, [a, b]);
		appStore.groupSelected();
		appStore.selectElements(pageId, [a, c]); // a brings b along

		appStore.groupSelected();

		const groupIds = [a, b, c].map((id) => appStore.findElement(pageId, id)!.groupId);
		expect(new Set(groupIds).size).toBe(1);
		expect(groupIds[0]).toBeTruthy();
	});

	it('a group left with one element is dissolved', () => {
		const [a, b, c] = addThree();
		appStore.selectElements(pageId, [a, b, c]);
		appStore.groupSelected();

		appStore.deleteElements([a, b], pageId);
		expect(appStore.findElement(pageId, c)).not.toHaveProperty('groupId');

		appStore.selectElements(pageId, [c]);
		appStore.addElement({ type: 'shape', x: 100, y: 400, pageId });
		const d = appStore.getSelectedElement()!.id;
		appStore.selectElements(pageId, [c, d]);
		appStore.groupSelected();
		appStore.deleteElement(d, pageId);
		expect(appStore.findElement(pageId, c)).not.toHaveProperty('groupId');
	});

	it('survives saving and loading', async () => {
		const [a, b] = addThree();
		appStore.selectElements(pageId, [a, b]);
		appStore.groupSelected();
		const doc = { ...appStore.getCurrentDocument(), name: 'Grouped' };

		await saveDocument(doc);
		const stored = await getDocument(doc.id);
		await deleteDocument(doc.id);

		expect(stored!.pages[pageId].elements[a].groupId).toBe(
			appStore.findElement(pageId, a)!.groupId
		);
	});
});
