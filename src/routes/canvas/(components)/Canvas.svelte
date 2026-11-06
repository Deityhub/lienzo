<script lang="ts">
	import Button from '$lib/components/Button.svelte';
	import CanvasElement from './CanvasElement.svelte';
	import Ruler from './Ruler.svelte';
	import { appStore } from '$lib/stores/appStore.svelte.ts';
	import type {
		TCanvasElement,
		DocumentPage,
		ResizeDirection,
		TCanvasInstance
	} from '$lib/types/canvas';
	import { pixelsToPercent } from '$lib/utils';
	import {
		constrainToBoundaries,
		dragPosition,
		dragPreviewRect,
		findElementAt,
		getOverlappingElements,
		resizeRect
	} from '$lib/utils/geometry';

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

	let dragRafId: number | null = null;
	let lastPointer = { x: 0, y: 0 };
	let dragMeta: {
		id: string;
		pageId: string;
		startX: number;
		startY: number;
		width: number;
		height: number;
	} | null = null;

	// Drag preview and highlighting states
	let dragPreview = $state<{ x: number; y: number; width: number; height: number } | null>(null);
	let hoveredElementId = $state<string | null>(null);
	let highlightedElementIds = $state<string[]>([]);

	let canvasRef: HTMLDivElement;
	let canvasPageRef: HTMLDivElement;
	let isDragging = $state(false);
	let dragStart = $state({ x: 0, y: 0 });
	let isResizing = $state(false);

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

	// Track current drag using dragMeta alone (no separate flag/id var)

	function handleGlobalPointerUp() {
		if (!isDragging || !dragMeta) {
			return;
		}

		// Lookup the latest element state from store to finalize and reparent
		const latest = appStore.findElement(dragMeta.pageId, dragMeta.id);
		if (latest) {
			const newParentElement = findElementAt(
				Object.values(page.elements),
				{ x: latest.x + latest.width / 2, y: latest.y + latest.height / 2 },
				latest.id
			);
			const newParentId = newParentElement ? newParentElement.id : null;

			appStore.moveElement({
				pageId: latest.pageId,
				elementId: latest.id,
				newParentId,
				newX: latest.x,
				newY: latest.y
			});

			const updated = appStore.findElement(latest.pageId, latest.id);
			if (updated) {
				appStore.selectElement(updated);
			}
		}

		// Cleanup
		isDragging = false;
		hoveredElementId = null;
		dragMeta = null;
		if (dragRafId !== null) {
			cancelAnimationFrame(dragRafId);
			dragRafId = null;
		}
		document.removeEventListener('pointermove', handleGlobalPointerMove);
		document.removeEventListener('pointerup', handleGlobalPointerUp, true);
		document.removeEventListener('touchmove', handleTouchMove);
		document.removeEventListener('touchend', handleGlobalPointerUp, true);
		document.removeEventListener('touchcancel', handleGlobalPointerUp, true);
		document.body.style.userSelect = '';
		document.body.style.touchAction = '';
	}

	function cancelDrag() {
		// Abort drag without finalizing reparenting
		isDragging = false;
		hoveredElementId = null;
		dragMeta = null;
		if (dragRafId !== null) {
			cancelAnimationFrame(dragRafId);
			dragRafId = null;
		}
		document.removeEventListener('pointermove', handleGlobalPointerMove);
		document.removeEventListener('pointerup', handleGlobalPointerUp, true);
		document.removeEventListener('touchmove', handleTouchMove);
		document.removeEventListener('touchend', handleGlobalPointerUp, true);
		document.removeEventListener('touchcancel', handleGlobalPointerUp, true);
		document.body.style.userSelect = '';
		document.body.style.touchAction = '';
	}

	function startElementDrag(event: PointerEvent | TouchEvent, element: TCanvasElement) {
		event.stopPropagation();

		// Start global, rAF-throttled drag
		isDragging = true;

		// Handle both pointer and touch events
		const startX = 'touches' in event ? event.touches[0].clientX : event.clientX;
		const startY = 'touches' in event ? event.touches[0].clientY : event.clientY;

		dragStart = { x: startX, y: startY };
		dragMeta = {
			id: element.id,
			pageId: element.pageId,
			startX: element.x,
			startY: element.y,
			width: element.width,
			height: element.height
		};
		lastPointer = { x: startX, y: startY };

		// Add both pointer and touch event listeners
		document.addEventListener('pointermove', handleGlobalPointerMove);
		document.addEventListener('pointerup', handleGlobalPointerUp, true);
		document.addEventListener('touchmove', handleTouchMove, {
			passive: false
		} as AddEventListenerOptions);
		document.addEventListener('touchend', handleGlobalPointerUp, true);
		document.addEventListener('touchcancel', handleGlobalPointerUp, true); // Add touchcancel
		document.body.style.userSelect = 'none';
		document.body.style.touchAction = 'none';
	}

	// Move the dragged element to the latest pointer position, at most once per animation frame
	function scheduleDragUpdate() {
		if (dragRafId !== null) return;
		dragRafId = requestAnimationFrame(() => {
			dragRafId = null;
			if (!isDragging || !dragMeta) return;

			const rect = canvasRef.getBoundingClientRect();
			const delta = {
				x: (lastPointer.x - dragStart.x) * (width / rect.width),
				y: (lastPointer.y - dragStart.y) * (height / rect.height)
			};
			const size = { width: dragMeta.width, height: dragMeta.height };
			const position = dragPosition(
				{ x: dragMeta.startX, y: dragMeta.startY },
				delta,
				size,
				page.boundaries
			);

			// The element under the dragged element's center is the future parent
			const parent = findElementAt(
				Object.values(page.elements),
				{ x: position.x + size.width / 2, y: position.y + size.height / 2 },
				dragMeta.id
			);
			hoveredElementId = parent ? parent.id : null;

			appStore.updateElement({
				elementId: dragMeta.id,
				updates: position,
				pageId: dragMeta.pageId
			});
		});
	}

	function handleTouchMove(e: TouchEvent) {
		if (!isDragging || !dragMeta) return;
		lastPointer = { x: e.touches[0].clientX, y: e.touches[0].clientY };
		scheduleDragUpdate();
	}

	function handleGlobalPointerMove(e: PointerEvent) {
		lastPointer = { x: e.clientX, y: e.clientY };
		scheduleDragUpdate();
	}

	function handleElementResizeAnimationFrame({
		element,
		direction,
		startState,
		startX,
		startY,
		scaleX,
		scaleY,
		last
	}: {
		element: TCanvasElement;
		direction: ResizeDirection;
		startState: { x: number; y: number; w: number; h: number };
		startX: number;
		startY: number;
		scaleX: number;
		scaleY: number;
		last: { x: number; y: number };
	}) {
		return requestAnimationFrame(() => {
			const next = resizeRect(
				{ x: startState.x, y: startState.y, width: startState.w, height: startState.h },
				direction,
				{ x: (last.x - startX) * scaleX, y: (last.y - startY) * scaleY },
				page.boundaries
			);

			appStore.updateElement({
				elementId: element.id,
				updates: next,
				pageId: element.pageId
			});
		});
	}

	function handleElementResize(
		event: MouseEvent | PointerEvent | TouchEvent,
		element: TCanvasElement,
		direction: ResizeDirection
	) {
		event.stopPropagation();
		isResizing = true;
		const originalUserSelect = document.body.style.userSelect;
		const originalTouchAction = document.body.style.touchAction;
		document.body.style.userSelect = '';
		document.body.style.touchAction = 'none'; // Prevent touch scrolling during resize

		const rect = canvasRef.getBoundingClientRect();
		const scaleX = width / rect.width;
		const scaleY = height / rect.height;

		// Handle both mouse/pointer and touch events
		const startX = 'touches' in event ? event.touches[0].clientX : event.clientX;
		const startY = 'touches' in event ? event.touches[0].clientY : event.clientY;

		const startState = {
			x: element.x,
			y: element.y,
			w: element.width,
			h: element.height
		};

		let resizeRafId: number | null = null;
		let last = { x: startX, y: startY };
		let lastUpdateTime = 0;
		const UPDATE_THROTTLE = 16; // ~60fps for smoother mobile performance

		const onPointerMove = (e: PointerEvent) => {
			last = { x: e.clientX, y: e.clientY };

			// Throttle updates for better mobile performance
			const now = performance.now();
			if (now - lastUpdateTime < UPDATE_THROTTLE && resizeRafId !== null) {
				return;
			}

			lastUpdateTime = now;

			if (resizeRafId === null) {
				resizeRafId = handleElementResizeAnimationFrame({
					element,
					direction,
					startState,
					startX,
					startY,
					scaleX,
					scaleY,
					last
				});

				resizeRafId = null;
			}
		};

		const onTouchMove = (e: TouchEvent) => {
			const touch = e.touches[0];
			last = { x: touch.clientX, y: touch.clientY };

			// Throttle updates for better mobile performance
			const now = performance.now();
			if (now - lastUpdateTime < UPDATE_THROTTLE && resizeRafId !== null) {
				return;
			}

			lastUpdateTime = now;

			if (resizeRafId === null) {
				resizeRafId = handleElementResizeAnimationFrame({
					element,
					direction,
					startState,
					startX,
					startY,
					scaleX,
					scaleY,
					last
				});

				resizeRafId = null;
			}
		};

		const option: AddEventListenerOptions = { passive: false };

		const onPointerUp = () => {
			isResizing = false;
			if (resizeRafId !== null) {
				cancelAnimationFrame(resizeRafId);
				resizeRafId = null;
			}
			document.removeEventListener('pointermove', onPointerMove);
			document.removeEventListener('pointerup', onPointerUp, true);
			document.removeEventListener('touchmove', onTouchMove, option);
			document.removeEventListener('touchend', onPointerUp, true);
			document.body.style.userSelect = originalUserSelect; // Restore original user select
			document.body.style.touchAction = originalTouchAction; // Restore original touch action
		};

		// Add both pointer and touch event listeners for better mobile support
		document.addEventListener('pointermove', onPointerMove);
		document.addEventListener('pointerup', onPointerUp, true);
		document.addEventListener('touchmove', onTouchMove, option);
		document.addEventListener('touchend', onPointerUp, true);
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
						cancelDrag();
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
						class:transition-none={isDragging || isResizing}
						style:left={pixelsToPercent(element.x, width)}
						style:top={pixelsToPercent(element.y, height)}
						style:width={pixelsToPercent(element.width, width)}
						style:height={pixelsToPercent(element.height, height)}
						style:z-index={element.zIndex}
						style:touch-action="none"
						onpointerdown={(e) => {
							startElementDrag(e, element);
						}}
						ontouchstart={(e) => {
							startElementDrag(e, element);
						}}
					>
						<CanvasElement
							{element}
							{isSelected}
							onResize={(event, direction) => handleElementResize(event, element, direction)}
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
