import { CANVAS_HEIGHT, CANVAS_WIDTH } from '../const/dimension';
import { CURRENT_SCHEMA_VERSION } from '../stores/migrations';
import type { DocumentData, RulerBoundaries, TCanvasElement } from '../types/canvas';
import { uuidv4 } from '../utils/uuid';
import type { Template } from './types';

export { templates, templateById } from './catalog';
export { TEMPLATE_CATEGORIES, type Template, type TemplateCategory } from './types';

/** A new document with the template's page. Ids are new, so each use is its own document. */
const MARGIN = 100; // the editor's default margins, in page units

/**
 * The page's boundaries: the usual margins, moved out on any side where the design reaches past them. The
 * editor pulls every element inside the boundaries, so a full-bleed background needs them out of its way.
 */
export function boundariesFor(template: Template): RulerBoundaries {
	const edge = (pick: (e: Template['elements'][number]) => number, margin: number, min: boolean) =>
		template.elements.reduce((v, e) => (min ? Math.min(v, pick(e)) : Math.max(v, pick(e))), margin);
	return {
		horizontal: {
			start: edge((e) => e.x, MARGIN, true),
			end: edge((e) => e.x + e.width, CANVAS_WIDTH - MARGIN, false)
		},
		vertical: {
			start: edge((e) => e.y, MARGIN, true),
			end: edge((e) => e.y + e.height, CANVAS_HEIGHT - MARGIN, false)
		}
	};
}

export function documentFromTemplate(template: Template): DocumentData {
	const pageId = uuidv4();
	const elements: Record<string, TCanvasElement> = {};
	template.elements.forEach((element, zIndex) => {
		const id = uuidv4();
		elements[id] = { ...element, id, pageId, zIndex, parentElementId: null } as TCanvasElement;
	});
	const now = Date.now();
	return {
		id: uuidv4(),
		schemaVersion: CURRENT_SCHEMA_VERSION,
		name: template.name,
		pages: {
			[pageId]: {
				id: pageId,
				elements,
				boundaries: boundariesFor(template)
			}
		},
		createdAt: now,
		updatedAt: now
	};
}
