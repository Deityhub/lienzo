<script lang="ts">
	import { appStore } from '$lib/stores/appStore.svelte.ts';
	import { slide } from 'svelte/transition';
	import Button from '$lib/components/Button.svelte';
	import { Trash2 } from '@lucide/svelte';
	import PositionSize from './property-panels/PositionSize.svelte';
	import Layering from './property-panels/Layering.svelte';
	import TextProperties from './property-panels/TextProperties.svelte';
	import ShapeProperties from './property-panels/ShapeProperties.svelte';
	import ImageProperties from './property-panels/ImageProperties.svelte';

	const selectedElement = $derived(appStore.getSelectedElement());
	const pages = $derived(appStore.getPages());
	const currentPage = $derived(selectedElement ? pages[selectedElement.pageId] : undefined);

	function handlePropertyChange(property: string, value: string | number) {
		if (!selectedElement) return;

		appStore.updateElement({
			elementId: selectedElement.id,
			updates: { [property]: value },
			pageId: selectedElement.pageId
		});
	}
</script>

{#if selectedElement}
	<div
		transition:slide={{ duration: 300, axis: 'x' }}
		class="w-80 overflow-y-auto border-l border-border bg-background p-4 max-lg:absolute max-lg:bottom-0 max-lg:left-0 max-lg:z-9999 max-lg:h-[15vh] max-lg:w-full max-lg:overflow-y-hidden lg:pt-30"
		data-testid="property-panel"
	>
		<div class="mb-6 space-y-4 max-lg:flex max-lg:items-center max-lg:gap-2">
			<h3
				class="mb-4 text-lg font-semibold text-foreground max-lg:hidden"
				data-testid="property-panel-title"
			>
				{selectedElement.type.charAt(0).toUpperCase() + selectedElement.type.slice(1)} Properties
			</h3>

			<PositionSize
				element={selectedElement}
				boundaries={currentPage?.boundaries}
				onChange={handlePropertyChange}
			/>
			<Layering element={selectedElement} />

			{#if selectedElement.type === 'text'}
				<TextProperties element={selectedElement} onChange={handlePropertyChange} />
			{:else if selectedElement.type === 'shape'}
				<ShapeProperties element={selectedElement} onChange={handlePropertyChange} />
			{:else if selectedElement.type === 'image'}
				<ImageProperties element={selectedElement} onChange={handlePropertyChange} />
			{/if}

			<!-- Delete Button -->
			<div class="pt-4">
				<Button
					data-testid="delete-element-btn"
					onClick={() => appStore.deleteElement(selectedElement.id, selectedElement.pageId)}
					variant="destructive"
					fullWidth
					className="max-lg:min-w-[12rem]"
				>
					<Trash2 class="mr-2 h-4 w-4" />
					Delete Element
				</Button>
			</div>
		</div>
	</div>
{/if}
