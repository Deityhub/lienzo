import type { DocumentData } from '../types/canvas';

/** Bump when the stored document shape changes, and add a migration for the previous version. */
export const CURRENT_SCHEMA_VERSION = 1;

export class InvalidDocumentError extends Error {
	constructor(message: string) {
		super(message);
		this.name = 'InvalidDocumentError';
	}
}

export class UnsupportedVersionError extends Error {
	constructor(version: number) {
		super(
			`This document was created with a newer version of Lienzo (schema v${version}). Please update the app.`
		);
		this.name = 'UnsupportedVersionError';
	}
}

type RawDoc = Record<string, unknown>;
export type Migrations = Record<number, (doc: RawDoc) => RawDoc>;

/**
 * Migrations keyed by the version they upgrade FROM (n upgrades n -> n + 1).
 * Documents saved before versioning have no `schemaVersion` and are treated as v1.
 * Example, once the shape changes: `1: (doc) => ({ ...doc, tags: [] })` with CURRENT_SCHEMA_VERSION = 2.
 */
const MIGRATIONS: Migrations = {};

const isObject = (v: unknown): v is RawDoc =>
	typeof v === 'object' && v !== null && !Array.isArray(v);
const isNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);
const isStr = (v: unknown): v is string => typeof v === 'string';

function fail(path: string, expected: string): never {
	throw new InvalidDocumentError(`Invalid document: ${path} must be ${expected}`);
}

/** Structural check of the fields the editor needs to render a document. */
export function validateDocument(doc: unknown): asserts doc is DocumentData {
	if (!isObject(doc)) fail('document', 'an object');
	if (!isStr(doc.id) || !doc.id) fail('id', 'a non-empty string');
	if (!isStr(doc.name)) fail('name', 'a string');
	if (!isNum(doc.createdAt)) fail('createdAt', 'a number');
	if (!isNum(doc.updatedAt)) fail('updatedAt', 'a number');
	if (!isObject(doc.pages)) fail('pages', 'an object');

	for (const [pageKey, page] of Object.entries(doc.pages)) {
		const p = `pages.${pageKey}`;
		if (!isObject(page)) fail(p, 'an object');
		if (!isStr(page.id)) fail(`${p}.id`, 'a string');
		if (!isObject(page.elements)) fail(`${p}.elements`, 'an object');
		const b = page.boundaries;
		if (!isObject(b)) fail(`${p}.boundaries`, 'an object');
		for (const axis of ['horizontal', 'vertical']) {
			const a = b[axis];
			if (!isObject(a) || !isNum(a.start) || !isNum(a.end)) {
				fail(`${p}.boundaries.${axis}`, '{ start, end } numbers');
			}
		}

		for (const [elKey, el] of Object.entries(page.elements)) {
			const e = `${p}.elements.${elKey}`;
			if (!isObject(el)) fail(e, 'an object');
			if (!isStr(el.id)) fail(`${e}.id`, 'a string');
			if (!isStr(el.pageId)) fail(`${e}.pageId`, 'a string');
			for (const key of ['zIndex', 'x', 'y', 'width', 'height']) {
				if (!isNum(el[key])) fail(`${e}.${key}`, 'a number');
			}
			if (el.type === 'text' && !isStr(el.text)) fail(`${e}.text`, 'a string');
			else if (el.type === 'shape' && !isStr(el.shapeType)) fail(`${e}.shapeType`, 'a string');
			else if (el.type === 'image' && !isStr(el.src)) fail(`${e}.src`, 'a string');
			else if (el.type !== 'text' && el.type !== 'shape' && el.type !== 'image') {
				fail(`${e}.type`, '"text", "shape" or "image"');
			}
		}
	}
}

/** Upgrade a stored or imported document to the current schema and validate it. */
export function migrateDocument(
	raw: unknown,
	current = CURRENT_SCHEMA_VERSION,
	migrations: Migrations = MIGRATIONS
): DocumentData {
	if (!isObject(raw)) fail('document', 'an object');

	let version = raw.schemaVersion ?? 1;
	if (!isNum(version) || !Number.isInteger(version) || version < 1) {
		fail('schemaVersion', 'a positive integer');
	}
	if (version > current) throw new UnsupportedVersionError(version);

	let doc: RawDoc = { ...raw };
	while (version < current) {
		const migrate = migrations[version];
		if (!migrate) throw new InvalidDocumentError(`No migration from schema v${version}`);
		doc = migrate(doc);
		version++;
	}
	doc.schemaVersion = current;

	validateDocument(doc);
	return doc;
}
