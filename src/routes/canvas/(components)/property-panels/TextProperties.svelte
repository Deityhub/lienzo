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
	import { NumberInput, Select, ColorInput, RangeInput, SegmentedControl } from '$lib/components';
	import type { TextElement } from '$lib/types/canvas';
	import type { OnPropertyChange } from './types';
	import PanelSection from './PanelSection.svelte';

	const { element, onChange }: { element: TextElement; onChange: OnPropertyChange } = $props();

	// Short labels for the buttons; the full names are spoken
	const decorations = textDecorations.map((d) => ({
		value: d.value,
		label: { none: 'None', underline: 'Under', overline: 'Over', 'line-through': 'Strike' }[
			d.value
		]!,
		title: d.label
	}));
	const transforms = textTransforms.map((t) => ({
		value: t.value,
		label: { none: 'None', uppercase: 'ABC', lowercase: 'abc', capitalize: 'Abc' }[t.value]!,
		title: t.label
	}));
</script>

<PanelSection title="Font">
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
	<div class="grid grid-cols-2 gap-3 max-lg:contents">
		<div class="max-lg:min-w-[10rem]">
			<Select
				value={element.fontWeight}
				onChange={(value) => onChange('fontWeight', value)}
				testId="select-font-weight"
				options={[...fontWeights]}
				label="Weight"
			/>
		</div>
		<div class="max-lg:min-w-[10rem]">
			<NumberInput
				value={element.fontSize}
				handleInput={(value) => onChange('fontSize', value)}
				options={fontSizes.map((size) => ({ label: size.toString(), value: size }))}
				testId="select-font-size"
				label="Size"
			/>
		</div>
	</div>
	<div class="max-lg:min-w-[10rem]">
		<SegmentedControl
			value={element.fontStyle}
			onChange={(value) => onChange('fontStyle', value)}
			testId="select-font-style"
			options={fontStyles}
			label="Style"
		/>
	</div>
</PanelSection>

<PanelSection title="Paragraph">
	<div class="max-lg:min-w-[14rem]">
		<SegmentedControl
			value={element.textAlign || 'left'}
			onChange={(value) => onChange('textAlign', value)}
			testId="select-text-alignment"
			options={textAlignments}
			label="Alignment"
		/>
	</div>
	<div class="max-lg:min-w-[14rem]">
		<SegmentedControl
			value={element.textDecoration || 'none'}
			onChange={(value) => onChange('textDecoration', value)}
			testId="select-text-decoration"
			options={decorations}
			label="Decoration"
		/>
	</div>
	<div class="max-lg:min-w-[14rem]">
		<SegmentedControl
			value={element.textTransform || 'none'}
			onChange={(value) => onChange('textTransform', value)}
			testId="select-text-transform"
			options={transforms}
			label="Capitalisation"
		/>
	</div>
</PanelSection>

<PanelSection title="Colour">
	<div class="grid grid-cols-2 gap-3 max-lg:contents">
		<div class="max-lg:min-w-[10rem]">
			<ColorInput
				value={element.color}
				onChange={(value) => onChange('color', value)}
				testId="input-color"
				label="Text"
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
	</div>
	<div class="max-lg:min-w-[10rem]">
		<RangeInput
			label="Background opacity"
			testId="input-fill-opacity"
			value={element.backgroundOpacity || 0}
			min={0}
			max={1}
			step={0.1}
			format={(v) => `${(v * 100).toFixed(0)}%`}
			onChange={(value) => onChange('backgroundOpacity', value)}
		/>
	</div>
</PanelSection>
