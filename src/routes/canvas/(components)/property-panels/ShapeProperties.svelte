<script lang="ts">
	import { shapeTypes, strokeStyles } from '$lib/const/shape';
	import { NumberInput, Select, ColorInput, RangeInput, SegmentedControl } from '$lib/components';
	import type { ShapeElement } from '$lib/types/canvas';
	import type { OnPropertyChange } from './types';
	import PanelSection from './PanelSection.svelte';

	const { element, onChange }: { element: ShapeElement; onChange: OnPropertyChange } = $props();

	const percent = (v: number) => `${(v * 100).toFixed(0)}%`;
</script>

<PanelSection title="Shape">
	<div class="max-lg:min-w-[10rem]">
		<Select
			value={element.shapeType}
			onChange={(value) => onChange('shapeType', value)}
			testId="select-shape-type"
			options={[...shapeTypes]}
			label="Shape Type"
		/>
	</div>
	{#if element.shapeType === 'rectangle'}
		<div class="max-lg:min-w-[10rem]">
			<RangeInput
				label="Corner Radius"
				testId="input-corner-radius"
				value={element.cornerRadius || 0}
				min={0}
				max={100}
				format={(v) => `${v}%`}
				onChange={(value) => onChange('cornerRadius', value)}
			/>
		</div>
	{/if}
	<div class="max-lg:min-w-[10rem]">
		<RangeInput
			label="Rotation"
			testId="input-rotation"
			value={element.rotation || 0}
			min={0}
			max={360}
			format={(v) => `${v}°`}
			onChange={(value) => onChange('rotation', value)}
		/>
	</div>
</PanelSection>

<PanelSection title="Stroke">
	<div class="grid grid-cols-2 gap-3 max-lg:contents">
		<div class="max-lg:min-w-[10rem]">
			<ColorInput
				value={element.strokeColor}
				onChange={(value) => onChange('strokeColor', value)}
				testId="input-stroke-color"
				label="Colour"
			/>
		</div>
		<div class="max-lg:min-w-[10rem]">
			<NumberInput
				value={element.strokeWidth}
				handleInput={(value) => onChange('strokeWidth', value)}
				testId="input-stroke-weight"
				label="Weight"
			/>
		</div>
	</div>
	<div class="max-lg:min-w-[10rem]">
		<SegmentedControl
			value={element.strokeStyle || 'solid'}
			onChange={(value) => onChange('strokeStyle', value)}
			testId="select-stroke-style"
			options={strokeStyles}
			label="Style"
		/>
	</div>
	<div class="max-lg:min-w-[10rem]">
		<RangeInput
			label="Stroke opacity"
			testId="input-stroke-opacity"
			value={element.strokeOpacity || 1}
			min={0}
			max={1}
			step={0.1}
			format={percent}
			onChange={(value) => onChange('strokeOpacity', value)}
		/>
	</div>
</PanelSection>

<PanelSection title="Fill">
	<div class="max-lg:min-w-[10rem]">
		<ColorInput
			value={element.fillColor || '#ffffff'}
			onChange={(value) => onChange('fillColor', value)}
			testId="input-fill-color"
			label="Colour"
		/>
	</div>
	<div class="max-lg:min-w-[10rem]">
		<RangeInput
			label="Fill opacity"
			testId="input-fill-opacity"
			value={element.fillOpacity || 0}
			min={0}
			max={1}
			step={0.1}
			format={percent}
			onChange={(value) => onChange('fillOpacity', value)}
		/>
	</div>
</PanelSection>
