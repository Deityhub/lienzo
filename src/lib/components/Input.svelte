<script lang="ts">
	import { uuidv4 } from '$lib/utils/uuid';

	export type InputProps = {
		value: string;
		onChange: (value: string) => void;
		placeholder?: string;
		label?: string;
		testId?: string;
		type?: string;
		class?: string;
		disabled?: boolean;
	};

	const {
		value,
		onChange,
		placeholder = '',
		label = '',
		testId = '',
		type = 'text',
		class: className = '',
		disabled = false
	}: InputProps = $props();

	const inputId = `input-${uuidv4()}`;

	function handleInput(e: Event) {
		const target = e.target as HTMLInputElement;
		onChange(target.value);
	}
</script>

<div class={`flex w-full flex-col gap-1 ${className}`}>
	{#if label}
		<label for={inputId} class="text-background-foreground block text-sm">
			{label}
		</label>
	{/if}
	<input
		id={inputId}
		{type}
		{value}
		{placeholder}
		{disabled}
		oninput={handleInput}
		data-testid={testId}
		class="flex h-9 w-full rounded border border-input bg-transparent px-3 py-1 text-sm shadow-sm ring-offset-background placeholder:text-muted-foreground focus:ring-1 focus:ring-ring focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
	/>
</div>
