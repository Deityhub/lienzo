import { appStore } from '../stores/appStore.svelte.ts';
import { saveDocument, StorageQuotaError } from '../stores/idb';

/** Save the document being edited under `name`. Returns an error message for the user, or null on success. */
export async function saveCurrentDocument(name: string): Promise<string | null> {
	try {
		await saveDocument({ ...appStore.getCurrentDocument(), name });
		appStore.updateCurrentDocument({ name });
		return null;
	} catch (err) {
		return err instanceof StorageQuotaError
			? err.message
			: 'Failed to save. Please try again: ' + err;
	}
}
