<script lang="ts">
	import {
		fontFamilies,
		fontSizes,
		fontWeights,
		fontStyles,
		textDecorations,
		textTransforms,
		textAlignments
	} from '$lib/const/font';
	import { NumberInput, Select, ColorInput, RangeInput } from '$lib/components';
	import type { TextElement } from '$lib/types/canvas';
	import type { OnPropertyChange } from './types';

	const { element, onChange }: { element: TextElement; onChange: OnPropertyChange } = $props();
</script>

<div class="space-y-2">
	<h4 class="font-medium text-foreground">Text Properties</h4>
	<div class="flex flex-col gap-2 max-lg:flex-row">
		<div class="max-lg:min-w-[10rem]">
			<Select
				value={element.fontFamily}
				onChange={(value) => onChange('fontFamily', value)}
				testId="select-font-family"
				options={fontFamilies.map((font) => ({
					value: font,
					label: font,
					fontFamily: font
				}))}
				label="Font Family"
			/>
		</div>
		<div class="max-lg:min-w-[10rem]">
			<NumberInput
				value={element.fontSize}
				handleInput={(value) => onChange('fontSize', value)}
				options={fontSizes.map((size) => ({ label: size.toString(), value: size }))}
				testId="select-font-size"
				label="Font Size"
			/>
		</div>
		<div class="max-lg:min-w-[10rem]">
			<Select
				value={element.fontWeight}
				onChange={(value) => onChange('fontWeight', value)}
				testId="select-font-weight"
				options={[...fontWeights]}
				label="Font Weight"
			/>
		</div>
		<div class="max-lg:min-w-[10rem]">
			<Select
				value={element.fontStyle}
				onChange={(value) => onChange('fontStyle', value)}
				testId="select-font-style"
				options={[...fontStyles]}
				label="Font Style"
			/>
		</div>
		<div class="max-lg:min-w-[10rem]">
			<Select
				value={element.textDecoration || 'none'}
				onChange={(value) => onChange('textDecoration', value)}
				testId="select-text-decoration"
				options={[...textDecorations]}
				label="Text Decoration"
			/>
		</div>
		<div class="max-lg:min-w-[10rem]">
			<Select
				value={element.textTransform || 'none'}
				onChange={(value) => onChange('textTransform', value)}
				testId="select-text-transform"
				options={[...textTransforms]}
				label="Text Transform"
			/>
		</div>
		<div class="max-lg:min-w-[10rem]">
			<ColorInput
				value={element.color}
				onChange={(value) => onChange('color', value)}
				testId="input-color"
				label="Color"
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
		<div class="max-lg:min-w-[10rem]">
			<RangeInput
				label="Background Opacity"
				testId="input-fill-opacity"
				value={element.backgroundOpacity || 0}
				min={0}
				max={1}
				step={0.1}
				format={(v) => `${(v * 100).toFixed(0)}%`}
				onChange={(value) => onChange('backgroundOpacity', value)}
			/>
		</div>
		<div class="max-lg:min-w-[10rem]">
			<Select
				value={element.textAlign || 'left'}
				onChange={(value) => onChange('textAlign', value)}
				testId="select-text-alignment"
				options={[...textAlignments]}
				label="Text Alignment"
			/>
		</div>
	</div>
</div>
