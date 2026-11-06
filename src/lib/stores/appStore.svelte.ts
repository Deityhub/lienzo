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

	let selectedElement: TCanvasElement | null = $state(null);

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

	const getSelectedElement = () => selectedElement;

	/** Changes whenever the pages change; loading or starting a document does not count. */
	const getRevision = () => revision;

	// Mutations
	const setCurrentDocument = (document: DocumentData) => {
		currentDocument = { ...document };
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

		// Update selected reference if needed
		if (selectedElement && selectedElement.id === elementId) {
			selectElement(updatedElement);
		}
	};

	const selectElement = (element: TCanvasElement | null) => {
		selectedElement = element;
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
		if (selectedElement && selectedElement.id === elementId) {
			selectElement(null);
		}
	};

	const deletePage = (pageId: string) => {
		const pages = { ...currentDocument.pages };
		delete pages[pageId];
		updateDocumentPages(pages);
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
		deletePage,
		selectElement,
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
