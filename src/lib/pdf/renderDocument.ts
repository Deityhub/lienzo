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
import { CANVAS_HEIGHT, CANVAS_WIDTH, DISPLAY_SCALE } from '$lib/const/dimension';
import type {
	DocumentData,
	ImageElement,
	ShapeElement,
	TCanvasElement,
	TextElement
} from '$lib/types/canvas';
import { createPdf, finishPdf } from '$lib/utils/pdfDocument';
import { strokeDasharray, isArrow } from '$lib/utils/shapes';
import { parseColor } from './color';
import { createFontEmbedder } from './fonts';
import { fitImage } from './imageFit';
import { loadImage } from './images';
import { measureText } from './measureText';
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
		const show = (text: string, x: number, y: number) =>
			page.drawText(replaceUnsupported(applyTextTransform(text, el.textTransform), supported), {
				x,
				y,
				size,
				font,
				color,
				opacity: alpha
			});

		for (const line of lines) {
			const left = box.x + line.left * UNIT;
			const baseline = flip(box.y + line.baseline * UNIT);
			const text = applyTextTransform(line.chars.join(''), el.textTransform);
			const natural = font.widthOfTextAtSize(replaceUnsupported(text, supported), size);
			const measured = (line.right - line.left) * UNIT;

			// The browser stretched this line to justify it, which a plain text run cannot do: place the words instead
			if (el.textAlign === 'justify' && Math.abs(measured - natural) > 0.5) {
				for (const word of splitWords(line.chars, line.xs))
					show(word.text, box.x + word.x * UNIT, baseline);
			} else {
				show(line.chars.join(''), left, baseline);
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
	});
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
	title: string
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

	for (const source of Object.values(doc.pages)) {
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
	}

	return { bytes: await finishPdf(pdf, documentJson), warnings: [...new Set(warnings)] };
}
