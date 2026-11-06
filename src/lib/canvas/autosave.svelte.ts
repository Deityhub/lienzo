export type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

export const UNTITLED_NAME = 'Untitled document';

interface Options {
	/** Changes whenever the document has something new to save */
	getRevision: () => number;
	/** The document's name; empty until it is first saved */
	getName: () => string;
	/** Save under a name. Returns an error message, or null on success. */
	save: (name: string) => Promise<string | null>;
	/** Wait this long after the last change before saving */
	delay?: number;
	/** Keep showing "saving" at least this long, so a very fast save is still noticeable */
	minSavingTime?: number;
}

/**
 * Saves the document shortly after it changes. A document that was never named is saved as
 * "Untitled document" on its first edit. Writes never overlap: edits made during a save
 * are saved right after it.
 */
export function createAutosave(options: Options) {
	const delay = options.delay ?? 1500;
	const minSavingTime = options.minSavingTime ?? 800;

	let status = $state<SaveStatus>('idle');
	let error = $state('');
	let savedAt = $state<number | null>(null);

	let trackedId: string | null = null;
	let savedRevision = 0;
	/** The revision being written right now */
	let writingRevision: number | null = null;
	let timer: ReturnType<typeof setTimeout> | undefined;
	let statusTimer: ReturnType<typeof setTimeout> | undefined;
	let writing: Promise<void> | null = null;

	const dirty = () => options.getRevision() !== savedRevision;

	async function write() {
		clearTimeout(timer);
		timer = undefined;
		const revision = options.getRevision();
		writingRevision = revision;
		const started = Date.now();
		clearTimeout(statusTimer);
		status = 'saving';
		const message = await options.save(options.getName() || UNTITLED_NAME);
		writingRevision = null;

		if (message) {
			status = 'error';
			error = message;
			return; // stays unsaved: the next change or a retry tries again
		}
		error = '';
		savedRevision = revision;
		savedAt = Date.now();
		if (dirty()) {
			schedule(); // edited while saving
			return; // still "saving" until that is done
		}
		// Saving is often too quick to notice: show it for a moment
		const remaining = minSavingTime - (Date.now() - started);
		if (remaining > 0) statusTimer = setTimeout(() => (status = 'saved'), remaining);
		else status = 'saved';
	}

	/** Start a write, or wait for the one in progress (which then picks up newer changes). */
	function run(): Promise<void> {
		writing ??= write().finally(() => (writing = null));
		return writing;
	}

	function schedule() {
		clearTimeout(timer);
		timer = setTimeout(() => void run(), delay);
	}

	return {
		get status() {
			return status;
		},
		get error() {
			return error;
		},
		get savedAt() {
			return savedAt;
		},
		/** Unsaved changes: waiting to be saved, being saved, or failed to save */
		get hasUnsaved() {
			return timer !== undefined || writing !== null || status === 'error';
		},

		/** Tell the controller the document's current id and revision; call whenever either may have changed. */
		changed(documentId: string, revision: number) {
			if (documentId !== trackedId) {
				// A different document was opened or started: nothing to save until it is edited
				trackedId = documentId;
				savedRevision = revision;
				clearTimeout(timer);
				timer = undefined;
				clearTimeout(statusTimer);
				status = 'idle';
				error = '';
				return;
			}
			// The save itself touches the document (its name), which calls this again: ignore the revision being written
			if (revision !== savedRevision && revision !== writingRevision) schedule();
		},

		/** The document was saved some other way (the Save button) */
		markSaved() {
			clearTimeout(timer);
			timer = undefined;
			clearTimeout(statusTimer);
			savedRevision = options.getRevision();
			savedAt = Date.now();
			status = 'saved';
			error = '';
		},

		/** Save now if there is anything unsaved, and wait until it is done. */
		async flush() {
			if (writing) await writing;
			if (dirty() && trackedId !== null) await run();
		},

		retry: () => run()
	};
}
