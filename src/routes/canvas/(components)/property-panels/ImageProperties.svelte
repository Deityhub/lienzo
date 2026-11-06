<script lang="ts">
	import { objectFitOptions, borderStyles } from '$lib/const/image';
	import { NumberInput, Select, ColorInput, Input, RangeInput } from '$lib/components';
	import type { ImageElement } from '$lib/types/canvas';
	import type { OnPropertyChange } from './types';

	const { element, onChange }: { element: ImageElement; onChange: OnPropertyChange } = $props();
</script>

<div class="space-y-2">
	<h4 class="font-medium text-foreground">Image Properties</h4>
	<div class="flex flex-col gap-2 max-lg:flex-row">
		<div class="max-lg:min-w-[10rem]">
			<Input
				type="url"
				value={element.src}
				onChange={(value) => onChange('src', value)}
				testId="input-image-src"
				label="Image URL"
				placeholder="https://example.com/image.jpg"
			/>
		</div>
		<div class="max-lg:min-w-[10rem]">
			<Select
				value={element.objectFit || 'contain'}
				onChange={(value) => onChange('objectFit', value)}
				testId="select-object-fit"
				options={[...objectFitOptions]}
				label="Object Fit"
			/>
		</div>
		<div class="max-lg:min-w-[10rem]">
			<RangeInput
				label="Border Radius"
				testId="input-border-radius"
				value={element.borderRadius || 0}
				min={0}
				max={100}
				format={(v) => `${v}%`}
				onChange={(value) => onChange('borderRadius', value)}
			/>
		</div>
		<div class="max-lg:min-w-[10rem]">
			<RangeInput
				label="Opacity"
				testId="input-opacity"
				value={element.opacity || 1}
				min={0}
				max={1}
				step={0.1}
				format={(v) => `${(v * 100).toFixed(0)}%`}
				onChange={(value) => onChange('opacity', value)}
			/>
		</div>
		<div class="max-lg:min-w-[10rem]">
			<ColorInput
				value={element.borderColor || '#000000'}
				onChange={(value) => onChange('borderColor', value)}
				testId="input-border-color"
				label="Border Color"
			/>
		</div>
		<div class="max-lg:min-w-[10rem]">
			<NumberInput
				value={element.borderWidth || 0}
				handleInput={(value) => onChange('borderWidth', value)}
				testId="input-border-width"
				max={20}
				label="Border Width"
			/>
		</div>
		<div class="max-lg:min-w-[10rem]">
			<Select
				value={element.borderStyle || 'solid'}
				onChange={(value) => onChange('borderStyle', value)}
				testId="select-border-style"
				options={[...borderStyles]}
				label="Border Style"
			/>
		</div>
		<div class="max-lg:min-w-[10rem]">
			<Input
				value={element.boxShadow || ''}
				onChange={(value) => onChange('boxShadow', value)}
				testId="input-box-shadow"
				label="Box Shadow"
				placeholder="0px 2px 4px rgba(0,0,0,0.1)"
			/>
		</div>
		<div class="max-lg:min-w-[10rem]">
			<ColorInput
				value={element.backgroundColor || '#ffffff'}
				onChange={(value) => onChange('backgroundColor', value)}
				testId="input-background-color"
				label="Background Color"
			/>
		</div>
	</div>
</div>
