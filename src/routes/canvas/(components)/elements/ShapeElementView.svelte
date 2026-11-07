<script lang="ts">
	import type { ShapeElement } from '$lib/types/canvas';
	import {
		effectiveStrokeWidth,
		isArrow,
		strokeDasharray,
		svgPolygonPoints
	} from '$lib/utils/shapes';

	const { element }: { element: ShapeElement } = $props();

	const sw = $derived(effectiveStrokeWidth(element.strokeWidth));
	const points = $derived(
		svgPolygonPoints(element.shapeType, element.width, element.height, element.strokeWidth)
	);

	// Attributes shared by the shapes. Arrows are solid by default and have no dash pattern.
	const stroke = $derived({
		stroke: element.strokeColor,
		'stroke-width': element.strokeWidth,
		'stroke-opacity': element.strokeOpacity || 1
	});
	const dash = $derived(strokeDasharray(element.strokeStyle));
	const fill = $derived({
		fill: element.fillColor || 'none',
		'fill-opacity': element.fillOpacity || 0
	});
	const arrowFill = $derived({
		fill: element.fillColor || element.strokeColor,
		'fill-opacity': element.fillOpacity || 1
	});
</script>

<div class="flex h-full w-full items-center justify-center overflow-hidden">
	<svg
		class="h-full w-full"
		style:transform="rotate({element.rotation || 0}deg)"
		viewBox="0 0 {element.shapeType === 'rectangle'
			? element.width
			: element.width + sw} {element.shapeType === 'rectangle'
			? element.height
			: element.height + sw}"
		xmlns="http://www.w3.org/2000/svg"
	>
		{#if element.shapeType === 'rectangle'}
			<rect
				x={sw / 2}
				y={sw / 2}
				width={element.width - sw}
				height={element.height - sw}
				{...fill}
				{...stroke}
				stroke-dasharray={dash}
				rx={element.cornerRadius
					? `${((element.width - sw) * element.cornerRadius) / 100}px`
					: '0px'}
				ry={element.cornerRadius
					? `${((element.height - sw) * element.cornerRadius) / 100}px`
					: '0px'}
			/>
		{:else if element.shapeType === 'circle'}
			<circle
				cx={element.width / 2 + sw / 2}
				cy={element.height / 2 + sw / 2}
				r={Math.min(element.width, element.height) / 2 - element.strokeWidth / 2}
				{...fill}
				{...stroke}
				stroke-dasharray={dash}
			/>
		{:else if element.shapeType === 'ellipse'}
			<ellipse
				cx={element.width / 2 + sw / 2}
				cy={element.height / 2 + sw / 2}
				rx={element.width / 2}
				ry={element.height / 2}
				{...fill}
				{...stroke}
				stroke-dasharray={dash}
			/>
		{:else if points && isArrow(element.shapeType)}
			<polygon {points} {...arrowFill} {...stroke} />
		{:else if points}
			<polygon {points} {...fill} {...stroke} stroke-dasharray={dash} />
		{:else if element.shapeType === 'line-horizontal'}
			<line x1="-100%" y1="50%" x2="120%" y2="50%" {...stroke} stroke-dasharray={dash} />
		{:else if element.shapeType === 'line-vertical'}
			<line x1="50%" y1="-100%" x2="50%" y2="120%" {...stroke} stroke-dasharray={dash} />
		{/if}
	</svg>
</div>
