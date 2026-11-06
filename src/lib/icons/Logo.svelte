<script lang="ts">
	import type { SVGAttributes } from 'svelte/elements';

	const { ...props }: SVGAttributes<SVGElement> = $props();
</script>

<!-- The Lienzo layers: brand blue on the light theme, white on the dark theme -->
<svg
	width="32"
	height="32"
	viewBox="1 1 22 22"
	fill="none"
	xmlns="http://www.w3.org/2000/svg"
	class="text-primary dark:text-white"
	aria-hidden="true"
	{...props}
>
	<g stroke="currentColor">
		<path d="M12 2L2 7L12 12L22 7L12 2Z" fill="currentColor" stroke-linejoin="round" />
		<path d="M2 17L12 22L22 17" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
		<path d="M2 12L12 17L22 12" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
	</g>
</svg>
