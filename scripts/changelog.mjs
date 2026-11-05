// Adds a release section to CHANGELOG.md from Conventional Commits since the last tag.
// Usage: node scripts/changelog.mjs <version>
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';

const SECTIONS = {
	feat: 'Features',
	fix: 'Bug Fixes',
	perf: 'Performance',
	refactor: 'Refactors',
	docs: 'Documentation'
};
const REPO = process.env.GITHUB_REPOSITORY ?? 'Deityhub/lienzo';
const COMMIT = /^(\w+)(?:\([^)]+\))?(!)?: (.+)$/;

/** Group commit subjects into changelog sections. Unconventional and hidden types (chore, ci...) are dropped. */
export function render(subjects, version, prevTag, date) {
	const groups = { breaking: [] };
	for (const subject of subjects) {
		const m = COMMIT.exec(subject);
		if (!m || !(m[1] in SECTIONS)) continue;
		const text = m[3].replace(/\(#(\d+)\)/, `([#$1](https://github.com/${REPO}/pull/$1))`);
		(groups[m[1]] ??= []).push(text);
		if (m[2]) groups.breaking.push(text);
	}
	const body = [['breaking', 'BREAKING CHANGES'], ...Object.entries(SECTIONS)]
		.filter(([type]) => groups[type]?.length)
		.map(([type, title]) => `### ${title}\n\n${groups[type].map((t) => `- ${t}`).join('\n')}`)
		.join('\n\n');
	if (!body) return '';
	const link = `https://github.com/${REPO}/compare/${prevTag}...v${version}`;
	return `## [${version}](${link}) (${date})\n\n${body}\n`;
}

/** Insert a section above the newest existing release heading. */
export function insert(changelog, section) {
	const i = changelog.indexOf('\n## ');
	return i === -1
		? `${changelog.trimEnd()}\n\n${section}`
		: `${changelog.slice(0, i + 1)}${section}\n${changelog.slice(i + 1)}`;
}

if (import.meta.url === `file://${process.argv[1]}`) {
	const version = process.argv[2];
	if (!version) throw new Error('Usage: node scripts/changelog.mjs <version>');
	// Latest version tag by semver, not `git describe`: release tags live on main's merge commits,
	// which develop does not contain. `<tag>..HEAD` still excludes everything already released.
	const prevTag = execFileSync('git', ['tag', '--list', 'v*', '--sort=-v:refname'], {
		encoding: 'utf-8'
	})
		.split('\n')
		.find(Boolean);
	if (!prevTag)
		throw new Error('No version tag found. Create the baseline tag (e.g. v1.0.0) first.');
	const subjects = execFileSync('git', ['log', `${prevTag}..HEAD`, '--no-merges', '--format=%s'], {
		encoding: 'utf-8'
	})
		.split('\n')
		.filter(Boolean);
	const section = render(subjects, version, prevTag, new Date().toISOString().slice(0, 10));
	if (!section)
		throw new Error(`No releasable commits (feat/fix/perf/refactor/docs) since ${prevTag}.`);
	writeFileSync('CHANGELOG.md', insert(readFileSync('CHANGELOG.md', 'utf-8'), section));
	process.stdout.write(`CHANGELOG.md updated for v${version} (since ${prevTag})\n`);
}
