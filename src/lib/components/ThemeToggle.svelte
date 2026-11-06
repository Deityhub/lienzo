<script lang="ts">
	import { theme } from '$lib/stores/theme.svelte';
	import { Moon, Sun } from '@lucide/svelte';
	import { onMount } from 'svelte';

	const { className = '' }: { className?: string } = $props();

	// The server cannot know the theme, so the state is only reported once the browser has taken over
	let ready = $state(false);
	onMount(() => {
		ready = true;
	});
</script>

<!-- Both icons are always there and CSS shows the right one, so there is nothing to mismatch on hydration -->
<button
	type="button"
	role="switch"
	aria-checked={ready ? theme.isDark : undefined}
	aria-label="Dark theme"
	title="Switch between light and dark theme"
	data-testid="theme-toggle"
	onclick={() => theme.toggle()}
	class="inline-flex h-10 w-10 cursor-pointer items-center justify-center rounded text-foreground transition-colors hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none {className}"
>
	<Sun class="hidden h-5 w-5 dark:block" aria-hidden="true" />
	<Moon class="h-5 w-5 dark:hidden" aria-hidden="true" />
</button>
