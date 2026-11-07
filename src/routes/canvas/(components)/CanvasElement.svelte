<script lang="ts">
	import type { TCanvasElement, ResizeDirection } from '$lib/types/canvas';
	import TextElementView from './elements/TextElementView.svelte';
	import ShapeElementView from './elements/ShapeElementView.svelte';
	import ImageElementView from './elements/ImageElementView.svelte';
	import ResizeHandles from './elements/ResizeHandles.svelte';

	interface Props {
		element: TCanvasElement;
		isSelected: boolean;
		onResize: (event: MouseEvent | PointerEvent | TouchEvent, direction: ResizeDirection) => void;
	}

	const { element, isSelected, onResize }: Props = $props();
</script>

<div class="relative h-full w-full" style:z-index={element.zIndex || 0}>
	{#if element.type === 'text'}
		<TextElementView {element} />
	{:else if element.type === 'shape'}
		<ShapeElementView {element} />
	{:else if element.type === 'image'}
		<ImageElementView {element} />
	{/if}

	<!-- Resize handles (only show when selected) -->
	{#if isSelected}
		<ResizeHandles {onResize} />
	{/if}
</div>
