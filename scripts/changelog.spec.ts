import { describe, expect, it } from 'vitest';
import { insert, render } from './changelog.mjs';

describe('changelog', () => {
	const subjects = [
		'feat: add text alignment (#22)',
		'fix(canvas)!: resize handle offset',
		'chore: bump deps',
		'Improvements (#14)',
		'docs: update readme'
	];

	it('groups conventional commits and drops hidden/unconventional ones', () => {
		const out = render(subjects, '1.1.0', 'v1.0.0', '2026-01-01');
		expect(out).toContain(
			'## [1.1.0](https://github.com/Deityhub/lienzo/compare/v1.0.0...v1.1.0) (2026-01-01)'
		);
		expect(out).toContain(
			'### Features\n\n- add text alignment ([#22](https://github.com/Deityhub/lienzo/pull/22))'
		);
		expect(out).toContain('### BREAKING CHANGES\n\n- resize handle offset');
		expect(out).toContain('### Documentation');
		expect(out).not.toContain('bump deps');
		expect(out).not.toContain('Improvements');
	});

	it('returns nothing when there is nothing releasable', () => {
		expect(render(['chore: x', 'ci: y'], '1.0.1', 'v1.0.0', '2026-01-01')).toBe('');
	});

	it('inserts above the newest release', () => {
		const out = insert('# Changelog\n\nintro\n\n## 1.0.0 (2025-11-28)\n\n- a\n', '## 1.1.0\n');
		expect(out.indexOf('## 1.1.0')).toBeLessThan(out.indexOf('## 1.0.0'));
		expect(out.startsWith('# Changelog\n\nintro\n\n## 1.1.0')).toBe(true);
	});
});
