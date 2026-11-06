<script lang="ts">
	import Select from '$lib/components/Select.svelte';
	import { appStore } from '$lib/stores/appStore.svelte.ts';

	const selected = $derived(appStore.getSelectedElements());
	const pageIds = $derived(Object.keys(appStore.getPages()));
	// The Select always shows an option, so the first one stands in for "nothing chosen"
	const options = $derived([
		{ value: '', label: 'Choose a page' },
		...pageIds
			.map((id, index) => ({ value: id, label: `Page ${index + 1}` }))
			.filter((option) => option.value !== selected[0]?.pageId)
	]);

	function moveTo(pageId: string) {
		if (!pageId) return;
		appStore.moveSelectedToPage(pageId);
		// Show where it went
		requestAnimationFrame(() =>
			document
				.getElementById(`canvas-${pageId}`)
				?.scrollIntoView({ block: 'center', behavior: 'smooth' })
		);
	}
</script>

{#if pageIds.length > 1 && selected.length}
	<div class="space-y-2">
		<h4 class="font-medium text-foreground">Move to Page</h4>
		<Select
			value=""
			{options}
			placeholder="Choose a page"
			testId="move-to-page"
			onChange={moveTo}
		/>
	</div>
{/if}
