<script lang="ts">
	import Button from '$lib/components/Button.svelte';
	import CanvasElement from './CanvasElement.svelte';
	import Ruler from './Ruler.svelte';
	import { appStore } from '$lib/stores/appStore.svelte.ts';
	import type { DocumentPage, TCanvasInstance } from '$lib/types/canvas';
	import { pixelsToPercent } from '$lib/utils';
	import {
		boundaryAdjustments,
		boundingRect,
		dragPreviewRect,
		findElementAt,
		getOverlappingElements
	} from '$lib/utils/geometry';
	import { createElementDrag } from '$lib/canvas/elementDrag.svelte';
	import { createElementResize } from '$lib/canvas/elementResize.svelte';
	import { createGroupResize } from '$lib/canvas/groupResize.svelte';
	import { createMarquee } from '$lib/canvas/marquee.svelte';
	import { pageDrop } from '$lib/canvas/pageDrop.svelte';
	import type { TCanvasElement } from '$lib/types/canvas';

	const selectedElement = $derived(appStore.getSelectedElement());
	const scale = $derived(appStore.getScale());
	const multiSelectMode = $derived(appStore.getMultiSelectMode());
	const selectedHere = $derived(
		appStore.getSelectedElements().filter((el) => el.pageId === page.id)
	);
	// A box around the selection, when several elements are selected
	const selectionBox = $derived(selectedHere.length > 1 ? boundingRect(selectedHere) : null);

	interface CanvasProps {
		page: DocumentPage;
		showDeleteButton?: boolean;
		width: number;
		height: number;
		onDragover?: (event: DragEvent) => void;
		onDrop?: (event: DragEvent) => void;
		'data-page-id'?: string;
		onMount?: (instance: TCanvasInstance) => void;
	}

	const {
		page,
		showDeleteButton = false,
		width,
		height,
		onDragover = (_event: DragEvent) => {},
		onDrop = (_event: DragEvent) => {},
		'data-page-id': dataPageId,
		onMount
	}: CanvasProps = $props();

	// Create component instance for onMount callback
	const componentInstance: TCanvasInstance = {
		updateDragPreview,
		clearDragPreview
	};

	// Call onMount when component is initialized
	$effect(() => {
		if (onMount) {
			onMount(componentInstance);
		}
	});

	// Drag preview and highlighting states
	let dragPreview = $state<{ x: number; y: number; width: number; height: number } | null>(null);
	let hoveredElementId = $state<string | null>(null);
	let highlightedElementIds = $state<string[]>([]);

	// Elements from another page are being dragged over this one
	const dropHere = $derived(pageDrop.target?.pageId === page.id ? pageDrop.target : null);

	let canvasRef: HTMLDivElement;
	let canvasPageRef: HTMLDivElement;

	const pointerOptions = {
		getCanvas: () => canvasRef,
		getPage: () => page,
		getSize: () => ({ width, height })
	};
	const drag = createElementDrag({
		...pointerOptions,
		onHover: (elementId) => (hoveredElementId = elementId)
	});
	const resize = createElementResize(pointerOptions);
	const groupResize = createGroupResize(pointerOptions);
	const marquee = createMarquee(pointerOptions);
	const corners = ['nw', 'ne', 'sw', 'se'] as const;

	/** Shift/Ctrl/Cmd, or the select-multiple mode: add to the selection instead of replacing it */
	const isAdditive = (event: MouseEvent | PointerEvent | TouchEvent) =>
		multiSelectMode || event.shiftKey || event.ctrlKey || event.metaKey;

	function handleElementPress(event: PointerEvent | TouchEvent, element: TCanvasElement) {
		// An unselected element is added by the click that follows, not dragged
		if (isAdditive(event) && !appStore.isSelected(element.id)) return;
		drag.start(event, element);
	}

	function handleElementClick(event: MouseEvent, element: TCanvasElement) {
		if (drag.consumeMoved()) return; // the click that ends a drag
		if (isAdditive(event)) appStore.toggleSelected(element);
		else if (!appStore.isSelected(element.id)) appStore.selectElement(element);
	}

	// Update highlighted elements when selection changes
	$effect(() => {
		if (selectedElement && selectedElement.pageId === page.id) {
			const overlapping = getOverlappingElements(selectedElement, Object.values(page.elements));
			highlightedElementIds = overlapping.map((el) => el.id);
		} else {
			highlightedElementIds = [];
		}
	});

	// Fit the elements into the boundaries when they change; the elements of a group stay together
	function constrainElementsToBoundaries() {
		const changes = boundaryAdjustments(Object.values(page.elements), page.boundaries);
		if (Object.keys(changes).length) appStore.updateElements(page.id, changes);
	}

	// Watch for boundary changes and constrain elements
	$effect(() => {
		// Access boundaries to make this reactive effect reactive
		void page.boundaries;
		constrainElementsToBoundaries();
	});

	// Handle clicks outside the canvas to hide boundary
	$effect(() => {
		const handleDocumentClick = (event: MouseEvent) => {
			const propertyPanel = document.querySelector('[data-testid="property-panel"]');
			const allCanvasPages = document.querySelectorAll('[data-testid="document-canvas"]');

			// Check if click is inside any canvas page or property panel
			const isInsideAnyCanvas = Array.from(allCanvasPages).some((canvas) =>
				canvas.contains(event.target as Node)
			);

			const isInsidePropertyPanel = propertyPanel?.contains(event.target as Node);
			const keepsSelection = (event.target as Element).closest?.('[data-keep-selection]');

			if (!isInsideAnyCanvas && !isInsidePropertyPanel && !keepsSelection) {
				appStore.selectElement(null);
			}
		};

		document.addEventListener('click', handleDocumentClick);
		return () => {
			document.removeEventListener('click', handleDocumentClick);
		};
	});

	function handleCanvasClick(event: MouseEvent) {
		if (event.target === canvasRef) {
			if (marquee.consumeMoved()) return; // the click that ends a selection box
			appStore.selectElement(null);
		}
	}

	function handleCanvasDragOver(event: DragEvent) {
		onDragover(event);
	}

	// Exposed methods for drag preview
	export function updateDragPreview(event: DragEvent) {
		if (!canvasRef) return;

		const rect = canvasRef.getBoundingClientRect();
		const pointer = {
			x: (event.clientX - rect.left) * (width / rect.width),
			y: (event.clientY - rect.top) * (height / rect.height)
		};

		const preview = dragPreviewRect(pointer, page.boundaries);
		dragPreview = preview;

		// Highlight the element the new one would be dropped into
		const hovered = findElementAt(Object.values(page.elements), preview);
		hoveredElementId = hovered ? hovered.id : null;
	}

	export function clearDragPreview() {
		dragPreview = null;
		hoveredElementId = null;
	}

	// Handle drag leave to clear highlights
	function handleDragLeave(event: DragEvent) {
		// Only clear if leaving the canvas entirely
		if (!canvasRef?.contains(event.relatedTarget as Node)) {
			clearDragPreview();
		}
	}
</script>

<div class="relative flex" data-page-id={dataPageId} bind:this={canvasPageRef}>
	<div class="relative flex flex-col">
		<!-- Corner spacer and Horizontal Ruler -->
		<div class="flex">
			<!-- Corner spacer to align with vertical ruler -->
			<div class="h-[30px] w-[30px]"></div>
			<Ruler
				orientation="horizontal"
				size={width}
				displaySize={width * scale}
				startAnchor={page.boundaries.horizontal.start}
				endAnchor={page.boundaries.horizontal.end}
				onAnchorChange={(start, end) => {
					appStore.updateBoundaries(page.id, {
						...page.boundaries,
						horizontal: { start, end }
					});
				}}
			/>
		</div>

		<div class="absolute bottom-0 left-0">
			<!-- Vertical Ruler -->
			<Ruler
				orientation="vertical"
				size={height}
				displaySize={height * scale}
				startAnchor={page.boundaries.vertical.start}
				endAnchor={page.boundaries.vertical.end}
				onAnchorChange={(start, end) => {
					appStore.updateBoundaries(page.id, {
						...page.boundaries,
						vertical: { start, end }
					});
				}}
			/>
		</div>

		<!-- Canvas wrapper with left margin -->
		<div class="flex">
			<div style:height="{height * scale}px" class="w-[30px]"></div>
			<div
				bind:this={canvasRef}
				id={`canvas-${dataPageId}`}
				data-testid="document-canvas"
				class="relative bg-background shadow-lg {dropHere ? 'ring-4 ring-primary' : ''}"
				style:width="{width * scale}px"
				style:height="{height * scale}px"
				style:touch-action={multiSelectMode ? 'none' : undefined}
				onpointerdowncapture={() => appStore.setActivePage(page.id)}
				onclick={handleCanvasClick}
				onpointerdown={(e) => {
					// Touch screens scroll with a finger, so a selection box needs the select-multiple mode there
					if (e.target === canvasRef && (e.pointerType !== 'touch' || multiSelectMode)) {
						marquee.start(e, isAdditive(e));
					}
				}}
				role="button"
				tabindex="0"
				onkeydown={(e) => {
					if (e.key === 'Escape') {
						clearDragPreview();
						drag.cancel();
					}
				}}
				ondragover={handleCanvasDragOver}
				ondrop={onDrop}
				ondragleave={handleDragLeave}
			>
				<!-- Delete Page Button -->
				{#if showDeleteButton}
					<Button
						variant="destructive"
						onClick={(e) => {
							e.stopPropagation();
							appStore.deletePage(page.id);
						}}
						className="absolute top-2 right-2 z-20"
					>
						<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
							/>
						</svg>
					</Button>
				{/if}

				<!-- Render all elements (sorted by zIndex) -->
				{#each Object.values(page.elements).sort((a, b) => a.zIndex - b.zIndex) as element (element.id)}
					{@const isSelected = appStore.isSelected(element.id)}
					{@const isHighlighted = highlightedElementIds.includes(element.id)}
					{@const isHovered = hoveredElementId === element.id}
					<div
						role="button"
						tabindex="0"
						onkeydown={null}
						class="absolute cursor-move transition-all select-none {isSelected
							? 'ring-primary hover:ring-2 hover:ring-primary'
							: ''} {isHighlighted || isHovered || isSelected
							? 'ring-2 ring-primary'
							: ''} {isHovered ? 'ring-primary' : ''} {isHighlighted && !isSelected
							? 'ring-primary/30'
							: ''} {multiSelectMode ? '[&>div]:pointer-events-none' : ''}"
						class:transition-none={drag.isDragging || resize.isResizing || groupResize.isResizing}
						style:left={pixelsToPercent(element.x, width)}
						style:top={pixelsToPercent(element.y, height)}
						style:width={pixelsToPercent(element.width, width)}
						style:height={pixelsToPercent(element.height, height)}
						style:z-index={element.zIndex}
						style:touch-action="none"
						onpointerdown={(e) => handleElementPress(e, element)}
						ontouchstart={(e) => handleElementPress(e, element)}
						onclick={(e) => handleElementClick(e, element)}
					>
						<CanvasElement
							{element}
							isSelected={isSelected && selectedHere.length === 1}
							onResize={(event, direction) => resize.start(event, element, direction)}
						/>
					</div>
				{/each}

				<!-- Where elements dragged from another page would land -->
				{#if dropHere}
					{#each dropHere.rects as rect, i (i)}
						<div
							class="pointer-events-none absolute border-2 border-dashed border-primary bg-primary/10"
							style:left={pixelsToPercent(rect.x, width)}
							style:top={pixelsToPercent(rect.y, height)}
							style:width={pixelsToPercent(rect.width, width)}
							style:height={pixelsToPercent(rect.height, height)}
							style:z-index="9999"
							data-testid="page-drop-preview"
							data-html2canvas-ignore
						></div>
					{/each}
				{/if}

				<!-- Box around a multiple selection, and the selection box being dragged -->
				{#if selectionBox}
					<div
						class="pointer-events-none absolute border-2 border-dashed border-primary"
						style:left={pixelsToPercent(selectionBox.x, width)}
						style:top={pixelsToPercent(selectionBox.y, height)}
						style:width={pixelsToPercent(selectionBox.width, width)}
						style:height={pixelsToPercent(selectionBox.height, height)}
						style:z-index="9998"
						data-testid="selection-box"
						data-html2canvas-ignore
					>
						<!-- Corner handles resize everything in the box, keeping its proportions -->
						{#each corners as corner (corner)}
							<div
								class="pointer-events-auto absolute h-3 w-3 rounded-full border-2 border-primary-foreground bg-primary shadow-md {corner ===
								'nw'
									? '-top-1.5 -left-1.5 cursor-nw-resize'
									: corner === 'ne'
										? '-top-1.5 -right-1.5 cursor-ne-resize'
										: corner === 'sw'
											? '-bottom-1.5 -left-1.5 cursor-sw-resize'
											: '-right-1.5 -bottom-1.5 cursor-se-resize'}"
								style:touch-action="none"
								onpointerdown={(e) => {
									e.preventDefault();
									e.stopPropagation();
									groupResize.start(e, corner);
								}}
								ontouchstart={(e) => {
									e.stopPropagation();
									groupResize.start(e, corner);
								}}
								role="button"
								tabindex="0"
								onkeydown={null}
								data-testid={`group-resize-handle-${corner}`}
							></div>
						{/each}
					</div>
				{/if}
				{#if marquee.box}
					<div
						class="pointer-events-none absolute border border-primary bg-primary/10"
						style:left={pixelsToPercent(marquee.box.x, width)}
						style:top={pixelsToPercent(marquee.box.y, height)}
						style:width={pixelsToPercent(marquee.box.width, width)}
						style:height={pixelsToPercent(marquee.box.height, height)}
						style:z-index="9999"
						data-testid="marquee"
						data-html2canvas-ignore
					></div>
				{/if}

				<!-- Drag preview -->
				{#if dragPreview}
					<div
						class="pointer-events-none absolute z-[9999] border-2 border-dashed border-primary bg-primary/10 opacity-50"
						style:left={pixelsToPercent(dragPreview.x, width)}
						style:top={pixelsToPercent(dragPreview.y, height)}
						style:width={pixelsToPercent(dragPreview.width, width)}
						style:height={pixelsToPercent(dragPreview.height, height)}
						data-html2canvas-ignore
					></div>
				{/if}

				<!-- Boundary visualization -->
				<div
					class="pointer-events-none absolute border-2 border-dashed border-primary/50"
					style:left={pixelsToPercent(page.boundaries.horizontal.start, width)}
					style:top={pixelsToPercent(page.boundaries.vertical.start, height)}
					style:width={pixelsToPercent(
						page.boundaries.horizontal.end - page.boundaries.horizontal.start,
						width
					)}
					style:height={pixelsToPercent(
						page.boundaries.vertical.end - page.boundaries.vertical.start,
						height
					)}
					data-testid={`boundary-${page.id}`}
					data-html2canvas-ignore
				></div>
			</div>
		</div>
	</div>
</div>
