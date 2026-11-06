<script lang="ts">
	import { shapeTypes, strokeStyles } from '$lib/const/shape';
	import { NumberInput, Select, ColorInput, RangeInput } from '$lib/components';
	import type { ShapeElement } from '$lib/types/canvas';
	import type { OnPropertyChange } from './types';

	const { element, onChange }: { element: ShapeElement; onChange: OnPropertyChange } = $props();
</script>

<div class="space-y-2">
	<h4 class="font-medium text-foreground">Shape Properties</h4>
	<div class="flex flex-col gap-2 max-lg:flex-row">
		<div class="max-lg:min-w-[10rem]">
			<Select
				value={element.shapeType}
				onChange={(value) => onChange('shapeType', value)}
				testId="select-shape-type"
				options={[...shapeTypes]}
				label="Shape Type"
			/>
		</div>
		<div class="max-lg:min-w-[10rem]">
			<ColorInput
				value={element.strokeColor}
				onChange={(value) => onChange('strokeColor', value)}
				testId="input-stroke-color"
				label="Stroke Color"
			/>
		</div>
		<div class="max-lg:min-w-[10rem]">
			<span class="text-background-foreground block text-sm">Stroke Weight</span>
			<NumberInput
				value={element.strokeWidth}
				handleInput={(value) => onChange('strokeWidth', value)}
				testId="input-stroke-weight"
			/>
		</div>
		<div class="max-lg:min-w-[10rem]">
			<Select
				value={element.strokeStyle || 'solid'}
				onChange={(value) => onChange('strokeStyle', value)}
				testId="select-stroke-style"
				options={[...strokeStyles]}
				label="Stroke Style"
			/>
		</div>
		<div class="max-lg:min-w-[10rem]">
			<RangeInput
				label="Stroke Opacity"
				testId="input-stroke-opacity"
				value={element.strokeOpacity || 1}
				min={0}
				max={1}
				step={0.1}
				format={(v) => `${(v * 100).toFixed(0)}%`}
				onChange={(value) => onChange('strokeOpacity', value)}
			/>
		</div>
		<div class="max-lg:min-w-[10rem]">
			<ColorInput
				value={element.fillColor || '#ffffff'}
				onChange={(value) => onChange('fillColor', value)}
				testId="input-fill-color"
				label="Fill Color"
			/>
		</div>
		<div class="max-lg:min-w-[10rem]">
			<RangeInput
				label="Fill Opacity"
				testId="input-fill-opacity"
				value={element.fillOpacity || 0}
				min={0}
				max={1}
				step={0.1}
				format={(v) => `${(v * 100).toFixed(0)}%`}
				onChange={(value) => onChange('fillOpacity', value)}
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
	</div>
</div>
