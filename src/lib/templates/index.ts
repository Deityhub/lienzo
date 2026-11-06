import { CANVAS_HEIGHT, CANVAS_WIDTH } from '../const/dimension';
import { CURRENT_SCHEMA_VERSION } from '../stores/migrations';
import type { DocumentData, TCanvasElement } from '../types/canvas';
import { uuidv4 } from '../utils/uuid';
import type { Template } from './types';

export { templates, templateById } from './catalog';
export { TEMPLATE_CATEGORIES, type Template, type TemplateCategory } from './types';

/** A new document with the template's page. Ids are new, so each use is its own document. */
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
				boundaries: {
					horizontal: { start: 100, end: CANVAS_WIDTH - 100 },
					vertical: { start: 100, end: CANVAS_HEIGHT - 100 }
				}
			}
		},
		createdAt: now,
		updatedAt: now
	};
}
