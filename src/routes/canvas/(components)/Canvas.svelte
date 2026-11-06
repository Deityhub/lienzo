<script lang="ts">
	import Button from '$lib/components/Button.svelte';
	import CanvasElement from './CanvasElement.svelte';
	import Ruler from './Ruler.svelte';
	import { appStore } from '$lib/stores/appStore.svelte.ts';
	import type { DocumentPage, TCanvasInstance } from '$lib/types/canvas';
	import { pixelsToPercent } from '$lib/utils';
	import {
		constrainToBoundaries,
		dragPreviewRect,
		findElementAt,
		getOverlappingElements
	} from '$lib/utils/geometry';
	import { createElementDrag } from '$lib/canvas/elementDrag.svelte';
	import { createElementResize } from '$lib/canvas/elementResize.svelte';

	const selectedElement = $derived(appStore.getSelectedElement());
	const scale = $derived(appStore.getScale());

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

	// Update highlighted elements when selection changes
	$effect(() => {
		if (selectedElement && selectedElement.pageId === page.id) {
			const overlapping = getOverlappingElements(selectedElement, Object.values(page.elements));
			highlightedElementIds = overlapping.map((el) => el.id);
		} else {
			highlightedElementIds = [];
		}
	});

	// Constrain all elements to boundaries when boundaries change
	function constrainElementsToBoundaries() {
		for (const element of Object.values(page.elements)) {
			const next = constrainToBoundaries(element, page.boundaries);

			// Only update if something actually changed to avoid unnecessary re-renders
			if (
				next.x !== element.x ||
				next.y !== element.y ||
				next.width !== element.width ||
				next.height !== element.height
			) {
				appStore.updateElement({ elementId: element.id, updates: next, pageId: element.pageId });
			}
		}
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

			if (!isInsideAnyCanvas && !isInsidePropertyPanel) {
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
				class="relative bg-background shadow-lg"
				style:width="{width * scale}px"
				style:height="{height * scale}px"
				onclick={handleCanvasClick}
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
					{@const isSelected = selectedElement?.id === element.id}
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
							: ''}"
						class:transition-none={drag.isDragging || resize.isResizing}
						style:left={pixelsToPercent(element.x, width)}
						style:top={pixelsToPercent(element.y, height)}
						style:width={pixelsToPercent(element.width, width)}
						style:height={pixelsToPercent(element.height, height)}
						style:z-index={element.zIndex}
						style:touch-action="none"
						onpointerdown={(e) => drag.start(e, element)}
						ontouchstart={(e) => drag.start(e, element)}
					>
						<CanvasElement
							{element}
							{isSelected}
							onResize={(event, direction) => resize.start(event, element, direction)}
						/>
					</div>
				{/each}

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
