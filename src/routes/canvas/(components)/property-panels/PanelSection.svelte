<script lang="ts">
	import type { Snippet } from 'svelte';

	interface Props {
		title: string;
		children: Snippet;
	}

	const { title, children }: Props = $props();
</script>

<!-- A titled block. On a phone its controls make one row to scroll along, so each group is a row of the sheet -->
<section class="border-b border-border py-4 max-lg:py-3">
	<h3 class="mb-3 text-sm leading-5 font-semibold text-foreground max-lg:mb-2">{title}</h3>
	<div
		class="flex flex-col gap-3 max-lg:flex-row max-lg:items-end max-lg:overflow-x-auto max-lg:pb-1 max-lg:[&>*]:shrink-0"
	>
		{@render children()}
	</div>
</section>
