<script lang="ts">
	interface RulerProps {
		orientation: 'horizontal' | 'vertical';
		size: number;
		displaySize: number;
		startAnchor: number;
		endAnchor: number;
		onAnchorChange: (start: number, end: number) => void;
	}

	const { orientation, size, displaySize, startAnchor, endAnchor, onAnchorChange }: RulerProps =
		$props();

	let isDraggingStart = $state(false);
	let isDraggingEnd = $state(false);
	let rulerRef: HTMLDivElement;

	const RULER_SIZE = 30; // pixels
	const MAJOR_TICK_INTERVAL = 100; // Major tick every 100px
	const MINOR_TICK_INTERVAL = 50; // Minor tick every 50px
	const TINY_TICK_INTERVAL = 10; // Tiny tick every 10px

	// Generate tick marks with different sizes
	const majorTicks = $derived(
		Array.from(
			{ length: Math.floor(size / MAJOR_TICK_INTERVAL) + 1 },
			(_, i) => i * MAJOR_TICK_INTERVAL
		)
	);

	const minorTicks = $derived(
		Array.from(
			{ length: Math.floor(size / MINOR_TICK_INTERVAL) + 1 },
			(_, i) => i * MINOR_TICK_INTERVAL
		).filter((tick) => tick % MAJOR_TICK_INTERVAL !== 0)
	);

	const tinyTicks = $derived(
		Array.from(
			{ length: Math.floor(size / TINY_TICK_INTERVAL) + 1 },
			(_, i) => i * TINY_TICK_INTERVAL
		).filter((tick) => tick % MINOR_TICK_INTERVAL !== 0)
	);

	function handleStartAnchorPointerDown(event: PointerEvent) {
		event.preventDefault();
		event.stopPropagation();
		isDraggingStart = true;
	}

	function handleEndAnchorPointerDown(event: PointerEvent) {
		event.preventDefault();
		event.stopPropagation();
		isDraggingEnd = true;
	}

	// Also add touch-specific handlers for better mobile support
	function handleStartAnchorTouchStart(event: TouchEvent) {
		event.stopPropagation();
		isDraggingStart = true;
	}

	function handleEndAnchorTouchStart(event: TouchEvent) {
		event.stopPropagation();
		isDraggingEnd = true;
	}

	// Throttled pointer move for snappy performance
	let lastUpdateTime = 0;
	const UPDATE_THROTTLE = 8; // ~120fps for smoother experience

	function handlePointerMove(event: PointerEvent) {
		if (!isDraggingStart && !isDraggingEnd) return;

		// Prevent default to stop scrolling during drag
		event.preventDefault();

		// Throttle for smooth performance on mobile
		const now = performance.now();
		if (now - lastUpdateTime < UPDATE_THROTTLE) return;
		lastUpdateTime = now;

		const rect = rulerRef.getBoundingClientRect();
		let position: number;

		if (orientation === 'horizontal') {
			const relativePos = event.clientX - rect.left;
			const scale = size / displaySize;
			position = relativePos * scale;
		} else {
			const relativePos = event.clientY - rect.top;
			const scale = size / displaySize;
			position = relativePos * scale;
		}

		// Clamp position to ruler bounds
		position = Math.max(0, Math.min(size, position));

		if (isDraggingStart) {
			// Ensure start anchor doesn't go past end anchor
			const newStart = Math.min(position, endAnchor - 50);
			onAnchorChange(newStart, endAnchor);
		} else if (isDraggingEnd) {
			// Ensure end anchor doesn't go before start anchor
			const newEnd = Math.max(position, startAnchor + 50);
			onAnchorChange(startAnchor, newEnd);
		}
	}

	// Separate handler for touch events with proper typing
	function handleTouchMove(event: TouchEvent) {
		if (!isDraggingStart && !isDraggingEnd) return;

		// Prevent default to stop scrolling during drag
		event.preventDefault();

		// Throttle for smooth performance on mobile
		const now = performance.now();
		if (now - lastUpdateTime < UPDATE_THROTTLE) return;
		lastUpdateTime = now;

		const rect = rulerRef.getBoundingClientRect();
		let position: number;

		// Get touch coordinates with proper typing
		if (event.touches.length > 0) {
			const touch = event.touches[0];

			if (orientation === 'horizontal') {
				const relativePos = touch.clientX - rect.left;
				const scale = size / displaySize;
				position = relativePos * scale;
			} else {
				const relativePos = touch.clientY - rect.top;
				const scale = size / displaySize;
				position = relativePos * scale;
			}

			// Clamp position to ruler bounds
			position = Math.max(0, Math.min(size, position));

			if (isDraggingStart) {
				// Ensure start anchor doesn't go past end anchor
				const newStart = Math.min(position, endAnchor - 50);
				onAnchorChange(newStart, endAnchor);
			} else if (isDraggingEnd) {
				// Ensure end anchor doesn't go before start anchor
				const newEnd = Math.max(position, startAnchor + 50);
				onAnchorChange(startAnchor, newEnd);
			}
		}
	}

	function handlePointerUp() {
		isDraggingStart = false;
		isDraggingEnd = false;
		lastUpdateTime = 0; // Reset throttle
	}

	$effect(() => {
		if (isDraggingStart || isDraggingEnd) {
			const options: AddEventListenerOptions = { passive: false };
			// Add both pointer and touch event listeners for maximum compatibility
			document.addEventListener('pointermove', handlePointerMove, options);
			document.addEventListener('pointerup', handlePointerUp, true);
			document.addEventListener('touchmove', handleTouchMove, options);
			document.addEventListener('touchend', handlePointerUp, true);

			return () => {
				document.removeEventListener('pointermove', handlePointerMove, options);
				document.removeEventListener('pointerup', handlePointerUp, true);
				document.removeEventListener('touchmove', handleTouchMove, options);
				document.removeEventListener('touchend', handlePointerUp, true);
			};
		}
	});

	// Calculate percentage positions for anchors
	const startPercent = $derived((startAnchor / size) * 100);
	const endPercent = $derived((endAnchor / size) * 100);
</script>

<div
	bind:this={rulerRef}
	class="relative border-primary bg-transparent select-none"
	class:h-full={orientation === 'vertical'}
	class:w-full={orientation === 'horizontal'}
	class:border-r={orientation === 'vertical'}
	class:border-b={orientation === 'horizontal'}
	style:width={orientation === 'vertical' ? `${RULER_SIZE}px` : `${displaySize}px`}
	style:height={orientation === 'horizontal' ? `${RULER_SIZE}px` : `${displaySize}px`}
	style:touch-action="none"
	data-testid="ruler"
>
	<!-- Major tick marks (tallest) -->
	{#each majorTicks as tick (tick)}
		{#if orientation === 'horizontal'}
			<div
				class="absolute bottom-0 w-[1px] bg-primary"
				style:left="{(tick / size) * 100}%"
				style:height="12px"
			></div>
		{:else}
			<div
				class="absolute right-0 h-[1px] bg-primary"
				style:top="{(tick / size) * 100}%"
				style:width="12px"
			></div>
		{/if}
	{/each}

	<!-- Minor tick marks (medium) -->
	{#each minorTicks as tick (tick)}
		{#if orientation === 'horizontal'}
			<div
				class="absolute bottom-0 w-[1px] bg-primary"
				style:left="{(tick / size) * 100}%"
				style:height="8px"
			></div>
		{:else}
			<div
				class="absolute right-0 h-[1px] bg-primary"
				style:top="{(tick / size) * 100}%"
				style:width="8px"
			></div>
		{/if}
	{/each}

	<!-- Tiny tick marks (shortest) -->
	{#each tinyTicks as tick (tick)}
		{#if orientation === 'horizontal'}
			<div
				class="absolute bottom-0 w-[1px] bg-primary"
				style:left="{(tick / size) * 100}%"
				style:height="4px"
			></div>
		{:else}
			<div
				class="absolute right-0 h-[1px] bg-primary"
				style:top="{(tick / size) * 100}%"
				style:width="4px"
			></div>
		{/if}
	{/each}

	<!-- Boundary region highlight -->
	{#if orientation === 'horizontal'}
		<div
			class="absolute top-0 h-full opacity-30"
			style:left="{startPercent}%"
			style:width="{endPercent - startPercent}%"
		></div>
	{:else}
		<div
			class="absolute left-0 w-full opacity-30"
			style:top="{startPercent}%"
			style:height="{endPercent - startPercent}%"
		></div>
	{/if}

	<!-- Start anchor (triangle marker) -->
	{#if orientation === 'horizontal'}
		<div
			role="button"
			tabindex="0"
			onkeydown={null}
			class="absolute z-10 cursor-grab text-primary-text active:cursor-grabbing"
			style:left="calc({startPercent}% - 6px)"
			style:top="0"
			onpointerdown={handleStartAnchorPointerDown}
			ontouchstart={handleStartAnchorTouchStart}
		>
			<svg width="12" height="12" viewBox="0 0 12 12" class="hover:opacity-80">
				<path d="M 0 0 L 12 0 L 6 12 Z" fill="currentColor" />
			</svg>
		</div>
	{:else}
		<div
			role="button"
			tabindex="0"
			onkeydown={null}
			class="absolute z-10 cursor-grab text-primary-text active:cursor-grabbing"
			style:left="0"
			style:top="calc({startPercent}% - 6px)"
			onpointerdown={handleStartAnchorPointerDown}
			ontouchstart={handleStartAnchorTouchStart}
		>
			<svg width="12" height="12" viewBox="0 0 12 12" class="hover:opacity-80">
				<path d="M 0 0 L 0 12 L 12 6 Z" fill="currentColor" />
			</svg>
		</div>
	{/if}

	<!-- End anchor (triangle marker) -->
	{#if orientation === 'horizontal'}
		<div
			role="button"
			tabindex="0"
			onkeydown={null}
			class="absolute z-10 cursor-grab text-destructive-text active:cursor-grabbing"
			style:left="calc({endPercent}% - 6px)"
			style:top="0"
			onpointerdown={handleEndAnchorPointerDown}
			ontouchstart={handleEndAnchorTouchStart}
		>
			<svg width="12" height="12" viewBox="0 0 12 12" class="hover:opacity-80">
				<path d="M 0 0 L 12 0 L 6 12 Z" fill="currentColor" />
			</svg>
		</div>
	{:else}
		<div
			role="button"
			tabindex="0"
			onkeydown={null}
			class="absolute z-10 cursor-grab text-destructive-text active:cursor-grabbing"
			style:left="0"
			style:top="calc({endPercent}% - 6px)"
			onpointerdown={handleEndAnchorPointerDown}
			ontouchstart={handleEndAnchorTouchStart}
		>
			<svg width="12" height="12" viewBox="0 0 12 12" class="hover:opacity-80">
				<path d="M 0 0 L 0 12 L 12 6 Z" fill="currentColor" />
			</svg>
		</div>
	{/if}
</div>
