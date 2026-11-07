<script lang="ts">
	import { theme, type ThemePreference } from '$lib/stores/theme.svelte';
	import { Monitor, Moon, Sun } from '@lucide/svelte';
	import { onMount } from 'svelte';

	const { className = '' }: { className?: string } = $props();

	// The server cannot know the choice, so it is only reported once the browser has taken over
	let ready = $state(false);
	onMount(() => {
		ready = true;
	});

	const order: ThemePreference[] = ['system', 'light', 'dark'];
	const label: Record<ThemePreference, string> = {
		system: 'System',
		light: 'Light',
		dark: 'Dark'
	};
	const current = $derived(ready ? theme.preference : 'system');
	const next = $derived(order[(order.indexOf(current) + 1) % order.length]);
</script>

<!-- One icon for the current choice; each click moves to the next: System, Light, Dark -->
<button
	type="button"
	aria-label="Theme: {label[current]}. Switch to {label[next]}"
	title="Theme: {label[current]}. Click to switch to {label[next]}"
	data-testid="theme-toggle"
	data-theme-preference={current}
	onclick={() => theme.set(next)}
	class="inline-flex h-10 w-10 cursor-pointer items-center justify-center rounded text-foreground transition-colors hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none {className}"
>
	{#if current === 'light'}
		<Sun class="h-5 w-5" aria-hidden="true" />
	{:else if current === 'dark'}
		<Moon class="h-5 w-5" aria-hidden="true" />
	{:else}
		<Monitor class="h-5 w-5" aria-hidden="true" />
	{/if}
</button>
