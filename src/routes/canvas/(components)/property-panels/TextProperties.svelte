<script lang="ts">
	import { uuidv4 } from '$lib/utils/uuid';
	import { linkRangeStore } from '$lib/stores/linkRange.svelte.ts';
	import { DEFAULT_LINK_COLOR } from '$lib/types/canvas';
	import {
		fontFamilies,
		fontSizes,
		fontWeights,
		fontStyles,
		textDecorations,
		textTransforms,
		textAlignments
	} from '$lib/const/font';
	import {
		Button,
		Input,
		NumberInput,
		Select,
		ColorInput,
		RangeInput,
		SegmentedControl
	} from '$lib/components';
	import type { TextElement, TextLink } from '$lib/types/canvas';
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

	const linkTypes = [
		{ value: 'url' as const, label: 'URL' },
		{ value: 'email' as const, label: 'Email' }
	];

	// Scratchpad for the link being added
	let newLink = $state<{
		type: 'url' | 'email';
		url: string;
		start: number;
		end: number;
		color: string;
	}>({
		type: 'url',
		url: '',
		start: 0,
		end: 0,
		color: DEFAULT_LINK_COLOR
	});

	// Pre-fill start/end char from the text currently selected in the editor.
	// The range persists until addLink() clears it, so clicking the property panel
	// while text is highlighted does not lose the selection.
	$effect(() => {
		const range = linkRangeStore.value;
		if (range && range.elementId === element.id) {
			newLink.start = range.start;
			newLink.end = range.end;
		}
	});

	function addLink() {
		const { text } = element;
		const start = Math.max(0, Math.min(newLink.start, text.length));
		const end = Math.max(start, Math.min(newLink.end, text.length));
		if (end <= start || !newLink.url.trim()) return;

		const link: TextLink = {
			id: uuidv4(),
			start,
			end,
			url:
				newLink.type === 'email' && !newLink.url.startsWith('mailto:')
					? `mailto:${newLink.url.trim()}`
					: newLink.url.trim(),
			type: newLink.type,
			color: newLink.color || DEFAULT_LINK_COLOR
		};
		onChange('links', [...(element.links ?? []), link]);
		newLink = { type: newLink.type, url: '', start: 0, end: 0, color: DEFAULT_LINK_COLOR };
		linkRangeStore.clear();
	}

	function removeLink(linkId: string) {
		onChange(
			'links',
			(element.links ?? []).filter((l) => l.id !== linkId)
		);
	}
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

<PanelSection title="Link">
	<p class="text-sm text-muted-foreground">
		Links map a character range of the element's text to a web address or email. Ranges are
		character positions in the element's text.
	</p>
	<div class="flex flex-col gap-3">
		{#if element.links?.length}
			<div class="rounded-lg border border-input p-3">
				{#each element.links as link (link.id)}
					<div class="mb-2 flex items-center gap-3 last:mb-0">
						<span class="flex-shrink-0 text-xs font-medium text-muted-foreground">
							{link.type === 'email' ? '✉' : '🔗'}
						</span>
						<div class="min-w-0 flex-1">
							<div class="truncate text-xs text-foreground" title={link.url}>
								{link.url}
							</div>
							<div class="text-xs text-muted-foreground">
								characters {link.start}–{link.end}
							</div>
						</div>
						<Button
							data-testid={`remove-link-${link.id}`}
							onClick={() => removeLink(link.id)}
							variant="secondary-destructive"
							className="h-8 px-2 text-xs"
						>
							Remove
						</Button>
					</div>
				{/each}
			</div>
		{:else}
			<p class="text-xs text-muted-foreground">No links yet.</p>
		{/if}

		<div class="grid grid-cols-2 gap-3 max-lg:contents">
			<div class="max-lg:min-w-[10rem]">
				<SegmentedControl
					value={newLink.type}
					onChange={(value) => (newLink.type = value as 'url' | 'email')}
					testId="select-link-type"
					options={linkTypes}
					label="Type"
				/>
			</div>
			<div class="max-lg:min-w-[10rem]">
				<Input
					value={newLink.url}
					onChange={(value) => (newLink.url = value)}
					placeholder={newLink.type === 'email' ? 'you@example.com' : 'https://example.com'}
					testId="input-link-url"
					label={newLink.type === 'email' ? 'Email address' : 'URL'}
				/>
			</div>
			<div class="max-lg:min-w-[10rem]">
				<ColorInput
					value={newLink.color}
					onChange={(value) => (newLink.color = value)}
					testId="input-link-color"
					label="Link colour"
				/>
			</div>
		</div>
		<div class="grid grid-cols-2 gap-3 max-lg:contents">
			<div class="max-lg:min-w-[10rem]">
				<NumberInput
					value={newLink.start}
					handleInput={(value) => (newLink.start = value)}
					min={0}
					max={element.text.length}
					step={1}
					testId="input-link-start"
					label="Start char"
				/>
			</div>
			<div class="max-lg:min-w-[10rem]">
				<NumberInput
					value={newLink.end}
					handleInput={(value) => (newLink.end = value)}
					min={0}
					max={element.text.length}
					step={1}
					testId="input-link-end"
					label="End char"
				/>
			</div>
		</div>
		<div class="flex justify-end">
			<Button
				data-testid="add-link-btn"
				onClick={addLink}
				disabled={!newLink.url.trim()}
				className="w-full"
			>
				Add link
			</Button>
		</div>
	</div>
</PanelSection>
