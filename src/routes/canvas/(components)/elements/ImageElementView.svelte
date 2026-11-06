<script lang="ts">
	import type { ImageElement } from '$lib/types/canvas';

	const { element }: { element: ImageElement } = $props();

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
	style:border={`${element.borderWidth || 0}px ${element.borderStyle || 'solid'} ${element.borderColor || '#000000'}`}
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
		<div class="text-sm text-muted-foreground">No image</div>
	{/if}
</div>
