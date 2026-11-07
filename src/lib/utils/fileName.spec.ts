import { describe, expect, it } from 'vitest';
import { safeFileName } from './fileName';

describe('safeFileName', () => {
	it('keeps an ordinary name', () => {
		expect(safeFileName('Quarterly report')).toBe('Quarterly report');
		expect(safeFileName('Résumé – 2026')).toBe('Résumé – 2026');
	});

	it('replaces characters systems do not accept in file names', () => {
		expect(safeFileName('a/b\\c:d*e?f"g<h>i|j')).toBe('a b c d e f g h i j');
		expect(safeFileName('tab\there')).toBe('tab here');
	});

	it('drops a .pdf the user typed, since it is added on download', () => {
		expect(safeFileName('Invoice.pdf')).toBe('Invoice');
		expect(safeFileName('Invoice.PDF')).toBe('Invoice');
		expect(safeFileName('Invoice.pdf.pdf')).toBe('Invoice.pdf');
	});

	it('trims spaces and trailing dots', () => {
		expect(safeFileName('  Report  ')).toBe('Report');
		expect(safeFileName('Report...')).toBe('Report');
	});

	it('is empty when nothing usable is left', () => {
		expect(safeFileName('')).toBe('');
		expect(safeFileName('   ')).toBe('');
		expect(safeFileName('///')).toBe('');
		expect(safeFileName('.pdf')).toBe('');
	});

	it('limits the length', () => {
		expect(safeFileName('x'.repeat(300))).toHaveLength(100);
	});
});
