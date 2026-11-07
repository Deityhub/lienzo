<script lang="ts">
	import { CANVAS_HEIGHT, CANVAS_WIDTH, DISPLAY_SCALE } from '$lib/const/dimension';
	import ShapeElementView from '../../routes/canvas/(components)/elements/ShapeElementView.svelte';
	import type { ShapeElement } from '$lib/types/canvas';
	import type { Template } from './types';

	const { template, width = 200 }: { template: Template; width?: number } = $props();

	const zoom = $derived(width / CANVAS_WIDTH);
	// Text is sized in editor pixels; the page here is drawn in page units
	const unit = 1 / DISPLAY_SCALE;
</script>

<!-- The real page, drawn small: what you see is what you get when you use the template -->
<div
	class="relative flex-none overflow-hidden bg-paper shadow-sm ring-1 ring-black/10"
	style:width="{width}px"
	style:height="{CANVAS_HEIGHT * zoom}px"
	aria-hidden="true"
>
	<div
		class="absolute top-0 left-0 origin-top-left"
		style:width="{CANVAS_WIDTH}px"
		style:height="{CANVAS_HEIGHT}px"
		style:transform="scale({zoom})"
	>
		{#each template.elements as element, i (i)}
			<div
				class="absolute overflow-hidden"
				style:left="{element.x}px"
				style:top="{element.y}px"
				style:width="{element.width}px"
				style:height="{element.height}px"
				style:z-index={i}
			>
				{#if element.type === 'text'}
					<div
						class="h-full w-full leading-[normal] whitespace-pre-wrap"
						style:padding="{8 * unit}px"
						style:font-family="{element.fontFamily}, sans-serif"
						style:font-size="{element.fontSize * unit}px"
						style:font-weight={element.fontWeight}
						style:font-style={element.fontStyle}
						style:text-transform={element.textTransform}
						style:text-align={element.textAlign}
						style:color={element.color}
					>
						{element.text}
					</div>
				{:else if element.type === 'shape'}
					<ShapeElementView element={element as unknown as ShapeElement} />
				{/if}
			</div>
		{/each}
	</div>
</div>
