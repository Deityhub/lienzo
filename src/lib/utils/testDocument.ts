// Test fixture shared by unit and browser specs
import type { DocumentData } from '../types/canvas';
import { CURRENT_SCHEMA_VERSION } from '../stores/migrations';

export const sampleDoc = (id = 'd1', name = 'Resume'): DocumentData => ({
	id,
	schemaVersion: CURRENT_SCHEMA_VERSION,
	name,
	createdAt: 1,
	updatedAt: 2,
	pages: {
		p1: {
			id: 'p1',
			boundaries: { horizontal: { start: 0, end: 10 }, vertical: { start: 0, end: 10 } },
			elements: {
				t: {
					id: 't',
					type: 'text',
					pageId: 'p1',
					zIndex: 0,
					x: 1,
					y: 2,
					width: 3,
					height: 4,
					text: 'Hi',
					fontFamily: 'Inter',
					fontSize: 16,
					fontWeight: '400',
					fontStyle: 'normal',
					color: '#000',
					links: []
				}
			}
		}
	}
});
