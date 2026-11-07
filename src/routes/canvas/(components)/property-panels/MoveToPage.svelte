<script lang="ts">
	import Select from '$lib/components/Select.svelte';
	import { appStore } from '$lib/stores/appStore.svelte.ts';
	import PanelSection from './PanelSection.svelte';

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
	<PanelSection title="Move to page">
		<Select
			value=""
			{options}
			placeholder="Choose a page"
			testId="move-to-page"
			onChange={moveTo}
		/>
	</PanelSection>
{/if}
