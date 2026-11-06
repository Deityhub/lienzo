<script lang="ts">
	import '../app.css';
	import '$lib/fonts/base.css';
	import { theme } from '$lib/stores/theme.svelte';
	import { onMount } from 'svelte';

	const { children } = $props();

	// Follow the system theme until the user picks one with the switch
	onMount(() => theme.init());
</script>

<div class="min-h-screen bg-surface text-foreground">
	<main class="min-h-screen">
		{@render children?.()}
	</main>
</div>
