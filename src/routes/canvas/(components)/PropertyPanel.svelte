<script lang="ts">
	import { appStore } from '$lib/stores/appStore.svelte.ts';
	import { slide } from 'svelte/transition';
	import Button from '$lib/components/Button.svelte';
	import { ChevronUp, Group, Trash2, Ungroup } from '@lucide/svelte';
	import PositionSize from './property-panels/PositionSize.svelte';
	import Layering from './property-panels/Layering.svelte';
	import MoveToPage from './property-panels/MoveToPage.svelte';
	import ClipboardActions from './property-panels/ClipboardActions.svelte';
	import TextProperties from './property-panels/TextProperties.svelte';
	import ShapeProperties from './property-panels/ShapeProperties.svelte';
	import ImageProperties from './property-panels/ImageProperties.svelte';

	const selectedElement = $derived(appStore.getSelectedElement());
	const selectedElements = $derived(appStore.getSelectedElements());
	// Everything selected is one group
	const isOneGroup = $derived(
		selectedElements.length > 1 &&
			selectedElements.every((el) => el.groupId && el.groupId === selectedElements[0].groupId)
	);
	const hasGroups = $derived(selectedElements.some((el) => el.groupId));
	// On a phone the panel is a sheet at the bottom: just its title until it is opened
	let expanded = $state(false);
	const body = $derived(expanded ? '' : 'max-lg:hidden');
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

{#snippet header(title: string)}
	<div class="flex items-center justify-between gap-2 border-b border-border max-lg:py-2 lg:pb-4">
		<h3
			class="text-base leading-6 font-semibold text-foreground"
			data-testid="property-panel-title"
		>
			{title}
		</h3>
		<button
			type="button"
			class="inline-flex h-11 w-11 cursor-pointer items-center justify-center rounded text-foreground hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none lg:hidden"
			aria-expanded={expanded}
			aria-label={expanded ? 'Hide properties' : 'Show properties'}
			data-testid="property-panel-toggle"
			onclick={() => (expanded = !expanded)}
		>
			<ChevronUp
				class="h-5 w-5 transition-transform {expanded ? 'rotate-180' : ''}"
				aria-hidden="true"
			/>
		</button>
	</div>
{/snippet}

{#if selectedElement || selectedElements.length > 1}
	<!-- One panel for one or several selected elements, so it does not slide out and in when the selection changes -->
	<div
		transition:slide={{ duration: 300, axis: 'x' }}
		class="w-80 overflow-y-auto border-l border-border bg-background px-5 pb-2 max-lg:absolute max-lg:bottom-0 max-lg:left-0 max-lg:z-9999 max-lg:max-h-[55vh] max-lg:w-full max-lg:rounded-t-xl max-lg:border-t max-lg:border-l-0 max-lg:px-4 max-lg:shadow-[0_-8px_24px_rgba(0,0,0,0.18)] lg:pt-30"
		data-testid="property-panel"
	>
		{#if selectedElement}
			{@render header(
				`${selectedElement.type.charAt(0).toUpperCase() + selectedElement.type.slice(1)} Properties`
			)}
			<div class={body}>
				<PositionSize
					element={selectedElement}
					boundaries={currentPage?.boundaries}
					onChange={handlePropertyChange}
				/>
				<Layering element={selectedElement} />
				<ClipboardActions />
				<MoveToPage />

				{#if selectedElement.type === 'text'}
					<TextProperties element={selectedElement} onChange={handlePropertyChange} />
				{:else if selectedElement.type === 'shape'}
					<ShapeProperties element={selectedElement} onChange={handlePropertyChange} />
				{:else if selectedElement.type === 'image'}
					<ImageProperties element={selectedElement} onChange={handlePropertyChange} />
				{/if}

				<!-- Delete Button -->
				<div class="py-4">
					<Button
						data-testid="delete-element-btn"
						onClick={() => appStore.deleteElement(selectedElement.id, selectedElement.pageId)}
						variant="secondary-destructive"
						fullWidth
					>
						<Trash2 class="mr-2 h-4 w-4" />
						Delete Element
					</Button>
				</div>
			</div>
		{:else}
			{@render header(
				`${isOneGroup ? 'Group of' : ''} ${selectedElements.length} ${isOneGroup ? 'elements' : 'elements selected'}`.trim()
			)}
			<div class="flex flex-col gap-4 pt-4 {body}">
				<p class="text-sm text-muted-foreground">
					{isOneGroup
						? 'They are selected and moved together until you ungroup them.'
						: 'Drag any of them to move them together, or group them to keep them together.'}
				</p>
				<div class="flex flex-wrap gap-2">
					{#if !isOneGroup}
						<Button
							data-testid="group-btn"
							onClick={() => appStore.groupSelected()}
							variant="primary"
							className="flex-1"
						>
							<Group class="mr-2 h-4 w-4" />
							Group
						</Button>
					{/if}
					{#if hasGroups}
						<Button
							data-testid="ungroup-btn"
							onClick={() => appStore.ungroupSelected()}
							variant="secondary"
							className="flex-1"
						>
							<Ungroup class="mr-2 h-4 w-4" />
							Ungroup
						</Button>
					{/if}
				</div>
				<div>
					<ClipboardActions />
					<MoveToPage />
				</div>
				<Button
					data-testid="delete-selected-btn"
					onClick={() =>
						appStore.deleteElements(
							selectedElements.map((el) => el.id),
							selectedElements[0].pageId
						)}
					variant="secondary-destructive"
					fullWidth
				>
					<Trash2 class="mr-2 h-4 w-4" />
					Delete {selectedElements.length} elements
				</Button>
			</div>
		{/if}
	</div>
{/if}
