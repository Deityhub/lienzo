<script lang="ts">
	import { appStore } from '$lib/stores/appStore.svelte.ts';
	import { targetPageId } from '$lib/canvas/targetPage';
	import { newElementPlacement } from '$lib/utils/geometry';
	import { BoxSelect, FilePlus, Image as ImageIcon, Shapes, Type } from '@lucide/svelte';
	type ElementType = 'text' | 'shape' | 'image';
	type TouchEventType = TouchEvent & { currentTarget: EventTarget & HTMLElement };

	const tools = [
		{ type: 'text' as ElementType, label: 'Text', icon: Type },
		{ type: 'shape' as ElementType, label: 'Shape', icon: Shapes },
		{ type: 'image' as ElementType, label: 'Image', icon: ImageIcon }
	];

	const multiSelectMode = $derived(appStore.getMultiSelectMode());

	/** Add an element without dragging: on the page last clicked, a little lower for each one already there. */
	function addTool(type: ElementType) {
		const pageId = targetPageId();
		const page = pageId ? appStore.getPages()[pageId] : null;
		if (!pageId || !page) return;

		const { horizontal, vertical } = page.boundaries;
		const count = Object.keys(page.elements).length;
		const point = { x: horizontal.start + 60, y: vertical.start + 60 + 60 * (count % 8) };
		const placement = newElementPlacement(point, page.boundaries, Object.values(page.elements));
		appStore.addElement({ type, pageId, ...placement });
	}

	let toolbarRef: HTMLElement;
	let isDragging = $state(false);
	let dataTransfer: DataTransfer | null = null;

	let touchStartX = 0;
	let touchStartY = 0;
	let lastCanvas: Element | null = $state(null);

	function handleDragStart(event: DragEvent, type: ElementType) {
		if (!event.dataTransfer) return;

		event.dataTransfer.effectAllowed = 'copy';
		event.dataTransfer.setData('application/json', JSON.stringify({ type }));
		isDragging = true;
	}

	function handleTouchStart(event: TouchEventType, type: ElementType) {
		const touch = event.touches[0];
		touchStartX = touch.clientX;
		touchStartY = touch.clientY;

		// Create data transfer for the drag operation
		dataTransfer = new DataTransfer();
		dataTransfer.effectAllowed = 'copy';
		dataTransfer.setData('application/json', JSON.stringify({ type }));
		isDragging = true;
	}

	function handleTouchMove(event: TouchEventType) {
		if (!isDragging || !dataTransfer) return;

		const touch = event.touches[0];
		const deltaX = Math.abs(touch.clientX - touchStartX);
		const deltaY = Math.abs(touch.clientY - touchStartY);

		// Only start dragging if moved beyond threshold
		if (deltaX > 10 || deltaY > 10) {
			// Find the element under the touch
			const elementBelow = document.elementFromPoint(touch.clientX, touch.clientY);

			// Check if it's a canvas element
			const canvas = elementBelow?.closest('[data-testid="document-canvas"]');

			if (canvas) {
				// If we were previously over a different canvas, dispatch dragleave to it
				if (lastCanvas !== canvas) {
					const dragleaveEvent = new DragEvent('dragleave', {
						bubbles: true,
						cancelable: true,
						clientX: touch.clientX,
						clientY: touch.clientY,
						relatedTarget: canvas
					});

					lastCanvas?.dispatchEvent(dragleaveEvent);
				}

				const dragoverEvent = new DragEvent('dragover', {
					bubbles: true,
					cancelable: true,
					clientX: touch.clientX,
					clientY: touch.clientY,
					dataTransfer: dataTransfer
				});

				canvas.dispatchEvent(dragoverEvent);

				lastCanvas = canvas;
			} else {
				// If we're not over any canvas and we were previously over one
				if (lastCanvas) {
					const dragleaveEvent = new DragEvent('dragleave', {
						bubbles: true,
						cancelable: true,
						clientX: touch.clientX,
						clientY: touch.clientY,
						relatedTarget: null
					});

					lastCanvas.dispatchEvent(dragleaveEvent);
					lastCanvas = null;
				}
			}
		}
	}

	function handleTouchEnd(event: TouchEventType) {
		if (!isDragging || !dataTransfer) return;

		const touch = event.changedTouches[0];
		const deltaX = Math.abs(touch.clientX - touchStartX);
		const deltaY = Math.abs(touch.clientY - touchStartY);

		if (deltaX > 10 || deltaY > 10) {
			// Find the element under the touch
			const elementBelow = document.elementFromPoint(touch.clientX, touch.clientY);

			// Check if it's a canvas element
			const canvas = elementBelow?.closest('[data-testid="document-canvas"]');

			if (canvas) {
				// Create and dispatch a drop event
				const dropEvent = new DragEvent('drop', {
					bubbles: true,
					cancelable: true,
					clientX: touch.clientX,
					clientY: touch.clientY,
					dataTransfer: dataTransfer
				});

				canvas.dispatchEvent(dropEvent);
			}
		}

		isDragging = false;
		dataTransfer = null;
	}

	function handleDragEnd() {
		isDragging = false;
		dataTransfer = null;
		lastCanvas = null;
	}
</script>

<!-- A rail on the left on tablets and desktops, a bar along the bottom on phones -->
<nav
	bind:this={toolbarRef}
	aria-label="Add to page"
	data-keep-selection
	class="flex border-border bg-surface transition-colors max-md:fixed max-md:inset-x-0 max-md:bottom-0 max-md:z-9999 max-md:h-16 max-md:border-t md:relative md:h-full md:w-[72px] md:flex-none md:flex-col md:items-center md:border-r md:pt-[65px]"
	class:bg-primary-light={isDragging}
	class:border-primary={isDragging}
>
	<div
		class="flex w-full flex-1 items-stretch justify-around md:flex-col md:items-center md:justify-center md:gap-2.5"
		data-testid="toolbar"
	>
		{#each tools as tool (tool.type)}
			<!-- Drag it onto a page, or tap or press Enter to add it -->
			<div
				data-testid="tool-{tool.type}"
				draggable="true"
				ondragstart={(e) => handleDragStart(e, tool.type)}
				ondragend={() => handleDragEnd()}
				ontouchstart={(e: TouchEventType) => handleTouchStart(e, tool.type)}
				ontouchmove={(e: TouchEventType) => handleTouchMove(e)}
				ontouchend={(e: TouchEventType) => handleTouchEnd(e)}
				ontouchcancel={() => handleDragEnd()}
				role="presentation"
				class="tool-item flex flex-1 justify-center md:w-full md:flex-none {isDragging
					? 'dragging'
					: ''}"
				style:touch-action="none"
			>
				<button
					type="button"
					onclick={() => addTool(tool.type)}
					title="Add {tool.label}, or drag it onto the page"
					class="flex w-full cursor-pointer flex-col items-center justify-center gap-1 rounded-md px-1 py-2 text-[11px] leading-none font-semibold text-foreground transition-colors hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none active:cursor-grabbing md:w-14"
				>
					<tool.icon class="h-[22px] w-[22px]" aria-hidden="true" />
					{tool.label}
				</button>
			</div>
		{/each}

		<!-- Only on phones: the header has no room for these -->
		<div class="flex flex-1 md:hidden" data-keep-selection>
			<button
				type="button"
				aria-pressed={multiSelectMode}
				onclick={() => appStore.setMultiSelectMode(!multiSelectMode)}
				data-testid="multi-select-bar-btn"
				class="flex w-full cursor-pointer flex-col items-center justify-center gap-1 rounded-md px-1 py-2 text-[11px] leading-none font-semibold text-foreground transition-colors hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none aria-pressed:bg-primary-light aria-pressed:text-primary-text"
			>
				<BoxSelect class="h-[22px] w-[22px]" aria-hidden="true" />
				Select
			</button>
		</div>
		<div class="flex flex-1 md:hidden">
			<button
				type="button"
				onclick={() => appStore.addPage()}
				data-testid="add-page-bar-btn"
				class="flex w-full cursor-pointer flex-col items-center justify-center gap-1 rounded-md px-1 py-2 text-[11px] leading-none font-semibold text-foreground transition-colors hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
			>
				<FilePlus class="h-[22px] w-[22px]" aria-hidden="true" />
				Page
			</button>
		</div>
	</div>
</nav>

<style>
	.tool-item.dragging {
		opacity: 0.5;
	}
</style>
