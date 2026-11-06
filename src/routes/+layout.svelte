<script lang="ts">
	import '../app.css';
	import '$lib/fonts/base.css';
	import { theme } from '$lib/stores/theme.svelte';
	import { onMount } from 'svelte';
	import { page } from '$app/state';

	const { children } = $props();

	// Follow the system theme until the user picks one with the switch
	onMount(() => theme.init());
</script>

<div class="min-h-screen bg-surface text-foreground">
	<!-- The home page has its own header, main and footer landmarks; the other pages are one main region -->
	<svelte:element this={page.url.pathname === '/' ? 'div' : 'main'} class="min-h-screen">
		{@render children?.()}
	</svelte:element>
</div>
