<script lang="ts">
	import { anchorLabel, moveAnchor, positionOnRuler } from '$lib/utils/rulerAnchors';

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

	type Which = 'start' | 'end';

	/** The marker being dragged, or the one with the keyboard focus (both show their value) */
	let dragging = $state<Which | null>(null);
	let focused = $state<Which | null>(null);
	let rulerRef: HTMLDivElement;

	const RULER_SIZE = 30; // pixels
	const MAJOR_TICK_INTERVAL = 100;
	const MINOR_TICK_INTERVAL = 50;
	const TINY_TICK_INTERVAL = 10;
	const LABEL_INTERVAL = 500;

	const ticks = (interval: number) =>
		Array.from({ length: Math.floor(size / interval) + 1 }, (_, i) => i * interval);
	const majorTicks = $derived(ticks(MAJOR_TICK_INTERVAL));
	const minorTicks = $derived(ticks(MINOR_TICK_INTERVAL).filter((t) => t % MAJOR_TICK_INTERVAL));
	const tinyTicks = $derived(ticks(TINY_TICK_INTERVAL).filter((t) => t % MINOR_TICK_INTERVAL));
	const labels = $derived(ticks(LABEL_INTERVAL));

	const isHorizontal = $derived(orientation === 'horizontal');
	const percentOf = (value: number) => (value / size) * 100;
	const valueOf = (which: Which) => (which === 'start' ? startAnchor : endAnchor);
	const anchors = $derived({ start: startAnchor, end: endAnchor });

	function begin(which: Which, event: PointerEvent | TouchEvent) {
		if (event.type === 'pointerdown') event.preventDefault();
		event.stopPropagation();
		dragging = which;
	}

	// Throttled so the markers feel snappy without flooding the page with updates
	let lastUpdateTime = 0;
	const UPDATE_THROTTLE = 8; // ~120fps

	function moveTo(clientX: number, clientY: number) {
		if (!dragging) return;
		const now = performance.now();
		if (now - lastUpdateTime < UPDATE_THROTTLE) return;
		lastUpdateTime = now;

		const rect = rulerRef.getBoundingClientRect();
		const offset = isHorizontal ? clientX - rect.left : clientY - rect.top;
		const next = moveAnchor(dragging, positionOnRuler(offset, size, displaySize), anchors, size);
		onAnchorChange(next.start, next.end);
	}

	function handlePointerMove(event: PointerEvent) {
		if (!dragging) return;
		event.preventDefault(); // no scrolling while dragging
		moveTo(event.clientX, event.clientY);
	}

	function handleTouchMove(event: TouchEvent) {
		if (!dragging) return;
		event.preventDefault();
		if (event.touches.length) moveTo(event.touches[0].clientX, event.touches[0].clientY);
	}

	function end() {
		dragging = null;
		lastUpdateTime = 0;
	}

	/** Arrow keys move the focused marker by 10 pixels, 50 with Shift */
	function handleKeydown(which: Which, event: KeyboardEvent) {
		const direction = { ArrowLeft: -1, ArrowUp: -1, ArrowRight: 1, ArrowDown: 1 }[event.key];
		if (!direction) return;
		event.preventDefault();
		const step = event.shiftKey ? 50 : 10;
		const next = moveAnchor(which, valueOf(which) + direction * step, anchors, size);
		onAnchorChange(next.start, next.end);
	}

	$effect(() => {
		if (!dragging) return;
		const options: AddEventListenerOptions = { passive: false };
		document.addEventListener('pointermove', handlePointerMove, options);
		document.addEventListener('pointerup', end, true);
		document.addEventListener('touchmove', handleTouchMove, options);
		document.addEventListener('touchend', end, true);
		return () => {
			document.removeEventListener('pointermove', handlePointerMove, options);
			document.removeEventListener('pointerup', end, true);
			document.removeEventListener('touchmove', handleTouchMove, options);
			document.removeEventListener('touchend', end, true);
		};
	});

	const startPercent = $derived(percentOf(startAnchor));
	const endPercent = $derived(percentOf(endAnchor));
	const markers: Array<{ which: Which; tone: string }> = [
		{ which: 'start', tone: 'text-primary-text' },
		{ which: 'end', tone: 'text-destructive-text' }
	];
</script>

<div
	bind:this={rulerRef}
	class="relative border-border bg-background select-none"
	class:h-full={orientation === 'vertical'}
	class:w-full={orientation === 'horizontal'}
	class:border-r={orientation === 'vertical'}
	class:border-b={orientation === 'horizontal'}
	style:width={orientation === 'vertical' ? `${RULER_SIZE}px` : `${displaySize}px`}
	style:height={orientation === 'horizontal' ? `${RULER_SIZE}px` : `${displaySize}px`}
	style:touch-action="none"
	data-testid="ruler"
>
	<!-- Tick marks: tall every 100, medium every 50, short every 10 -->
	{#each [{ list: majorTicks, length: 12 }, { list: minorTicks, length: 8 }, { list: tinyTicks, length: 4 }] as group (group.length)}
		{#each group.list as tick (tick)}
			<div
				class="absolute bg-muted-foreground {isHorizontal ? 'bottom-0 w-px' : 'right-0 h-px'}"
				style:left={isHorizontal ? `${percentOf(tick)}%` : undefined}
				style:top={isHorizontal ? undefined : `${percentOf(tick)}%`}
				style:height={isHorizontal ? `${group.length}px` : undefined}
				style:width={isHorizontal ? undefined : `${group.length}px`}
			></div>
		{/each}
	{/each}

	<!-- Numbers, every 500 pixels -->
	{#each labels as tick (tick)}
		<span
			class="pointer-events-none absolute text-[10px] leading-none text-muted-foreground {isHorizontal
				? 'top-1'
				: 'left-1 [writing-mode:vertical-rl]'}"
			style:left={isHorizontal ? `calc(${percentOf(tick)}% + 4px)` : undefined}
			style:top={isHorizontal ? undefined : `calc(${percentOf(tick)}% + 4px)`}
			aria-hidden="true">{tick}</span
		>
	{/each}

	<!-- The area between the margins -->
	<div
		class="pointer-events-none absolute bg-primary/10 {isHorizontal
			? 'top-0 h-full'
			: 'left-0 w-full'}"
		style:left={isHorizontal ? `${startPercent}%` : undefined}
		style:width={isHorizontal ? `${endPercent - startPercent}%` : undefined}
		style:top={isHorizontal ? undefined : `${startPercent}%`}
		style:height={isHorizontal ? undefined : `${endPercent - startPercent}%`}
	></div>

	<!-- The margin markers -->
	{#each markers as marker (marker.which)}
		{@const value = valueOf(marker.which)}
		{@const percent = percentOf(value)}
		<div
			role="slider"
			tabindex="0"
			aria-label={anchorLabel(orientation, marker.which)}
			aria-orientation={orientation}
			aria-valuemin={0}
			aria-valuemax={size}
			aria-valuenow={Math.round(value)}
			data-testid={`ruler-marker-${marker.which}`}
			class="absolute z-10 cursor-grab focus-visible:outline-2 focus-visible:outline-ring active:cursor-grabbing {marker.tone}"
			style:left={isHorizontal ? `calc(${percent}% - 6px)` : '0'}
			style:top={isHorizontal ? '0' : `calc(${percent}% - 6px)`}
			onpointerdown={(event) => begin(marker.which, event)}
			ontouchstart={(event) => begin(marker.which, event)}
			onkeydown={(event) => handleKeydown(marker.which, event)}
			onfocus={() => (focused = marker.which)}
			onblur={() => (focused = null)}
		>
			<svg width="12" height="12" viewBox="0 0 12 12" class="hover:opacity-80" aria-hidden="true">
				<path
					d={isHorizontal ? 'M 0 0 L 12 0 L 6 12 Z' : 'M 0 0 L 0 12 L 12 6 Z'}
					fill="currentColor"
				/>
			</svg>
		</div>

		<!-- Its value, while it is dragged or has the keyboard focus -->
		{#if dragging === marker.which || focused === marker.which}
			<div
				class="pointer-events-none absolute z-30 rounded bg-foreground px-2 py-1 text-xs font-semibold whitespace-nowrap text-background shadow-md"
				style:left={isHorizontal ? `${percent}%` : `${RULER_SIZE + 6}px`}
				style:top={isHorizontal ? `${RULER_SIZE + 6}px` : `${percent}%`}
				style:transform={isHorizontal ? 'translateX(-50%)' : 'translateY(-50%)'}
				role="status"
				data-testid="ruler-tooltip"
			>
				{anchorLabel(orientation, marker.which)}
				{Math.round(value)}
			</div>
		{/if}
	{/each}
</div>
