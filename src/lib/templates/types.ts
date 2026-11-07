import type { TCanvasElement } from '../types/canvas';

export const TEMPLATE_CATEGORIES = [
	'Career',
	'Business',
	'Events',
	'Education',
	'Personal'
] as const;
export type TemplateCategory = (typeof TEMPLATE_CATEGORIES)[number];

type Omitted = 'id' | 'pageId' | 'zIndex';
/** An element as a template describes it: ids and stacking are given when a document is made from it */
export type TemplateElement = TCanvasElement extends infer E
	? E extends TCanvasElement
		? Omit<E, Omitted | 'parentElementId'>
		: never
	: never;

export interface Template {
	id: string;
	name: string;
	description: string;
	category: TemplateCategory;
	/** Colour of the preview's main accent */
	accent: string;
	/** The elements of its single A4 page, back to front */
	elements: TemplateElement[];
}
