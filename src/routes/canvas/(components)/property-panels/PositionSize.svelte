<script lang="ts">
	import { NumberInput } from '$lib/components';
	import { CANVAS_WIDTH, CANVAS_HEIGHT } from '$lib/const/dimension';
	import type { TCanvasElement, RulerBoundaries } from '$lib/types/canvas';
	import type { OnPropertyChange } from './types';
	import PanelSection from './PanelSection.svelte';

	const {
		element,
		boundaries,
		onChange
	}: {
		element: TCanvasElement;
		boundaries: RulerBoundaries | undefined;
		onChange: OnPropertyChange;
	} = $props();

	const minX = $derived(boundaries ? boundaries.horizontal.start : 0);
	const maxX = $derived(boundaries ? boundaries.horizontal.end : CANVAS_WIDTH);
	const minY = $derived(boundaries ? boundaries.vertical.start : 0);
	const maxY = $derived(boundaries ? boundaries.vertical.end : CANVAS_HEIGHT);
</script>

<PanelSection title="Position and size">
	<div class="grid grid-cols-2 gap-3 max-lg:contents">
		<div class="max-lg:min-w-[10rem]">
			<NumberInput
				value={element.x}
				handleInput={(value) => onChange('x', value)}
				min={minX}
				max={maxX}
				testId="input-x"
				label="X"
			/>
		</div>
		<div class="max-lg:min-w-[10rem]">
			<NumberInput
				value={element.y}
				handleInput={(value) => onChange('y', value)}
				min={minY}
				max={maxY}
				testId="input-y"
				label="Y"
			/>
		</div>
		<div class="max-lg:min-w-[10rem]">
			<NumberInput
				value={element.width}
				handleInput={(value) => onChange('width', value)}
				testId="input-width"
				label="Width"
			/>
		</div>
		<div class="max-lg:min-w-[10rem]">
			<NumberInput
				value={element.height}
				handleInput={(value) => onChange('height', value)}
				testId="input-height"
				label="Height"
			/>
		</div>
	</div>
</PanelSection>
