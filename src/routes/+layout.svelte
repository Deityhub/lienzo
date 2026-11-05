<script lang="ts">
	import '../app.css';

	const { children } = $props();
</script>

<svelte:head>
	<link rel="stylesheet" href="/fonts/fonts.css" />
</svelte:head>

<div class="min-h-screen bg-primary/8 text-foreground">
	<main class="min-h-screen">
		{@render children?.()}
	</main>
</div>
