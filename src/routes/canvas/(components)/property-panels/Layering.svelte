<script lang="ts">
	import Button from '$lib/components/Button.svelte';
	import { appStore } from '$lib/stores/appStore.svelte.ts';
	import type { TCanvasElement } from '$lib/types/canvas';
	import PanelSection from './PanelSection.svelte';

	const { element }: { element: TCanvasElement } = $props();
</script>

<PanelSection title="Layering">
	<div class="flex items-center gap-2">
		<span class="text-background-foreground block text-sm">Z-Index Layer: {element.zIndex}</span>
	</div>
	<div class="flex gap-2">
		<Button
			data-testid="bring-forward-btn"
			onClick={() => appStore.moveForward(element.id, element.pageId)}
			size="xs"
			disabled={element.zIndex >= appStore.getPageElements(element.pageId).length - 1}
			className="max-lg:min-w-[8rem]"
		>
			Move Forward
		</Button>
		<Button
			data-testid="send-backward-btn"
			onClick={() => appStore.moveBackward(element.id, element.pageId)}
			size="xs"
			disabled={element.zIndex <= 0}
			className="max-lg:min-w-[8rem]"
		>
			Move Backward
		</Button>
	</div>
</PanelSection>
