<script lang="ts">
	import { clickOutside } from '$lib/actions';
	import { uuidv4 } from '$lib/utils/uuid';

	type TOption = {
		label: string;
		value: number;
	};

	type TProps = {
		value: number;
		options?: TOption[];
		min?: number;
		max?: number;
		step?: number;
		placeholder?: string;
		testId?: string;
		label?: string;
		handleInput?: (value: number) => void;
	};

	const {
		value,
		options = [],
		min = 1,
		max = Infinity,
		step = 1,
		placeholder = '',
		testId = '',
		label = '',
		handleInput
	}: TProps = $props();

	let isDropdownOpen = $state(false);
	let containerElement: HTMLDivElement | null = null;
	let dropdownElement = $state<HTMLDivElement | null>(null);
	let dropdownPosition = $state<'top' | 'bottom'>('bottom');
	const inputId = `number-input-${uuidv4()}`;

	function handleOnInput(e: Event) {
		const target = e.target as HTMLInputElement;
		const newValue = parseFloat(target.value);

		if (!isNaN(newValue) && newValue >= min && newValue <= max) {
			handleInput?.(newValue);
		} else {
			target.value = value.toString();
			handleInput?.(value);
		}
	}

	function selectOption(option: TOption) {
		handleInput?.(option.value);
		isDropdownOpen = false;
	}

	function toggleDropdown() {
		if (!containerElement) return;

		if (isDropdownOpen) {
			isDropdownOpen = false;
			return;
		}

		// Calculate position and dimensions
		const rect = containerElement.getBoundingClientRect();
		const spaceBelow = window.innerHeight - rect.bottom;
		const spaceAbove = rect.top;
		const dropdownHeight = Math.min(options.length * 40 + 16, 240);

		// Set CSS custom properties for positioning
		document.documentElement.style.setProperty('--select-width', `${rect.width}px`);
		document.documentElement.style.setProperty('--select-left', `${rect.left}px`);

		if (spaceBelow >= dropdownHeight || spaceBelow > spaceAbove) {
			dropdownPosition = 'bottom';
			document.documentElement.style.setProperty(
				'--select-bottom',
				`${rect.bottom + window.scrollY + 10}px`
			);
		} else {
			dropdownPosition = 'top';
			document.documentElement.style.setProperty(
				'--select-top',
				`${window.innerHeight - rect.top + window.scrollY - 12}px`
			);
		}

		isDropdownOpen = true;
	}

	function handleClickOutside() {
		isDropdownOpen = false;
	}

	$effect(() => {
		if (isDropdownOpen && dropdownElement && containerElement) {
			const selectedElement = dropdownElement.querySelector('[data-selected]');
			if (selectedElement) {
				selectedElement.scrollIntoView({ block: 'nearest' });
			}

			// Recalculate position on window resize when dropdown is open
			const handleResize = () => {
				if (isDropdownOpen && containerElement) {
					const rect = containerElement.getBoundingClientRect();
					const spaceBelow = window.innerHeight - rect.bottom;
					const spaceAbove = rect.top;
					const dropdownHeight = dropdownElement?.offsetHeight || 0;

					dropdownPosition =
						spaceBelow >= dropdownHeight || spaceBelow > spaceAbove ? 'bottom' : 'top';
				}
			};

			window.addEventListener('resize', handleResize, { passive: true });
			return () => window.removeEventListener('resize', handleResize);
		}
	});
</script>

<div
	class="relative flex w-full flex-col items-start gap-1"
	bind:this={containerElement}
	use:clickOutside={{ enabled: isDropdownOpen, handler: handleClickOutside }}
>
	{#if label}
		<label for={inputId} class="text-background-foreground block text-sm">
			{label}
		</label>
	{/if}

	<input
		type="number"
		id={inputId}
		{value}
		oninput={handleOnInput}
		class="flex h-9 w-full items-center justify-between rounded border border-input bg-transparent px-3 py-1 text-sm shadow-sm ring-offset-background placeholder:text-muted-foreground focus:ring-1 focus:ring-ring focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
		{min}
		{max}
		{step}
		{placeholder}
		data-testid={testId}
		onkeydown={(e) => e.key === 'Enter' && e.preventDefault()}
		onclick={(e) => {
			// Only toggle if clicking on the input itself, not the spinner buttons
			const target = e.target as HTMLInputElement;
			const rect = target.getBoundingClientRect();
			const isSpinnerClick = e.clientX > rect.right - 40; // 40px is approximately the width of the spinner buttons

			if (!isSpinnerClick) {
				toggleDropdown();
			}
		}}
	/>

	{#if isDropdownOpen && options.length > 0}
		<div
			class="ring-opacity-5 fixed z-50 max-h-60 min-w-[var(--select-width)] overflow-auto rounded border border-border bg-popover py-1 text-sm shadow-lg ring-1 ring-ring focus:outline-none"
			style="left: var(--select-left); {dropdownPosition === 'bottom'
				? 'top: var(--select-bottom);'
				: 'bottom: var(--select-top);'}"
			bind:this={dropdownElement}
			role="listbox"
		>
			{#each options as option (option)}
				<span
					class="relative m-1 block h-auto cursor-pointer rounded-sm bg-primary/4 px-2 py-1 text-sm text-muted-foreground hover:bg-primary/10 {option.value ===
					value
						? 'bg-primary/10'
						: ''}"
					onclick={(e) => {
						e.stopPropagation();
						selectOption(option);
					}}
					onkeydown={(e) => e.key === 'Enter' && selectOption(option)}
					role="button"
					tabindex={0}
					data-selected={value === option.value ? '' : undefined}
					data-testid={`${testId}-option-${option.value}`}
				>
					{option.label}

					{#if value === option.value}
						<span class="absolute top-1/4 right-2 flex items-center text-primary-text">
							<svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
								<path
									stroke-linecap="round"
									stroke-linejoin="round"
									stroke-width="2"
									d="M5 13l4 4L19 7"
								/>
							</svg>
						</span>
					{/if}
				</span>
			{/each}
		</div>
	{/if}
</div>
