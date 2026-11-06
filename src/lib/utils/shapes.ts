// Pure shape geometry, shared by the editor (SVG) and any other renderer (e.g. PDF export).
import type { ShapeElement } from '../types/canvas';

type ShapeType = ShapeElement['shapeType'];

/** Corner points as fractions [x, y] of the shape's width and height. */
const POLYGONS: Partial<Record<ShapeType, Array<[number, number]>>> = {
	triangle: [
		[0.5, 0],
		[1, 1],
		[0, 1]
	],
	diamond: [
		[0.5, 0],
		[1, 0.5],
		[0.5, 1],
		[0, 0.5]
	],
	hexagon: [
		[0.5, 0],
		[1, 0.25],
		[1, 0.75],
		[0.5, 1],
		[0, 0.75],
		[0, 0.25]
	],
	pentagon: [
		[0.5, 0],
		[0.85, 0.3],
		[0.95, 0.8],
		[0.5, 1],
		[0.05, 0.8],
		[0.15, 0.3]
	],
	'arrow-right': [
		[0, 0.5],
		[0.7, 0.5],
		[0.7, 0],
		[1, 0.5],
		[0.7, 1],
		[0.7, 0.5]
	],
	'arrow-left': [
		[1, 0.5],
		[0.3, 0.5],
		[0.3, 0],
		[0, 0.5],
		[0.3, 1],
		[0.3, 0.5]
	],
	'arrow-down': [
		[0.5, 0],
		[0.5, 0.7],
		[0, 0.7],
		[0.5, 1],
		[1, 0.7],
		[0.5, 0.7]
	],
	'arrow-up': [
		[0.5, 1],
		[0.5, 0.3],
		[0, 0.3],
		[0.5, 0],
		[1, 0.3],
		[0.5, 0.3]
	]
};

/** The stroke width used for layout; the stroke is drawn centred on the edge, so shapes are inset by half of it. */
export const effectiveStrokeWidth = (strokeWidth: number | undefined) => strokeWidth || 1;

/** Polygon corner points in element pixels, or null for shapes that are not polygons. */
export function polygonPoints(
	shapeType: ShapeType,
	width: number,
	height: number,
	strokeWidth: number | undefined
): Array<[number, number]> | null {
	const corners = POLYGONS[shapeType];
	if (!corners) return null;
	const inset = effectiveStrokeWidth(strokeWidth) / 2;
	return corners.map(([fx, fy]) => [fx * width + inset, fy * height + inset]);
}

/** The SVG `points` attribute for a polygon shape. */
export function svgPolygonPoints(
	shapeType: ShapeType,
	width: number,
	height: number,
	strokeWidth: number | undefined
): string | null {
	return (
		polygonPoints(shapeType, width, height, strokeWidth)
			?.map(([x, y]) => `${x},${y}`)
			.join(' ') ?? null
	);
}

export const isArrow = (shapeType: ShapeType) => shapeType.startsWith('arrow-');

export function strokeDasharray(style: ShapeElement['strokeStyle']): string {
	if (style === 'dashed') return '5,5';
	if (style === 'dotted') return '2,2';
	return 'none';
}
