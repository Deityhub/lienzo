<script lang="ts">
	import '../app.css';
	import '$lib/fonts/base.css';

	const { children } = $props();
</script>

<div class="min-h-screen bg-primary/8 text-foreground">
	<main class="min-h-screen">
		{@render children?.()}
	</main>
</div>
