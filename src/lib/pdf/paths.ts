// Path geometry for the PDF renderer. Pure: no DOM, no PDF library.
import type { ShapeElement } from '../types/canvas';
import { effectiveStrokeWidth, polygonPoints } from '../utils/shapes';

export type Point = [number, number];
export type Segment =
	| ['M', number, number]
	| ['L', number, number]
	| ['C', number, number, number, number, number, number]
	| ['Z'];

/** Bezier control distance for a quarter circle */
const KAPPA = 0.5522847498;

export function ellipsePath(cx: number, cy: number, rx: number, ry: number): Segment[] {
	const kx = rx * KAPPA;
	const ky = ry * KAPPA;
	return [
		['M', cx + rx, cy],
		['C', cx + rx, cy + ky, cx + kx, cy + ry, cx, cy + ry],
		['C', cx - kx, cy + ry, cx - rx, cy + ky, cx - rx, cy],
		['C', cx - rx, cy - ky, cx - kx, cy - ry, cx, cy - ry],
		['C', cx + kx, cy - ry, cx + rx, cy - ky, cx + rx, cy],
		['Z']
	];
}

/** A rectangle with elliptical corners; radii are limited to half the size like in CSS. */
export function roundedRectPath(
	x: number,
	y: number,
	width: number,
	height: number,
	rx = 0,
	ry = 0
): Segment[] {
	rx = Math.min(Math.max(rx, 0), width / 2);
	ry = Math.min(Math.max(ry, 0), height / 2);
	if (!rx || !ry)
		return polygonPath([
			[x, y],
			[x + width, y],
			[x + width, y + height],
			[x, y + height]
		]);

	const kx = rx * KAPPA;
	const ky = ry * KAPPA;
	const r = x + width;
	const b = y + height;
	return [
		['M', x + rx, y],
		['L', r - rx, y],
		['C', r - rx + kx, y, r, y + ry - ky, r, y + ry],
		['L', r, b - ry],
		['C', r, b - ry + ky, r - rx + kx, b, r - rx, b],
		['L', x + rx, b],
		['C', x + rx - kx, b, x, b - ry + ky, x, b - ry],
		['L', x, y + ry],
		['C', x, y + ry - ky, x + rx - kx, y, x + rx, y],
		['Z']
	];
}

export function polygonPath(points: Point[], close = true): Segment[] {
	const segments: Segment[] = points.map(([x, y], i) => [i ? 'L' : 'M', x, y]);
	return close ? [...segments, ['Z']] : segments;
}

/** Apply a point transform to every coordinate of a path. */
export function mapPath(path: Segment[], map: (p: Point) => Point): Segment[] {
	return path.map((s) => {
		if (s[0] === 'Z') return s;
		if (s[0] === 'C') {
			const [x1, y1] = map([s[1], s[2]]);
			const [x2, y2] = map([s[3], s[4]]);
			const [x, y] = map([s[5], s[6]]);
			return ['C', x1, y1, x2, y2, x, y];
		}
		const [x, y] = map([s[1], s[2]]);
		return [s[0], x, y];
	});
}

/** SVG path data, as understood by the PDF library's drawSvgPath. */
export function toSvgPath(path: Segment[]): string {
	return path
		.map((s) => s.map((v) => (typeof v === 'number' ? Number(v.toFixed(3)) : v)).join(' '))
		.join(' ');
}

/** Rotate clockwise by degrees around (cx, cy), in a coordinate system where y points down. */
export function rotatePoint([x, y]: Point, degrees: number, cx: number, cy: number): Point {
	const a = (degrees * Math.PI) / 180;
	const dx = x - cx;
	const dy = y - cy;
	return [cx + dx * Math.cos(a) - dy * Math.sin(a), cy + dx * Math.sin(a) + dy * Math.cos(a)];
}

export interface ShapeGeometry {
	/** Path in the same units as the editor's SVG viewBox */
	path: Segment[];
	viewBox: { width: number; height: number };
	/** Shape is stroked only (lines) */
	open: boolean;
}

/**
 * The shape as the editor draws it in its SVG (see ShapeElementView), in viewBox units. The viewBox is
 * slightly larger than the element for everything but rectangles, to leave room for the stroke.
 */
export function shapeGeometry(el: ShapeElement): ShapeGeometry {
	const { width, height, shapeType } = el;
	const sw = effectiveStrokeWidth(el.strokeWidth);
	const isRect = shapeType === 'rectangle';
	const viewBox = isRect ? { width, height } : { width: width + sw, height: height + sw };

	if (isRect) {
		const rx = el.cornerRadius ? ((width - sw) * el.cornerRadius) / 100 : 0;
		const ry = el.cornerRadius ? ((height - sw) * el.cornerRadius) / 100 : 0;
		return {
			path: roundedRectPath(sw / 2, sw / 2, width - sw, height - sw, rx, ry),
			viewBox,
			open: false
		};
	}
	if (shapeType === 'circle') {
		const r = Math.min(width, height) / 2 - (el.strokeWidth ?? 0) / 2;
		return {
			path: ellipsePath(width / 2 + sw / 2, height / 2 + sw / 2, r, r),
			viewBox,
			open: false
		};
	}
	if (shapeType === 'ellipse') {
		return {
			path: ellipsePath(width / 2 + sw / 2, height / 2 + sw / 2, width / 2, height / 2),
			viewBox,
			open: false
		};
	}
	if (shapeType === 'line-horizontal') {
		const y = viewBox.height / 2;
		return {
			path: polygonPath(
				[
					[-viewBox.width, y],
					[viewBox.width * 1.2, y]
				],
				false
			),
			viewBox,
			open: true
		};
	}
	if (shapeType === 'line-vertical') {
		const x = viewBox.width / 2;
		return {
			path: polygonPath(
				[
					[x, -viewBox.height],
					[x, viewBox.height * 1.2]
				],
				false
			),
			viewBox,
			open: true
		};
	}
	const points = polygonPoints(shapeType, width, height, el.strokeWidth);
	return { path: polygonPath(points ?? []), viewBox, open: false };
}

/**
 * Mapping from viewBox units to the element box: the SVG fits its viewBox into the box
 * (preserveAspectRatio "meet", centred), which scales the stroke along with the shape.
 */
export function viewBoxFit(
	viewBox: { width: number; height: number },
	box: { width: number; height: number }
) {
	const scale = Math.min(box.width / viewBox.width, box.height / viewBox.height);
	return {
		scale,
		offsetX: (box.width - viewBox.width * scale) / 2,
		offsetY: (box.height - viewBox.height * scale) / 2
	};
}
