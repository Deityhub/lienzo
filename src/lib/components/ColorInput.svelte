<script lang="ts">
	import { uuidv4 } from '$lib/utils/uuid';

	type ColorInputProps = {
		value: string;
		onChange: (value: string) => void;
		label?: string;
		testId?: string;
		class?: string;
	};

	const {
		value = '#000000',
		onChange,
		label = '',
		testId = 'color-input',
		class: className = ''
	}: ColorInputProps = $props();

	const inputId = `color-input-${uuidv4()}`;
	const hiddenInputId = `hidden-${inputId}`;
	let containerElement: HTMLDivElement;
	let hiddenInput: HTMLInputElement;

	function handleButtonClick() {
		// Force a reflow to ensure the element is in the DOM
		setTimeout(() => {
			positionColorPicker();
			// Small delay to ensure the position is updated before click
			setTimeout(() => {
				hiddenInput?.click();
			}, 10);
		}, 0);
	}

	function handleInput(e: Event) {
		const target = e.target as HTMLInputElement;
		onChange?.(target.value);
	}

	function positionColorPicker() {
		if (!hiddenInput || !containerElement) return;

		// Ensure the input is visible and positioned before calculating
		hiddenInput.style.position = 'fixed';
		hiddenInput.style.visibility = 'visible';
		hiddenInput.style.pointerEvents = 'auto';

		// Get the button's position
		const button = document.getElementById(inputId);
		if (!button) return;

		const rect = button.getBoundingClientRect();
		const spaceBelow = window.innerHeight - rect.bottom;
		const pickerHeight = 200; // Approximate height of color picker
		const pickerWidth = 225; // Approximate width of color picker

		// Calculate left position to ensure the picker stays in viewport
		let left = rect.left;
		if (left + pickerWidth > window.innerWidth) {
			left = window.innerWidth - pickerWidth - 16; // Add some padding
		}

		hiddenInput.style.left = `${left}px`;
		hiddenInput.style.zIndex = '9999'; // Ensure it's above other elements

		// Position below by default, above if not enough space
		if (spaceBelow < pickerHeight && rect.top > pickerHeight) {
			hiddenInput.style.top = `${window.scrollY + rect.top - pickerHeight - 8}px`;
		} else {
			hiddenInput.style.top = `${window.scrollY + rect.bottom + 8}px`;
		}
	}

	$effect(() => {
		if (hiddenInput) positionColorPicker();
	});

	$effect(() => {
		const handleResize = () => positionColorPicker();
		window.addEventListener('resize', handleResize, { passive: true });
		return () => window.removeEventListener('resize', handleResize);
	});
</script>

<div
	class="relative flex w-full flex-col items-start gap-1 ${className}"
	bind:this={containerElement}
>
	{#if label}
		<label for={inputId} class="text-background-foreground block text-sm">
			{label}
		</label>
	{/if}

	<!-- This is a special case where using Button component is not possible -->
	<button
		type="button"
		id={inputId}
		onclick={handleButtonClick}
		class="h-9 w-full rounded border border-input bg-background px-3 py-1 text-left text-sm shadow-sm transition-colors hover:bg-accent hover:text-accent-foreground"
		style={`background-color: ${value}`}
		aria-label={label ? `Select ${label} color` : 'Select color'}
	>
	</button>

	<input
		type="color"
		id={hiddenInputId}
		{value}
		oninput={handleInput}
		class="fixed opacity-0"
		style="width: 1px; height: 1px; padding: 0; margin: -1px; overflow: hidden; clip: rect(0, 0, 0, 0); white-space: nowrap; border: 0;"
		aria-hidden="true"
		bind:this={hiddenInput}
		data-testid={testId}
	/>
</div>

<style>
	input[type='color'] {
		position: absolute;
		left: 0;
		width: 1px;
		height: 1px;
		padding: 0;
		margin: -1px;
		overflow: hidden;
		clip: rect(0, 0, 0, 0);
		white-space: nowrap;
		border: 0;
	}

	button {
		transition: background-color 0.2s ease;
	}
</style>
