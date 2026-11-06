<script lang="ts">
	interface Props {
		label: string;
		value: number;
		min: number;
		max: number;
		step?: number;
		testId?: string;
		/** Text shown under the slider, e.g. `50%` */
		format: (value: number) => string;
		onChange: (value: number) => void;
	}

	const { label, value, min, max, step, testId, format, onChange }: Props = $props();
</script>

<span class="text-background-foreground block text-sm">{label}</span>
<input
	data-testid={testId}
	type="range"
	{min}
	{max}
	{step}
	{value}
	class="w-full"
	oninput={(e) => onChange(Number(e.currentTarget.value))}
/>
<span class="text-background-foreground block text-sm">{format(value)}</span>
