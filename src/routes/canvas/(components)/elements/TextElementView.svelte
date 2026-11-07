<script lang="ts">
	import type { TextElement } from '$lib/types/canvas';
	import { appStore } from '$lib/stores/appStore.svelte.ts';
	import { textScale } from '$lib/utils/viewport';

	const { element }: { element: TextElement } = $props();
	const scale = $derived(appStore.getScale());
	const textFactor = $derived(textScale(scale));

	// Local copy of the text for two-way binding; it resets whenever the element's text changes
	let textContent = $derived(element.text);

	function handleInput(e: Event) {
		const target = e.target as HTMLTextAreaElement;
		const actualElementHeight = element.height * scale;

		// Use requestAnimationFrame to batch the updates
		requestAnimationFrame(() => {
			// Reset height to auto to get the correct scrollHeight
			target.style.height = 'auto';
			const scrollHeight = target.scrollHeight;

			// Only update if the content is larger than current height
			if (scrollHeight > actualElementHeight) {
				// Add a small buffer to prevent jitter
				const newHeight = Math.min(scrollHeight + 2, actualElementHeight * 2); // Limit max height to 2x original

				// Update the element height in the store
				appStore.updateElement({
					elementId: element.id,
					updates: {
						text: textContent,
						height: newHeight / scale
					},
					pageId: element.pageId
				});

				// Set the height directly to prevent layout shift
				target.style.height = `${newHeight}px`;
			} else {
				// Update just the text if height doesn't change
				appStore.updateElement({
					elementId: element.id,
					updates: { text: textContent },
					pageId: element.pageId
				});
			}
		});
	}
</script>

<div class="relative h-full w-full overflow-hidden">
	<textarea
		class="absolute inset-0 h-auto min-h-full w-full cursor-move resize-none overflow-hidden border-none focus:outline-none"
		style:font-family="{element.fontFamily}, sans-serif"
		style:padding="{8 * textFactor}px"
		style:font-size="{element.fontSize * textFactor}px"
		style:font-weight={element.fontWeight}
		style:font-style={element.fontStyle}
		style:text-decoration={element.textDecoration}
		style:text-transform={element.textTransform}
		style:text-align={element.textAlign || 'left'}
		style:color={element.color}
		style:background-color={element.backgroundColor
			? `${element.backgroundColor}${Math.round((element.backgroundOpacity ?? 1) * 255)
					.toString(16)
					.padStart(2, '0')}`
			: 'transparent'}
		bind:value={textContent}
		id={`text-element-${element.id}`}
		oninput={handleInput}
	></textarea>
</div>
