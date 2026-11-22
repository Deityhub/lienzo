/**
 * Transient UI state: the character range currently selected in a text element,
 * used to pre-fill the "start char" / "end char" fields when adding a link.
 * This is not persisted with the document. The range persists until it is
 * explicitly cleared (e.g. after a link is added or a different element is selected).
 */
let range = $state<{ elementId: string; start: number; end: number } | null>(null);

export const linkRangeStore = {
	get value() {
		return range;
	},
	set(elementId: string, start: number, end: number) {
		range = { elementId, start, end };
	},
	clear() {
		range = null;
	}
};
