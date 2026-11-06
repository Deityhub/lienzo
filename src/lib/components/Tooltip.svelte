<script lang="ts">
	import { type Snippet } from 'svelte';

	type TooltipProps = {
		content: string;
		placement?: 'top' | 'bottom' | 'left' | 'right';
		className?: string;
		children: Snippet;
	};

	const { content, placement = 'top', className = '', children }: TooltipProps = $props();

	let open = $state(false);

	const positionClasses = $derived(
		placement === 'top'
			? 'bottom-full left-1/2 -translate-x-1/2 mb-2'
			: placement === 'bottom'
				? 'top-full left-1/2 -translate-x-1/2 mt-2'
				: placement === 'left'
					? 'right-full top-1/2 -translate-y-1/2 mr-2'
					: 'left-full top-1/2 -translate-y-1/2 ml-2'
	);

	function onEnter() {
		open = true;
	}
	function onLeave() {
		open = false;
	}
</script>

<div
	class={`relative inline-block ${className}`}
	role="group"
	onmouseenter={onEnter}
	onmouseleave={onLeave}
	onfocusin={onEnter}
	onfocusout={onLeave}
>
	{@render children?.()}
	{#if open}
		<div
			role="tooltip"
			class={`pointer-events-none absolute z-50 rounded-md bg-primary px-2 py-1 text-xs whitespace-nowrap text-primary-foreground shadow ${positionClasses}`}
		>
			{content}
		</div>
	{/if}
</div>
