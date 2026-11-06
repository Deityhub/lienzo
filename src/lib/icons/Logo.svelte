<script lang="ts">
	import type { SVGAttributes } from 'svelte/elements';

	const { ...props }: SVGAttributes<SVGElement> = $props();
</script>

<!-- Two stacked A4 pages: the front one carries text lines, the back one is a tint of the brand -->
<svg
	width="32"
	height="32"
	viewBox="0 0 32 32"
	fill="none"
	xmlns="http://www.w3.org/2000/svg"
	aria-hidden="true"
	{...props}
>
	<rect x="3" y="7" width="18" height="22" rx="3" class="fill-primary/40" />
	<rect x="9" y="3" width="18" height="22" rx="3" class="fill-primary" />
	<path
		d="M14 11h8M14 15h8M14 19h5"
		class="stroke-primary-foreground"
		stroke-width="2"
		stroke-linecap="round"
	/>
</svg>
