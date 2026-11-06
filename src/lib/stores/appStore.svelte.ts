import { getDefaultProperties } from '$lib/utils/properties';
import { uuidv4 } from '$lib/utils/uuid';
import type {
	ElementType,
	DocumentData,
	TCanvasElement,
	DocumentPage,
	RulerBoundaries
} from '../types/canvas';
import { CANVAS_WIDTH, CANVAS_HEIGHT, DISPLAY_SCALE } from '../const/dimension';
import { CURRENT_SCHEMA_VERSION } from './migrations';

// Create a writable store for the application state
const createAppStore = () => {
	const getDefaultPage = (id: string): DocumentPage => {
		return {
			id,
			elements: {},
			boundaries: {
				horizontal: { start: 100, end: CANVAS_WIDTH - 100 },
				vertical: { start: 100, end: CANVAS_HEIGHT - 100 }
			}
		};
	};

	const firstPageId = uuidv4();

	let currentDocument: DocumentData = $state({
		id: uuidv4(),
		schemaVersion: CURRENT_SCHEMA_VERSION,
		name: '', // the user should set this value
		pages: {
			[firstPageId]: getDefaultPage(firstPageId)
		},
		createdAt: Date.now(),
		updatedAt: Date.now()
	});

	// Counts changes to the pages, so autosave can tell when there is something new to save
	let revision = $state(0);

	let scale = $state(DISPLAY_SCALE);

	// The selected elements, all on one page
	let selection: { pageId: string; ids: string[] } = $state({ pageId: '', ids: [] });
	// Taps select several elements instead of one: for touch screens, which have no Shift key
	let multiSelectMode = $state(false);

	// Helper to get next zIndex for a page
	const getNextZIndex = (pageId: string): number => {
		const page = getPage(pageId);
		if (!page) return 0;

		const elements = Object.values(page.elements);
		if (elements.length === 0) return 0;

		return Math.max(...elements.map((el) => el.zIndex)) + 1;
	};

	const getPageElements = (pageId: string): TCanvasElement[] => {
		const page = getPage(pageId);
		if (!page) return [];

		return Object.values(page.elements);
	};

	// Get all elements on a page sorted by zIndex (ascending)
	const getSortedElements = (pageId: string): TCanvasElement[] => {
		return getPageElements(pageId).sort((a, b) => a.zIndex - b.zIndex);
	};

	const getScale = () => scale;

	const setScale = (newScale: number) => {
		scale = newScale;
	};

	// Move an element forward in the z-index stack
	const moveForward = (elementId: string, pageId: string) => {
		const elements = getSortedElements(pageId);
		const currentIndex = elements.findIndex((el) => el.id === elementId);

		// Can't move forward if already at the top
		if (currentIndex === -1 || currentIndex === elements.length - 1) return;

		const currentElement = elements[currentIndex];
		const nextElement = elements[currentIndex + 1];

		// Swap z-indices
		updateElement({
			elementId: currentElement.id,
			updates: { zIndex: nextElement.zIndex },
			pageId
		});

		updateElement({
			elementId: nextElement.id,
			updates: { zIndex: currentElement.zIndex },
			pageId
		});
	};

	// Move an element backward in the z-index stack
	const moveBackward = (elementId: string, pageId: string) => {
		const elements = getSortedElements(pageId);
		const currentIndex = elements.findIndex((el) => el.id === elementId);

		// Can't move backward if already at the bottom
		if (currentIndex <= 0) return;

		const currentElement = elements[currentIndex];
		const prevElement = elements[currentIndex - 1];

		// Swap z-indices
		updateElement({
			elementId: currentElement.id,
			updates: { zIndex: prevElement.zIndex },
			pageId
		});

		updateElement({
			elementId: prevElement.id,
			updates: { zIndex: currentElement.zIndex },
			pageId
		});
	};

	// State getters
	const getPages = () => currentDocument.pages;

	const initNewDocument = () => {
		const pageId = uuidv4();

		currentDocument = {
			id: uuidv4(),
			schemaVersion: CURRENT_SCHEMA_VERSION,
			name: '', // the user should set this value
			pages: {
				[pageId]: getDefaultPage(pageId)
			},
			createdAt: Date.now(),
			updatedAt: Date.now()
		};

		selectElement(null);
	};

	const getCurrentDocument = () => currentDocument;

	const getPage = (pageId: string) => currentDocument.pages[pageId];

	const getSelectedElements = (): TCanvasElement[] => {
		const page = currentDocument.pages[selection.pageId];
		if (!page) return [];
		return selection.ids.flatMap((id) => (page.elements[id] ? [page.elements[id]] : []));
	};

	/** The selected element, when exactly one is selected. */
	const getSelectedElement = (): TCanvasElement | null => {
		const selected = getSelectedElements();
		return selected.length === 1 ? selected[0] : null;
	};

	const isSelected = (elementId: string) => selection.ids.includes(elementId);

	const getMultiSelectMode = () => multiSelectMode;
	const setMultiSelectMode = (on: boolean) => {
		multiSelectMode = on;
	};

	/** Changes whenever the pages change; loading or starting a document does not count. */
	const getRevision = () => revision;

	// Mutations
	const setCurrentDocument = (document: DocumentData) => {
		currentDocument = { ...document };
		selectElement(null);
	};

	const updateDocumentPages = (pages: Record<string, DocumentPage>) => {
		currentDocument = { ...currentDocument, pages };
		revision++;
	};

	const updateCurrentDocument = (document: Partial<DocumentData>) => {
		currentDocument = { ...currentDocument, ...document };
	};

	const addPage = () => {
		const newPage = getDefaultPage(uuidv4());
		updateDocumentPages({ ...currentDocument.pages, [newPage.id]: newPage });
	};

	const findElement = (pageId: string, elementId: string): TCanvasElement | null => {
		const page = getPage(pageId);
		if (!page) return null;

		return page.elements[elementId] || null;
	};

	const addElement = ({
		type,
		x,
		y,
		pageId,
		width,
		height,
		parentElementId = null
	}: {
		type: ElementType;
		x: number;
		y: number;
		pageId: string;
		width?: number;
		height?: number;
		parentElementId?: string | null;
	}) => {
		const page = getPage(pageId);
		if (!page) {
			return;
		}

		const newElement: TCanvasElement = getDefaultProperties({
			type,
			x,
			y,
			pageId,
			width,
			height,
			zIndex: getNextZIndex(pageId),
			parentElementId
		});

		// Add to page elements with proper reactivity
		updateDocumentPages({
			...currentDocument.pages,
			[pageId]: {
				...page,
				elements: { ...page.elements, [newElement.id]: newElement }
			}
		});

		// select the new element
		selectElement(newElement);
	};

	const updateElement = ({
		elementId,
		updates,
		pageId
	}: {
		elementId: string;
		updates: Partial<TCanvasElement>;
		pageId: string;
	}) => {
		const page = getPage(pageId);
		if (!page) return;

		const currentElement = page.elements[elementId];
		if (!currentElement) return;

		const elementType = currentElement.type;
		let updatedElement: TCanvasElement;

		switch (elementType) {
			case 'text':
				updatedElement = { ...currentElement, ...updates, type: 'text' };
				break;
			case 'shape':
				updatedElement = { ...currentElement, ...updates, type: 'shape' };
				break;
			case 'image':
				updatedElement = { ...currentElement, ...updates, type: 'image' };
				break;
		}

		if (!updatedElement) {
			// this shouldn't really happen
			return;
		}

		// Update with proper reactivity
		updateDocumentPages({
			...currentDocument.pages,
			[pageId]: {
				...page,
				elements: { ...page.elements, [elementId]: updatedElement }
			}
		});
	};

	/** Select one element, or clear the selection with null. */
	const selectElement = (element: TCanvasElement | null) => {
		selection = element ? { pageId: element.pageId, ids: [element.id] } : { pageId: '', ids: [] };
	};

	/** Select these elements of a page, replacing the selection. */
	const selectElements = (pageId: string, elementIds: string[]) => {
		selection = elementIds.length ? { pageId, ids: [...elementIds] } : { pageId: '', ids: [] };
	};

	/** Add the element to the selection, or remove it if it is already selected. */
	const toggleSelected = (element: TCanvasElement) => {
		if (selection.pageId !== element.pageId) return selectElement(element);
		selectElements(
			element.pageId,
			selection.ids.includes(element.id)
				? selection.ids.filter((id) => id !== element.id)
				: [...selection.ids, element.id]
		);
	};

	const deleteElement = (elementId: string, pageId: string) => {
		const page = getPage(pageId);
		if (!page) {
			return;
		}

		const newElements = { ...page.elements };
		delete newElements[elementId];

		// Update pages with reactivity
		updateDocumentPages({
			...currentDocument.pages,
			[pageId]: {
				...page,
				elements: newElements
			}
		});

		// Deselect the element after deletion
		if (selection.ids.includes(elementId)) {
			selectElements(
				selection.pageId,
				selection.ids.filter((id) => id !== elementId)
			);
		}
	};

	/** Delete several elements of a page at once. */
	const deleteElements = (elementIds: string[], pageId: string) => {
		const page = getPage(pageId);
		if (!page) return;

		const elements = { ...page.elements };
		for (const id of elementIds) delete elements[id];
		updateDocumentPages({ ...currentDocument.pages, [pageId]: { ...page, elements } });
		selectElements(
			selection.pageId,
			selection.ids.filter((id) => !elementIds.includes(id))
		);
	};

	/** Move several elements of a page at once, to the given positions. */
	const moveElements = (pageId: string, positions: Record<string, { x: number; y: number }>) => {
		const page = getPage(pageId);
		if (!page) return;

		const elements = { ...page.elements };
		for (const [id, { x, y }] of Object.entries(positions)) {
			if (elements[id]) elements[id] = { ...elements[id], x, y };
		}
		updateDocumentPages({ ...currentDocument.pages, [pageId]: { ...page, elements } });
	};

	const deletePage = (pageId: string) => {
		const pages = { ...currentDocument.pages };
		delete pages[pageId];
		updateDocumentPages(pages);
		if (selection.pageId === pageId) selectElement(null);
	};

	// Move element from one parent to another
	const moveElement = ({
		pageId,
		elementId,
		newParentId,
		newX,
		newY
	}: {
		pageId: string;
		elementId: string;
		newParentId: string | null;
		newX: number;
		newY: number;
	}) => {
		const page = getPage(pageId);
		if (!page) return;

		const element = page.elements[elementId];
		if (!element) return;

		// Update position and parent
		const updatedElement = {
			...element,
			x: newX,
			y: newY,
			parentElementId: newParentId
		};

		// Update with proper reactivity
		updateDocumentPages({
			...currentDocument.pages,
			[pageId]: {
				...page,
				elements: { ...page.elements, [elementId]: updatedElement }
			}
		});
	};

	const updateBoundaries = (pageId: string, boundaries: RulerBoundaries) => {
		const page = getPage(pageId);
		if (!page) {
			return;
		}

		// Update with proper reactivity
		updateDocumentPages({
			...currentDocument.pages,
			[pageId]: {
				...page,
				boundaries
			}
		});
	};

	return {
		// State getters
		getPages,
		getSelectedElement,
		getSelectedElements,
		isSelected,
		getMultiSelectMode,
		getCurrentDocument,
		getPageElements,
		getScale,
		getRevision,

		// Mutations
		setCurrentDocument,
		addPage,
		addElement,
		updateElement,
		deleteElement,
		deleteElements,
		deletePage,
		selectElement,
		selectElements,
		toggleSelected,
		setMultiSelectMode,
		moveElements,
		updateBoundaries,
		moveElement,
		findElement,
		updateCurrentDocument,
		initNewDocument,
		setScale,

		// Layering
		moveForward,
		moveBackward
	};
};

// Create and export the store instance
export const appStore = createAppStore();
