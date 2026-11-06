export type ElementType = 'text' | 'shape' | 'image';
export type ResizeDirection = 'n' | 's' | 'e' | 'w' | 'nw' | 'ne' | 'sw' | 'se';

interface BaseElement {
	id: string;
	type: ElementType;
	pageId: string;
	parentElementId?: string | null; // Parent element ID for grouping (null for root elements)
	/** Elements with the same groupId are selected and moved together */
	groupId?: string;
	zIndex: number; // For stacking order
	x: number;
	y: number;
	width: number;
	height: number;
}

export interface TextElement extends BaseElement {
	type: 'text';
	text: string;
	fontFamily: string;
	fontSize: number;
	fontWeight: string;
	fontStyle: string;
	textDecoration?: string;
	textTransform?: string;
	textAlign?: 'left' | 'center' | 'right' | 'justify';
	color: string;
	backgroundColor?: string;
	backgroundOpacity?: number; // 0-1 for transparency control
}

export interface ShapeElement extends BaseElement {
	type: 'shape';
	shapeType:
		| 'rectangle'
		| 'circle'
		| 'ellipse'
		| 'triangle'
		| 'diamond'
		| 'hexagon'
		| 'pentagon'
		| 'line-horizontal'
		| 'line-vertical'
		| 'arrow-right'
		| 'arrow-left'
		| 'arrow-up'
		| 'arrow-down';
	strokeColor: string;
	strokeWidth: number;
	strokeOpacity?: number;
	strokeStyle?: 'solid' | 'dashed' | 'dotted';
	fillColor?: string;
	fillOpacity?: number;
	cornerRadius?: number; // Percentage (0-100) for rectangles
	sides?: number; // For polygons
	rotation?: number;
}

export interface ImageElement extends BaseElement {
	type: 'image';
	src: string;
	alt: string;
	objectFit?: 'contain' | 'cover' | 'fill' | 'none' | 'scale-down';
	borderRadius?: number; // Percentage (0-100)
	opacity?: number;
	borderColor?: string;
	borderWidth?: number;
	borderStyle?: 'solid' | 'dashed' | 'dotted';
	boxShadow?: string;
	backgroundColor?: string;
}

export type TCanvasElement = TextElement | ShapeElement | ImageElement;

export interface RulerBoundaries {
	horizontal: {
		start: number;
		end: number;
	};
	vertical: {
		start: number;
		end: number;
	};
}

export interface DocumentPage {
	id: string;
	elements: Record<string, TCanvasElement>;
	boundaries: RulerBoundaries;
}

export interface DocumentData {
	id: string;
	/** Stored document shape version, see stores/migrations.ts */
	schemaVersion: number;
	name: string;
	pages: Record<string, DocumentPage>;
	createdAt: number;
	updatedAt: number;
}

export type TCanvasInstance = {
	updateDragPreview?: (event: DragEvent) => void;
	clearDragPreview?: () => void;
};
