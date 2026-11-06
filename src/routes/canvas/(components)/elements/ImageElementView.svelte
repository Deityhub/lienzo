<script lang="ts">
	import type { ImageElement } from '$lib/types/canvas';
	import { appStore } from '$lib/stores/appStore.svelte.ts';
	import { textScale } from '$lib/utils/viewport';

	const { element }: { element: ImageElement } = $props();
	// Border widths are stored for the full display scale, like text sizes
	const borderWidth = $derived((element.borderWidth || 0) * textScale(appStore.getScale()));

	const backgroundSize = $derived(
		element.objectFit === 'contain'
			? 'contain'
			: element.objectFit === 'cover'
				? 'cover'
				: element.objectFit === 'fill'
					? '100% 100%'
					: 'auto'
	);
</script>

<div
	class="flex h-full w-full items-center justify-center overflow-hidden"
	style:background-color={element.backgroundColor || 'transparent'}
	style:border-radius={`${element.borderRadius || 0}%`}
	style:opacity={element.opacity || 1}
	style:border={`${borderWidth}px ${element.borderStyle || 'solid'} ${element.borderColor || '#000000'}`}
	style:box-shadow={element.boxShadow || ''}
	style:background-image={element.src ? `url(${element.src})` : 'none'}
	style:background-size={backgroundSize}
	style:background-position="center"
	style:background-repeat="no-repeat"
>
	<!-- Hidden img for accessibility and image loading -->
	{#if element.src}
		<img src={element.src} alt={element.alt} style="display: none;" />
	{:else}
		<div class="text-sm text-paper-foreground/60">No image</div>
	{/if}
</div>
