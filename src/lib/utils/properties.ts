import type { ElementType, TCanvasElement } from '../types/canvas';
import { CANVAS_WIDTH } from '../const/dimension';
import { uuidv4 } from '../utils/uuid';

/**
 * Creates a new document element with default properties based on the element type.
 * Each element type (text, shape, image) gets its own set of default styling and attributes.
 *
 * @param params - Element creation parameters
 * @param params.type - The type of element to create ('text', 'shape', or 'image')
 * @param params.x - Horizontal position on the canvas
 * @param params.y - Vertical position on the canvas
 * @param params.pageId - ID of the page this element belongs to
 * @param params.width - Width of the element (defaults to canvas width minus margins)
 * @param params.height - Height of the element (defaults to 500)
 * @param params.zIndex - Stack order of the element (defaults to 0)
 * @param params.parentElementId - ID of the parent element (defaults to null)
 *
 * @returns A new TCanvasElement with type-specific default properties
 *
 * @example
 * ```ts
 * const textElement = getDefaultProperties({
 *   type: 'text',
 *   x: 100,
 *   y: 100,
 *   pageId: 'page1',
 *   parentElementId: 'parentElementId'
 * });
 * ```
 */
export function getDefaultProperties({
	type,
	x,
	y,
	pageId,
	width = CANVAS_WIDTH - 200, // Default to canvas width minus margins
	height = 500,
	zIndex = 0,
	parentElementId = null
}: {
	type: ElementType;
	x: number;
	y: number;
	pageId: string;
	width?: number;
	height?: number;
	zIndex?: number;
	parentElementId?: string | null;
}): TCanvasElement {
	const baseElement = {
		id: uuidv4(),
		pageId,
		zIndex,
		parentElementId,
		elements: {},
		x,
		y,
		width,
		height
	};

	switch (type) {
		case 'text':
			return {
				...baseElement,
				type: 'text',
				text: 'Your text here',
				fontFamily: 'Inter',
				fontSize: 16,
				fontWeight: '400',
				fontStyle: 'normal',
				textDecoration: 'none',
				textTransform: 'none',
				color: '#000000',
				backgroundOpacity: 0,
				backgroundColor: '#ffffff',
				links: []
			};
		case 'shape':
			return {
				...baseElement,
				type: 'shape',
				shapeType: 'line-horizontal',
				strokeColor: '#000000',
				strokeWidth: 8,
				strokeOpacity: 1,
				strokeStyle: 'solid',
				fillColor: '#ffffff',
				fillOpacity: 0,
				cornerRadius: 0,
				rotation: 0
			};
		case 'image':
			return {
				...baseElement,
				type: 'image',
				src: '',
				alt: 'Canvas image',
				objectFit: 'contain',
				borderRadius: 0,
				opacity: 1,
				borderColor: '#000000',
				borderWidth: 0,
				borderStyle: 'solid',
				boxShadow: '',
				backgroundColor: '#ffffff'
			};
	}
}
