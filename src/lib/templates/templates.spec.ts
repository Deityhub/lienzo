import { describe, expect, it } from 'vitest';
import { CANVAS_HEIGHT, CANVAS_WIDTH } from '../const/dimension';
import { boundaryAdjustments } from '../utils/geometry';
import { documentFromTemplate, templates } from '.';

describe('templates', () => {
	it('have unique ids and a name, description and category each', () => {
		expect(new Set(templates.map((t) => t.id)).size).toBe(templates.length);
		for (const t of templates) {
			expect(t.name && t.description && t.category).toBeTruthy();
			expect(t.elements.length).toBeGreaterThan(3);
		}
	});

	it('keep all their text on the page', () => {
		for (const t of templates) {
			for (const el of t.elements) {
				if (el.type !== 'text') continue;
				expect(el.x, `${t.id}: "${el.text}"`).toBeGreaterThanOrEqual(0);
				expect(el.y, `${t.id}: "${el.text}"`).toBeGreaterThanOrEqual(0);
				expect(el.x + el.width, `${t.id}: "${el.text}"`).toBeLessThanOrEqual(CANVAS_WIDTH);
				expect(el.y + el.height, `${t.id}: "${el.text}"`).toBeLessThanOrEqual(CANVAS_HEIGHT);
			}
		}
	});

	it('open in the editor exactly as designed: it does not move or resize anything', () => {
		const moved: Record<string, string[]> = {};
		for (const t of templates) {
			const [page] = Object.values(documentFromTemplate(t).pages);
			const changes = boundaryAdjustments(Object.values(page.elements), page.boundaries);
			const texts = Object.keys(changes).map((id) => {
				const el = page.elements[id];
				return el.type === 'text'
					? el.text.slice(0, 20)
					: `${el.type} at ${el.x},${el.y} ${el.width}x${el.height}`;
			});
			if (texts.length) moved[t.id] = texts;
		}
		expect(moved).toEqual({});
	});

	it('make a new document each time, with ids that point at the right page', () => {
		const a = documentFromTemplate(templates[0]);
		const b = documentFromTemplate(templates[0]);
		expect(a.id).not.toBe(b.id);
		expect(a.name).toBe(templates[0].name);

		const [page] = Object.values(a.pages);
		const elements = Object.values(page.elements);
		expect(elements).toHaveLength(templates[0].elements.length);
		expect(elements.every((el) => el.pageId === page.id && page.elements[el.id] === el)).toBe(true);
		// stacked in the order the template lists them
		expect(elements.map((el) => el.zIndex)).toEqual(elements.map((_, i) => i));
	});
});
