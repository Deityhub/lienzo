import type { DocumentData } from '../types/canvas';

export const SORT_OPTIONS = [
	{ value: 'updated-desc', label: 'Recently updated' },
	{ value: 'updated-asc', label: 'Least recently updated' },
	{ value: 'created-desc', label: 'Newest created' },
	{ value: 'name-asc', label: 'Name (A–Z)' },
	{ value: 'name-desc', label: 'Name (Z–A)' }
] as const;

export type SortKey = (typeof SORT_OPTIONS)[number]['value'];
export const DEFAULT_SORT: SortKey = 'updated-desc';

export const isSortKey = (value: unknown): value is SortKey =>
	SORT_OPTIONS.some((option) => option.value === value);

// Names compare the way people read them: "Invoice 2" before "Invoice 10", and "apple" next to "Apple"
const byName = new Intl.Collator(undefined, { numeric: true, sensitivity: 'base' });

/** A sorted copy. Ties fall back to the most recently updated, then the id, so the order never jumps around. */
export function sortDocuments(documents: DocumentData[], key: SortKey): DocumentData[] {
	const compare: Record<SortKey, (a: DocumentData, b: DocumentData) => number> = {
		'updated-desc': (a, b) => b.updatedAt - a.updatedAt,
		'updated-asc': (a, b) => a.updatedAt - b.updatedAt,
		'created-desc': (a, b) => b.createdAt - a.createdAt,
		'name-asc': (a, b) => byName.compare(a.name, b.name),
		'name-desc': (a, b) => byName.compare(b.name, a.name)
	};
	return [...documents].sort(
		(a, b) => compare[key](a, b) || b.updatedAt - a.updatedAt || a.id.localeCompare(b.id)
	);
}
