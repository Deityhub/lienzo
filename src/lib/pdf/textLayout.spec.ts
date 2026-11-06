import { describe, expect, it } from 'vitest';
import { applyTextTransform, replaceUnsupported, splitWords } from './textLayout';

describe('applyTextTransform', () => {
	it('changes case like CSS', () => {
		expect(applyTextTransform('Hello world', 'uppercase')).toBe('HELLO WORLD');
		expect(applyTextTransform('Hello World', 'lowercase')).toBe('hello world');
		expect(applyTextTransform('hello big world', 'capitalize')).toBe('Hello Big World');
		expect(applyTextTransform("don't stop", 'capitalize')).toBe("Don't Stop");
		expect(applyTextTransform('keep', 'none')).toBe('keep');
		expect(applyTextTransform('keep', undefined)).toBe('keep');
	});
});

describe('splitWords', () => {
	it('returns each word with the position of its first character', () => {
		const chars = [...'ab cd  e'];
		const xs = chars.map((_c, i) => i * 10);
		expect(splitWords(chars, xs)).toEqual([
			{ text: 'ab', x: 0 },
			{ text: 'cd', x: 30 },
			{ text: 'e', x: 70 }
		]);
	});
});

describe('replaceUnsupported', () => {
	it('replaces characters the font lacks with ?', () => {
		const supported = new Set([...'abc ?'].map((c) => c.codePointAt(0)!));
		expect(replaceUnsupported('a b😀c€', supported)).toBe('a b?c?');
	});
});
