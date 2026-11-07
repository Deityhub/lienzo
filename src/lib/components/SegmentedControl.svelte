<script lang="ts">
	interface Option {
		value: string;
		label: string;
		/** Spoken name when the visible label is short, e.g. "Align left" for "Left" */
		title?: string;
	}

	interface Props {
		value: string;
		options: readonly Option[];
		onChange: (value: string) => void;
		/** Names the group; also the prefix of each option's test id */
		testId: string;
		label: string;
	}

	const { value, options, onChange, testId, label }: Props = $props();
</script>

<div class="flex flex-col gap-1">
	<span class="block text-sm">{label}</span>
	<div
		role="group"
		aria-label={label}
		data-testid={testId}
		class="flex overflow-hidden rounded border border-input"
	>
		{#each options as option (option.value)}
			<button
				type="button"
				aria-pressed={value === option.value}
				title={option.title}
				aria-label={option.title}
				data-testid={`${testId}-option-${option.value}`}
				onclick={() => onChange(option.value)}
				class="h-[30px] min-w-0 flex-1 cursor-pointer border-r border-input px-1 text-[13px] font-semibold text-foreground transition-colors last:border-r-0 hover:bg-accent focus-visible:relative focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none aria-pressed:bg-primary-light aria-pressed:text-primary-text"
			>
				{option.label}
			</button>
		{/each}
	</div>
</div>
