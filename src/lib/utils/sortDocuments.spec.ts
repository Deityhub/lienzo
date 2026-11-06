import { describe, expect, it } from 'vitest';
import { sampleDoc } from './testDocument';
import { sortDocuments } from './sortDocuments';

const doc = (id: string, name: string, createdAt: number, updatedAt: number) => ({
	...sampleDoc(id, name),
	createdAt,
	updatedAt
});

const docs = [
	doc('a', 'Invoice 10', 1, 50),
	doc('b', 'invoice 2', 3, 90),
	doc('c', 'Zebra', 2, 10),
	doc('d', 'apple', 4, 70)
];
const ids = (list: { id: string }[]) => list.map((d) => d.id).join('');

describe('sortDocuments', () => {
	it('puts the most recently updated first, and the least recent first when asked', () => {
		expect(ids(sortDocuments(docs, 'updated-desc'))).toBe('bdac');
		expect(ids(sortDocuments(docs, 'updated-asc'))).toBe('cadb');
	});

	it('puts the newest created first', () => {
		expect(ids(sortDocuments(docs, 'created-desc'))).toBe('dbca');
	});

	it('sorts names the way people read them: numbers by value, case ignored', () => {
		expect(sortDocuments(docs, 'name-asc').map((d) => d.name)).toEqual([
			'apple',
			'invoice 2',
			'Invoice 10',
			'Zebra'
		]);
		expect(ids(sortDocuments(docs, 'name-desc'))).toBe('cabd');
	});

	it('breaks ties by the latest update, then by id, so the order is stable', () => {
		const same = [doc('x', 'Same', 1, 10), doc('y', 'same', 1, 20), doc('w', 'SAME', 1, 20)];
		expect(ids(sortDocuments(same, 'name-asc'))).toBe('wyx');
	});

	it('does not change the list it is given', () => {
		const copy = [...docs];
		sortDocuments(docs, 'name-asc');
		expect(docs).toEqual(copy);
	});
});
