import { CANVAS_HEIGHT, DISPLAY_SCALE } from '../const/dimension';
import { MIN_ELEMENT_SIZE } from '../utils/geometry';
import type { TemplateElement } from './types';

/**
 * Templates are laid out in screen pixels on an A4 page that is 868 wide (the editor's default zoom),
 * so a 16 px font here is a 16 px font in the editor. Everything is converted to page units.
 */
export const PAGE_W = 868;
export const PAGE_H = CANVAS_HEIGHT * DISPLAY_SCALE;
const u = (px: number) => Math.round(px / DISPLAY_SCALE);
const MIN_BOX = MIN_ELEMENT_SIZE;

/** Side margin, and the width between the margins */
export const MARGIN = 56;
export const CONTENT_W = PAGE_W - MARGIN * 2;

export const ink = '#242424';
export const muted = '#616161';
export const rule = '#d1d1d1';

interface TextOptions {
	size?: number;
	weight?: string;
	color?: string;
	align?: 'left' | 'center' | 'right' | 'justify';
	font?: string;
	italic?: boolean;
	/** How many lines the text takes, to size the box (default: the number of line breaks) */
	lines?: number;
	transform?: 'uppercase' | 'none';
}

/** A text box. The editor insets text by 8 px, so x is the edge of the box, not of the letters. */
export function text(
	x: number,
	y: number,
	w: number,
	content: string,
	{
		size = 14,
		weight = '400',
		color = ink,
		align = 'left',
		font = 'Inter',
		italic = false,
		lines,
		transform = 'none'
	}: TextOptions = {}
): TemplateElement {
	const count = lines ?? content.split('\n').length;
	return {
		type: 'text',
		x: u(x - 8),
		y: u(y - 8),
		width: u(w + 16),
		height: u(count * size * 1.3 + 16),
		text: content,
		fontFamily: font,
		fontSize: size,
		fontWeight: weight,
		fontStyle: italic ? 'italic' : 'normal',
		textDecoration: 'none',
		textTransform: transform,
		textAlign: align,
		color,
		backgroundColor: '#ffffff',
		backgroundOpacity: 0
	};
}

interface BoxOptions {
	radius?: number;
	/** Outline instead of a fill */
	outline?: string;
	lineWidth?: number;
	opacity?: number;
}

function shape(
	shapeType: 'rectangle' | 'ellipse' | 'line-horizontal',
	x: number,
	y: number,
	w: number,
	h: number,
	fill: string,
	{ radius = 0, outline, lineWidth = 1, opacity = 1 }: BoxOptions = {}
): TemplateElement {
	return {
		type: 'shape',
		shapeType,
		x: u(x),
		y: u(y),
		width: u(w),
		height: u(h),
		strokeColor: outline ?? fill,
		strokeWidth: u(outline ? lineWidth : 0.5),
		strokeOpacity: 1,
		strokeStyle: 'solid',
		fillColor: outline ? '#ffffff' : fill,
		fillOpacity: outline ? 0 : opacity,
		cornerRadius: radius,
		rotation: 0
	};
}

export const rect = (x: number, y: number, w: number, h: number, fill: string, o?: BoxOptions) =>
	shape('rectangle', x, y, w, h, fill, o);

export const ellipse = (x: number, y: number, w: number, h: number, fill: string, o?: BoxOptions) =>
	shape('ellipse', x, y, w, h, fill, o);

/**
 * A horizontal rule. It is a line shape in a box of the editor's minimum height (20 page units), centred on `y`,
 * because the editor makes every element at least that tall and would stretch a thinner box.
 */
export const line = (
	x: number,
	y: number,
	w: number,
	color = rule,
	thickness = 1
): TemplateElement => ({
	...shape('line-horizontal', x, y, w, 0, color, {
		outline: color,
		lineWidth: thickness
	}),
	y: u(y) - MIN_BOX / 2,
	height: MIN_BOX
});

/** Rows of text at an even step, e.g. the lines of an invoice */
export const rows = (
	x: number,
	y: number,
	w: number,
	step: number,
	items: string[],
	options: TextOptions = {}
) => items.map((item, i) => text(x, y + i * step, w, item, options));
