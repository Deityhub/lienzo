<script lang="ts">
	import { clickOutside } from '$lib/actions';
	import { uuidv4 } from '$lib/utils/uuid';

	export type Option<T = string> = {
		value: T;
		label: string;
		fontFamily?: string;
		[key: string]: unknown;
	};

	interface IProps<T = string> {
		value: T;
		options: Option<T>[];
		placeholder?: string;
		testId?: string;
		onChange?: (value: T) => void;
		label?: string;
	}

	const {
		value = '',
		options = [],
		placeholder = 'Select an option',
		testId = 'select',
		onChange = () => {},
		label = ''
	}: IProps = $props();

	let isOpen = $state(false);
	let containerElement: HTMLDivElement | null = null;
	let dropdownElement = $state<HTMLDivElement | null>(null);
	let dropdownPosition = $state<'top' | 'bottom'>('bottom');
	const inputId = `select-input-${uuidv4()}`;

	function handleSelect(option: Option) {
		onChange?.(option.value);
		isOpen = false;
	}

	function toggleDropdown() {
		if (!containerElement) return;

		if (isOpen) {
			isOpen = false;
			return;
		}

		// Calculate position and dimensions
		const rect = containerElement.getBoundingClientRect();
		const spaceBelow = window.innerHeight - rect.bottom;
		const spaceAbove = rect.top;
		const dropdownHeight = Math.min(options.length * 40 + 16, 240); // Approx height of dropdown

		// Set CSS custom properties for positioning
		document.documentElement.style.setProperty('--select-width', `${rect.width}px`);
		document.documentElement.style.setProperty('--select-left', `${rect.left}px`);

		if (spaceBelow >= dropdownHeight || spaceBelow > spaceAbove) {
			// Position below
			dropdownPosition = 'bottom';
			document.documentElement.style.setProperty(
				'--select-bottom',
				`${rect.bottom + window.scrollY + 10}px`
			);
		} else {
			// Position above
			dropdownPosition = 'top';
			document.documentElement.style.setProperty(
				'--select-top',
				`${window.innerHeight - rect.top + window.scrollY - 12}px`
			);
		}

		isOpen = true;
	}

	function handleClickOutside() {
		isOpen = false;
	}

	$effect(() => {
		if (isOpen && dropdownElement && containerElement) {
			const selectedElement = dropdownElement.querySelector('[data-selected]');
			if (selectedElement) {
				selectedElement.scrollIntoView({ block: 'nearest' });
			}

			// Recalculate position on window resize when dropdown is open
			const handleResize = () => {
				if (isOpen && containerElement) {
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

	const selectedOption = $derived(options.find((option) => option.value === value) || options[0]);
</script>

<div
	class="relative flex w-full flex-col items-start gap-1"
	bind:this={containerElement}
	use:clickOutside={{ enabled: isOpen, handler: handleClickOutside }}
>
	{#if label}
		<label for={inputId} class="text-background-foreground block text-sm">
			{label}
		</label>
	{/if}
	<div
		role="button"
		id={inputId}
		tabindex="0"
		class="flex h-9 w-full cursor-pointer items-center justify-between rounded border border-input bg-transparent px-3 py-1 text-sm shadow-sm ring-offset-background placeholder:text-muted-foreground focus:ring-1 focus:ring-ring focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
		onclick={toggleDropdown}
		data-testid={testId}
		onkeydown={(e) => e.key === 'Enter' && toggleDropdown()}
	>
		<span class="truncate">
			{#if selectedOption}
				{selectedOption.label}
			{:else}
				<span class="text-muted-foreground">{placeholder}</span>
			{/if}
		</span>
		<svg
			class="ml-2 h-4 w-4 text-muted-foreground transition-transform"
			fill="none"
			viewBox="0 0 24 24"
			stroke="currentColor"
			class:rotate-180={isOpen}
		>
			<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
		</svg>
	</div>

	{#if isOpen}
		<div
			class="ring-opacity-5 fixed z-50 max-h-60 min-w-[var(--select-width)] overflow-auto rounded border border-border bg-popover py-1 text-sm shadow-lg ring-1 ring-ring focus:outline-none"
			style="left: var(--select-left); {dropdownPosition === 'bottom'
				? 'top: var(--select-bottom);'
				: 'bottom: var(--select-top);'}"
			bind:this={dropdownElement}
			role="listbox"
		>
			{#each options as option (option.value)}
				<div
					role="button"
					tabindex="0"
					class="relative m-1 flex cursor-pointer items-center rounded-sm bg-primary/4 px-3 py-2 text-sm text-muted-foreground outline-none select-none hover:bg-primary/10 {value ===
					option.value
						? 'bg-primary/10'
						: ''}"
					onclick={(e) => {
						e.stopPropagation();
						handleSelect(option);
					}}
					onkeydown={(e) => e.key === 'Enter' && handleSelect(option)}
					data-selected={value === option.value ? '' : undefined}
					data-testid={`${testId}-option-${option.value}`}
				>
					<span class="block truncate" style:font-family={option.fontFamily}>
						{option.label}
					</span>

					{#if value === option.value}
						<span class="absolute right-2 flex items-center text-primary-text">
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
				</div>
			{/each}
		</div>
	{/if}
</div>
