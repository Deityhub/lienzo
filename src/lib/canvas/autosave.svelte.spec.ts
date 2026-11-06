import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createAutosave, UNTITLED_NAME } from './autosave.svelte';

function setup(name = '', minSavingTime = 0) {
	let revision = 0;
	let currentName = name;
	const save = vi.fn<(name: string) => Promise<string | null>>(async () => null);
	const autosave = createAutosave({
		getRevision: () => revision,
		getName: () => currentName,
		save,
		delay: 1000,
		minSavingTime
	});
	/** Open a document, then edit it `edits` times */
	const edit = (documentId = 'a') => autosave.changed(documentId, ++revision);
	autosave.changed('a', revision); // the document opened
	return { autosave, save, edit, setName: (n: string) => (currentName = n) };
}

describe('createAutosave', () => {
	beforeEach(() => vi.useFakeTimers());
	afterEach(() => vi.useRealTimers());

	it('does not save a document that was only opened', async () => {
		const { save } = setup();
		await vi.advanceTimersByTimeAsync(5000);
		expect(save).not.toHaveBeenCalled();
	});

	it('saves an unnamed document as Untitled on its first edit', async () => {
		const { save, edit, autosave } = setup();
		edit();
		expect(autosave.hasUnsaved).toBe(true);

		await vi.advanceTimersByTimeAsync(1000);

		expect(save).toHaveBeenCalledExactlyOnceWith(UNTITLED_NAME);
		expect(autosave.status).toBe('saved');
		expect(autosave.hasUnsaved).toBe(false);
	});

	it('keeps the name of a named document', async () => {
		const { save, edit } = setup('My Resume');
		edit();
		await vi.advanceTimersByTimeAsync(1000);
		expect(save).toHaveBeenCalledWith('My Resume');
	});

	it('waits for edits to stop, saving once', async () => {
		const { save, edit } = setup('Doc');
		edit();
		await vi.advanceTimersByTimeAsync(600);
		edit();
		await vi.advanceTimersByTimeAsync(600);
		expect(save).not.toHaveBeenCalled();

		await vi.advanceTimersByTimeAsync(400);
		expect(save).toHaveBeenCalledTimes(1);
	});

	it('saves edits made during a save right after it, never at the same time', async () => {
		const { save, edit, autosave } = setup('Doc');
		let release!: () => void;
		save.mockImplementationOnce(() => new Promise((resolve) => (release = () => resolve(null))));

		edit();
		await vi.advanceTimersByTimeAsync(1000); // first save starts and is still running
		edit();
		await vi.advanceTimersByTimeAsync(2000);
		expect(save).toHaveBeenCalledTimes(1);

		release();
		await vi.advanceTimersByTimeAsync(1000);
		expect(save).toHaveBeenCalledTimes(2);
		expect(autosave.status).toBe('saved');
	});

	it('reports a failure, keeps the changes unsaved and can retry', async () => {
		const { save, edit, autosave } = setup('Doc');
		save.mockResolvedValueOnce('Storage is full');

		edit();
		await vi.advanceTimersByTimeAsync(1000);
		expect(autosave.status).toBe('error');
		expect(autosave.error).toBe('Storage is full');
		expect(autosave.hasUnsaved).toBe(true);

		await autosave.retry();
		expect(autosave.status).toBe('saved');
		expect(autosave.error).toBe('');
		expect(autosave.hasUnsaved).toBe(false);
	});

	it('starts over when another document is opened', async () => {
		const { save, edit, autosave } = setup('Doc');
		edit();
		autosave.changed('b', 0); // another document, with its own revision
		await vi.advanceTimersByTimeAsync(5000);

		expect(save).not.toHaveBeenCalled();
		expect(autosave.status).toBe('idle');
	});

	it('flush saves right away and waits for it', async () => {
		const { save, edit, autosave } = setup('Doc');
		edit();
		await autosave.flush();
		expect(save).toHaveBeenCalledTimes(1);

		await autosave.flush(); // nothing new
		expect(save).toHaveBeenCalledTimes(1);
	});

	it('does not save again after the document was saved another way', async () => {
		const { save, edit, autosave } = setup('Doc');
		edit();
		autosave.markSaved();
		await vi.advanceTimersByTimeAsync(5000);
		expect(save).not.toHaveBeenCalled();
		expect(autosave.status).toBe('saved');
	});

	it('shows "saving" for a moment even when the save is instant', async () => {
		const { save, edit, autosave } = setup('Doc', 800);
		edit();
		await vi.advanceTimersByTimeAsync(1000); // the save starts and finishes at once
		expect(save).toHaveBeenCalledTimes(1);
		expect(autosave.status).toBe('saving');
		expect(autosave.hasUnsaved).toBe(false); // it is already safe, only the label waits

		await vi.advanceTimersByTimeAsync(800);
		expect(autosave.status).toBe('saved');
	});

	it('does not save twice when it is told about the revision it is already saving', async () => {
		const { save, edit, autosave } = setup('Doc');
		let release!: () => void;
		save.mockImplementationOnce(() => new Promise((resolve) => (release = () => resolve(null))));

		edit();
		await vi.advanceTimersByTimeAsync(1000); // saving
		autosave.changed('a', 1); // e.g. the save renamed the document in the editor
		release();
		await vi.advanceTimersByTimeAsync(5000);

		expect(save).toHaveBeenCalledTimes(1);
		expect(autosave.hasUnsaved).toBe(false);
	});
});
