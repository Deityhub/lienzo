import {
	appendBezierCurve,
	clip,
	closePath,
	endPath,
	lineTo,
	moveTo,
	popGraphicsState,
	pushGraphicsState,
	rgb,
	type PDFFont,
	type PDFImage,
	type PDFPage
} from '@cantoo/pdf-lib';
import { PDFArray, PDFName, PDFString } from '@cantoo/pdf-lib';
import { CANVAS_HEIGHT, CANVAS_WIDTH, DISPLAY_SCALE } from '$lib/const/dimension';
import type {
	DocumentData,
	ImageElement,
	ShapeElement,
	TCanvasElement,
	TextElement,
	TextLink
} from '$lib/types/canvas';
import { createPdf, finishPdf } from '$lib/utils/pdfDocument';
import { strokeDasharray, isArrow } from '$lib/utils/shapes';
import { parseColor } from './color';
import { createFontEmbedder } from './fonts';
import { fitImage } from './imageFit';
import { loadImage } from './images';
import { measureText, type MeasuredLine } from './measureText';
import {
	mapPath,
	roundedRectPath,
	rotatePoint,
	shapeGeometry,
	toSvgPath,
	viewBoxFit,
	type Segment
} from './paths';
import { applyTextTransform, replaceUnsupported, splitWords } from './textLayout';
import { linkColor } from '$lib/utils/textLinks';

// A4 at 300 DPI, in PDF points
const PAGE_W = (CANVAS_WIDTH / 300) * 72;
const PAGE_H = (CANVAS_HEIGHT / 300) * 72;
/** Points per canvas pixel (element positions and sizes) */
const PT = PAGE_W / CANVAS_WIDTH;
/** Points per CSS px at the display scale (text, borders and image sizes are laid out at that scale) */
const UNIT = PT / DISPLAY_SCALE;

const colorOf = (value: string | undefined, fallback = '#000000') => {
	const c = parseColor(value) ?? parseColor(fallback)!;
	return { color: rgb(c.r, c.g, c.b), alpha: c.a };
};

interface Box {
	x: number; // pt from the left of the page
	y: number; // pt from the top of the page
	w: number;
	h: number;
}

const boxOf = (el: TCanvasElement): Box => ({
	x: el.x * PT,
	y: el.y * PT,
	w: el.width * PT,
	h: el.height * PT
});

/** y-down page coordinates to the PDF's y-up */
const flip = (y: number) => PAGE_H - y;

function pathOperators(path: Segment[]) {
	return path.map((s) => {
		if (s[0] === 'M') return moveTo(s[1], flip(s[2]));
		if (s[0] === 'L') return lineTo(s[1], flip(s[2]));
		if (s[0] === 'C')
			return appendBezierCurve(s[1], flip(s[2]), s[3], flip(s[4]), s[5], flip(s[6]));
		return closePath();
	});
}

/** Run `draw` with everything outside the path hidden, like the editor's overflow: hidden. */
async function clipped(page: PDFPage, path: Segment[], draw: () => Promise<void> | void) {
	page.pushOperators(pushGraphicsState(), ...pathOperators(path), clip(), endPath());
	try {
		await draw();
	} finally {
		page.pushOperators(popGraphicsState());
	}
}

const rectPath = (box: Box) => roundedRectPath(box.x, box.y, box.w, box.h);

// ---------- text ----------

async function drawText(
	page: PDFPage,
	el: TextElement,
	embed: (family: string, weight: string, style: string) => Promise<PDFFont>
) {
	const box = boxOf(el);
	const bg = parseColor(el.backgroundColor);
	if (bg) {
		page.drawRectangle({
			x: box.x,
			y: flip(box.y + box.h),
			width: box.w,
			height: box.h,
			color: rgb(bg.r, bg.g, bg.b),
			opacity: (el.backgroundOpacity ?? 1) * bg.a
		});
	}

	const lines = await measureText(el);
	if (!lines.length) return;
	const font = await embed(el.fontFamily, el.fontWeight, el.fontStyle);
	const supported = new Set(font.getCharacterSet());
	const size = el.fontSize * UNIT;
	const { color, alpha } = colorOf(el.color);
	const decoration = el.textDecoration ?? 'none';
	const lineWidth = Math.max(size / 16, 0.4);

	await clipped(page, rectPath(box), () => {
		const show = (text: string, x: number, y: number, textColor: string = el.color) => {
			const { color, alpha } = colorOf(textColor);
			page.drawText(replaceUnsupported(applyTextTransform(text, el.textTransform), supported), {
				x,
				y,
				size,
				font,
				color,
				opacity: alpha
			});
		};

		// Running global character offset, so link ranges map onto each line.
		let charIndex = 0;
		for (const line of lines) {
			const left = box.x + line.left * UNIT;
			const baseline = flip(box.y + line.baseline * UNIT);
			const lineStart = charIndex;
			const lineEnd = charIndex + line.chars.length;
			charIndex = lineEnd;

			const text = applyTextTransform(line.chars.join(''), el.textTransform);
			const natural = font.widthOfTextAtSize(replaceUnsupported(text, supported), size);
			const measured = (line.right - line.left) * UNIT;

			// The browser stretched this line to justify it, which a plain text run cannot do:
			// place the words instead (linked words keep the element colour under justify).
			if (el.textAlign === 'justify' && Math.abs(measured - natural) > 0.5) {
				for (const word of splitWords(line.chars, line.xs))
					show(word.text, box.x + word.x * UNIT, baseline);
			} else {
				// Split the line into plain/link segments so each link is drawn in its own colour.
				let runX = line.left;
				const segments = lineSegments(line.chars, lineStart, lineEnd, el.links ?? []);
				for (const seg of segments) {
					const segWidth = font.widthOfTextAtSize(
						replaceUnsupported(applyTextTransform(seg.text, el.textTransform), supported),
						size
					);
					show(seg.text, box.x + runX * UNIT, baseline, seg.link ? linkColor(seg.link) : el.color);
					runX += segWidth / UNIT;
				}
			}

			const right = left + (el.textAlign === 'justify' ? measured : natural);
			const decorate = (y: number) =>
				page.drawLine({
					start: { x: left, y },
					end: { x: right, y },
					thickness: lineWidth,
					color,
					opacity: alpha
				});
			if (decoration.includes('underline')) decorate(baseline - size * 0.12);
			if (decoration.includes('line-through')) decorate(baseline + size * 0.3);
			if (decoration.includes('overline')) decorate(baseline + size * 0.8);
		}

		// Clickable link annotations (web URLs and mailto addresses) over each link span
		for (const { link, x, y, w, h } of linkAnnotationBoxes(lines, el.text, el.links ?? [], size)) {
			const x1 = box.x + x * UNIT;
			const y1 = box.y + y * UNIT; // top, y-down from the top of the page
			const x2 = box.x + (x + w) * UNIT;
			const y2 = box.y + (y + h) * UNIT; // bottom
			addLinkAnnotation(page, [x1, flip(y2), x2, flip(y1)], link.url);
		}
	});
}

/** Split a line's characters into plain/link segments in reading order. */
function lineSegments(
	chars: string[],
	lineStart: number,
	lineEnd: number,
	links: TextLink[]
): Array<{ text: string; link?: TextLink }> {
	const sorted = [...links].sort((a, b) => a.start - b.start || a.end - b.end);
	const segments: Array<{ text: string; link?: TextLink }> = [];
	let cursor = 0; // offset within this line's chars
	for (const link of sorted) {
		const start = Math.max(lineStart, link.start) - lineStart;
		const end = Math.min(lineEnd, link.end) - lineStart;
		if (end <= start || end <= cursor) continue;
		if (start > cursor) {
			segments.push({ text: chars.slice(cursor, start).join('') });
		}
		segments.push({ text: chars.slice(start, end).join(''), link });
		cursor = end;
	}
	if (cursor < chars.length) segments.push({ text: chars.slice(cursor).join('') });
	return segments;
}

/** Bounding boxes (CSS px at display scale, y-down from the element box top-left) of each link span. */
function linkAnnotationBoxes(
	lines: MeasuredLine[],
	text: string,
	links: TextLink[],
	size: number
): Array<{ link: TextLink; x: number; y: number; w: number; h: number }> {
	const boxes: Array<{ link: TextLink; x: number; y: number; w: number; h: number }> = [];
	for (const link of links) {
		const start = Math.max(0, Math.min(link.start, text.length));
		const end = Math.max(start, Math.min(link.end, text.length));
		if (end <= start) continue;
		let charIndex = 0;
		let minX = Infinity;
		let maxX = -Infinity;
		let minY = Infinity;
		let maxY = -Infinity;
		let touched = false;
		for (const line of lines) {
			const lineStart = charIndex;
			const lineEnd = charIndex + line.chars.length;
			const os = Math.max(start, lineStart) - lineStart;
			const oe = Math.min(end, lineEnd) - lineStart;
			if (oe > os && os < line.chars.length && oe > 0) {
				touched = true;
				const x1 = line.xs[os];
				const x2 = oe < line.xs.length ? line.xs[oe] : line.right;
				minX = Math.min(minX, x1);
				maxX = Math.max(maxX, x2);
				minY = Math.min(minY, line.top);
				maxY = Math.max(maxY, line.top + size);
			}
			charIndex = lineEnd;
		}
		if (touched) {
			boxes.push({ link, x: minX, y: minY, w: maxX - minX, h: maxY - minY });
		}
	}
	return boxes;
}

/** Add a clickable URI (web or mailto) link annotation to a PDF page. */
function addLinkAnnotation(page: PDFPage, rect: [number, number, number, number], uri: string) {
	const context = page.node.context;
	let annots = page.node.lookup(PDFName.of('Annots'), PDFArray);
	if (!annots) {
		annots = context.obj([]);
		page.node.set(PDFName.of('Annots'), annots);
	}
	const link = context.obj({
		Type: PDFName.of('Annot'),
		Subtype: PDFName.of('Link'),
		Rect: context.obj(rect),
		Border: context.obj([0, 0, 0]),
		A: context.obj({
			Type: PDFName.of('Action'),
			S: PDFName.of('URI'),
			URI: PDFString.of(uri)
		})
	});
	annots.push(context.register(link));
}

// ---------- shapes ----------

async function drawShape(page: PDFPage, el: ShapeElement) {
	const box = boxOf(el);
	const geometry = shapeGeometry(el);
	const fit = viewBoxFit(geometry.viewBox, el);
	const rotation = el.rotation || 0;

	const toPage = ([x, y]: [number, number]): [number, number] => {
		const inBox = rotatePoint(
			[x * fit.scale + fit.offsetX, y * fit.scale + fit.offsetY],
			rotation,
			el.width / 2,
			el.height / 2
		);
		return [(el.x + inBox[0]) * PT, (el.y + inBox[1]) * PT];
	};

	const arrow = isArrow(el.shapeType);
	const fillSource = arrow ? el.fillColor || el.strokeColor : el.fillColor;
	const fillOpacity = arrow ? el.fillOpacity || 1 : el.fillOpacity || 0;
	const fill = !geometry.open && fillSource && fillOpacity > 0 ? colorOf(fillSource) : null;
	const stroke = el.strokeWidth > 0 ? colorOf(el.strokeColor) : null;

	const unit = fit.scale * PT;
	const dash = arrow ? 'none' : strokeDasharray(el.strokeStyle);
	await clipped(page, rectPath(box), () => {
		if (!fill && !stroke) return;
		page.drawSvgPath(toSvgPath(mapPath(geometry.path, toPage)), {
			x: 0,
			y: PAGE_H,
			...(fill && { color: fill.color, opacity: fillOpacity * fill.alpha }),
			...(stroke && {
				borderColor: stroke.color,
				borderWidth: el.strokeWidth * unit,
				borderOpacity: (el.strokeOpacity || 1) * stroke.alpha,
				...(dash !== 'none' && { borderDashArray: dash.split(',').map((n) => Number(n) * unit) })
			})
		});
	});
}

// ---------- images ----------

async function drawImage(
	page: PDFPage,
	el: ImageElement,
	embedImage: (src: string) => Promise<{ image: PDFImage; width: number; height: number } | null>,
	warnings: string[]
) {
	const box = boxOf(el);
	const opacity = el.opacity || 1;
	const border = (el.borderWidth || 0) * UNIT;
	const radius = (el.borderRadius || 0) / 100;
	const rounded = (inset: number) =>
		roundedRectPath(
			box.x + inset,
			box.y + inset,
			box.w - 2 * inset,
			box.h - 2 * inset,
			Math.max(box.w * radius - inset, 0),
			Math.max(box.h * radius - inset, 0)
		);
	const background = parseColor(el.backgroundColor);

	await clipped(page, rounded(0), async () => {
		if (background) {
			page.drawSvgPath(toSvgPath(rounded(0)), {
				x: 0,
				y: PAGE_H,
				color: rgb(background.r, background.g, background.b),
				opacity: opacity * background.a
			});
		}
		if (!el.src) return;

		// The image sits inside the border
		const inner = {
			x: box.x + border,
			y: box.y + border,
			w: box.w - 2 * border,
			h: box.h - 2 * border
		};
		const loaded = await embedImage(el.src);
		if (!loaded) {
			warnings.push(
				`An image${el.alt ? ` (“${el.alt}”)` : ''} could not be included, it is left blank.`
			);
			return;
		}
		const placed = fitImage(
			el.objectFit,
			{ width: inner.w, height: inner.h },
			{ width: loaded.width * UNIT, height: loaded.height * UNIT }
		);
		await clipped(page, rounded(border), () => {
			page.drawImage(loaded.image, {
				x: inner.x + placed.x,
				y: flip(inner.y + placed.y + placed.height),
				width: placed.width,
				height: placed.height,
				opacity
			});
		});
	});

	if (border > 0) {
		const { color, alpha } = colorOf(el.borderColor);
		const dash =
			el.borderStyle === 'dashed'
				? [border * 3, border * 3]
				: el.borderStyle === 'dotted'
					? [border, border]
					: undefined;
		page.drawSvgPath(toSvgPath(rounded(border / 2)), {
			x: 0,
			y: PAGE_H,
			borderColor: color,
			borderWidth: border,
			borderOpacity: opacity * alpha,
			...(dash && { borderDashArray: dash })
		});
	}
}

// ---------- document ----------

export interface RenderResult {
	bytes: Uint8Array;
	/** Things that could not be reproduced, to show to the user */
	warnings: string[];
}

/**
 * Draw the document as a PDF with real text and vector shapes (no screenshots), and attach the document
 * JSON so the PDF can be imported back into Lienzo.
 */
export async function renderDocumentPdf(
	doc: DocumentData,
	documentJson: string,
	title: string,
	/** Called before the first page and after each page, to show progress */
	onProgress?: (pagesDone: number, pageCount: number) => void
): Promise<RenderResult> {
	const warnings: string[] = [];
	const pdf = await createPdf(title);
	const embedFont = await createFontEmbedder(pdf, warnings);

	const images = new Map<
		string,
		Promise<{ image: PDFImage; width: number; height: number } | null>
	>();
	const embedImage = (src: string) => {
		let result = images.get(src);
		if (!result) {
			result = loadImage(src).then(async (loaded) => {
				if (!loaded) return null;
				const image = await (loaded.format === 'png'
					? pdf.embedPng(loaded.bytes)
					: pdf.embedJpg(loaded.bytes));
				return { image, width: loaded.width, height: loaded.height };
			});
			images.set(src, result);
		}
		return result;
	};

	const sources = Object.values(doc.pages);
	onProgress?.(0, sources.length);
	for (const source of sources) {
		const page = pdf.addPage([PAGE_W, PAGE_H]);
		// Elements stack by zIndex, like in the editor
		const elements = Object.values(source.elements).sort((a, b) => a.zIndex - b.zIndex);
		for (const el of elements) {
			try {
				if (el.type === 'text') await drawText(page, el, embedFont);
				else if (el.type === 'shape') await drawShape(page, el);
				else await drawImage(page, el, embedImage, warnings);
			} catch (error) {
				console.error('Could not draw element', el.id, error);
				warnings.push(`An element (${el.type}) could not be drawn.`);
			}
		}
		onProgress?.(pdf.getPageCount(), sources.length);
	}

	return { bytes: await finishPdf(pdf, documentJson), warnings: [...new Set(warnings)] };
}
