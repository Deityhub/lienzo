<script lang="ts">
	import { objectFitOptions, borderStyles } from '$lib/const/image';
	import {
		NumberInput,
		Select,
		ColorInput,
		Input,
		RangeInput,
		SegmentedControl
	} from '$lib/components';
	import type { ImageElement } from '$lib/types/canvas';
	import type { OnPropertyChange } from './types';
	import PanelSection from './PanelSection.svelte';

	const { element, onChange }: { element: ImageElement; onChange: OnPropertyChange } = $props();
</script>

<PanelSection title="Image">
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
</PanelSection>

<PanelSection title="Border">
	<div class="grid grid-cols-2 gap-3 max-lg:contents">
		<div class="max-lg:min-w-[10rem]">
			<ColorInput
				value={element.borderColor || '#000000'}
				onChange={(value) => onChange('borderColor', value)}
				testId="input-border-color"
				label="Colour"
			/>
		</div>
		<div class="max-lg:min-w-[10rem]">
			<NumberInput
				value={element.borderWidth || 0}
				handleInput={(value) => onChange('borderWidth', value)}
				testId="input-border-width"
				max={20}
				label="Width"
			/>
		</div>
	</div>
	<div class="max-lg:min-w-[10rem]">
		<SegmentedControl
			value={element.borderStyle || 'solid'}
			onChange={(value) => onChange('borderStyle', value)}
			testId="select-border-style"
			options={borderStyles}
			label="Style"
		/>
	</div>
	<div class="max-lg:min-w-[10rem]">
		<RangeInput
			label="Border radius"
			testId="input-border-radius"
			value={element.borderRadius || 0}
			min={0}
			max={100}
			format={(v) => `${v}%`}
			onChange={(value) => onChange('borderRadius', value)}
		/>
	</div>
</PanelSection>

<PanelSection title="Appearance">
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
			value={element.backgroundColor || '#ffffff'}
			onChange={(value) => onChange('backgroundColor', value)}
			testId="input-background-color"
			label="Background"
		/>
	</div>
	<div class="max-lg:min-w-[10rem]">
		<Input
			value={element.boxShadow || ''}
			onChange={(value) => onChange('boxShadow', value)}
			testId="input-box-shadow"
			label="Box shadow"
			placeholder="0px 2px 4px rgba(0,0,0,0.1)"
		/>
	</div>
</PanelSection>
