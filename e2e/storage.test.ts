import { expect, test } from '@playwright/test';
import { seedDocument } from './helpers';

// A document saved by an older app version (before schemaVersion existed)
const legacyDocument = {
	id: 'legacy-1',
	name: 'Legacy Resume',
	createdAt: 1,
	updatedAt: 2,
	pages: {
		p1: {
			id: 'p1',
			boundaries: { horizontal: { start: 100, end: 700 }, vertical: { start: 100, end: 1000 } },
			elements: {
				t1: {
					id: 't1',
					type: 'text',
					pageId: 'p1',
					zIndex: 0,
					x: 120,
					y: 140,
					width: 300,
					height: 60,
					text: 'Hello from v1',
					fontFamily: 'Inter',
					fontSize: 24,
					fontWeight: '400',
					fontStyle: 'normal',
					color: '#000000'
				}
			}
		}
	}
};

test('documents saved before schema versioning still appear in the list', async ({ page }) => {
	await seedDocument(page, legacyDocument);
	await expect(page.getByText('Legacy Resume')).toBeVisible();
});
