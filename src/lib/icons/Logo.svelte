<script lang="ts">
	import type { SVGAttributes } from 'svelte/elements';

	const { ...props }: SVGAttributes<SVGElement> = $props();
</script>

<!-- The Lienzo layers mark in white, on a rounded brand-blue tile -->
<svg
	width="32"
	height="32"
	viewBox="0 0 32 32"
	fill="none"
	xmlns="http://www.w3.org/2000/svg"
	aria-hidden="true"
	{...props}
>
	<rect width="32" height="32" rx="8" class="fill-primary" />
	<g transform="translate(5 5)" class="stroke-primary-foreground">
		<path d="M12 2L2 7L12 12L22 7L12 2Z" class="fill-primary-foreground" stroke-linejoin="round" />
		<path d="M2 17L12 22L22 17" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
		<path d="M2 12L12 17L22 12" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
	</g>
</svg>
