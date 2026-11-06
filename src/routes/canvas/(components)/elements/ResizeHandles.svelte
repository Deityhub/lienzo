<script lang="ts">
	import type { ResizeDirection } from '$lib/types/canvas';

	interface Props {
		onResize: (event: MouseEvent | PointerEvent | TouchEvent, direction: ResizeDirection) => void;
	}

	const { onResize }: Props = $props();

	// Edge handles for width and height
	const edgeHandles: Array<{ direction: ResizeDirection; class: string; style: string }> = [
		{
			direction: 'n',
			class: 'top-0 left-1/2 -translate-x-1/2 cursor-n-resize w-[50%] max-w-[60px]',
			style: 'height: 2px;'
		},
		{
			direction: 's',
			class: 'bottom-0 left-1/2 -translate-x-1/2 cursor-s-resize w-[50%] max-w-[60px]',
			style: 'height: 2px;'
		},
		{
			direction: 'e',
			class: 'right-0 top-1/2 -translate-y-1/2 cursor-e-resize h-[50%] max-h-[60px]',
			style: 'width: 2px;'
		},
		{
			direction: 'w',
			class: 'left-0 top-1/2 -translate-y-1/2 cursor-w-resize h-[50%] max-h-[60px]',
			style: 'width: 2px;'
		}
	];

	// Corner handles for proportional resize
	const cornerHandles: Array<{ direction: ResizeDirection; class: string }> = [
		{ direction: 'nw', class: 'top-0 left-0 cursor-nw-resize' },
		{ direction: 'ne', class: 'top-0 right-0 cursor-ne-resize' },
		{ direction: 'sw', class: 'bottom-0 left-0 cursor-sw-resize' },
		{ direction: 'se', class: 'bottom-0 right-0 cursor-se-resize' }
	];
</script>

<!-- Edge handles for width/height resize -->
{#each edgeHandles as handle (handle.direction)}
	<div
		class="absolute bg-primary transition-colors {handle.class}"
		style={handle.style}
		style:touch-action="none"
		onpointerdown={(e) => {
			e.preventDefault();
			e.stopPropagation();
			onResize(e, handle.direction);
		}}
		ontouchstart={(e) => {
			e.stopPropagation();
			onResize(e, handle.direction);
		}}
		role="button"
		tabindex="0"
		onkeydown={null}
		data-testid={`resize-handle-${handle.direction}`}
	></div>
{/each}

<!-- Corner handles for proportional resize -->
{#each cornerHandles as handle (handle.direction)}
	<div
		class="absolute h-3 w-3 rounded-full border-2 border-primary-foreground bg-primary shadow-md transition-colors {handle.class}"
		style:touch-action="none"
		onpointerdown={(e) => {
			e.preventDefault();
			e.stopPropagation();
			onResize(e, handle.direction);
		}}
		ontouchstart={(e) => {
			e.stopPropagation();
			onResize(e, handle.direction);
		}}
		role="button"
		tabindex="0"
		onkeydown={null}
		data-testid={`resize-handle-${handle.direction}`}
	></div>
{/each}
