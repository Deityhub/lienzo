<script lang="ts">
	import '$lib/fonts/editor.css';
	import Canvas from './(components)/Canvas.svelte';
	import Toolbar from './(components)/Toolbar.svelte';
	import PropertyPanel from './(components)/PropertyPanel.svelte';
	import ExportModal from './(components)/ExportModal.svelte';
	import { Button, Seo } from '$lib/components';
	import { NameModal } from '$lib/components';
	import { isIndexedDBSupported, saveDocument, StorageQuotaError } from '$lib/stores/idb';
	import type { DocumentData } from '$lib/types/canvas';
	import type { ElementType, TCanvasInstance } from '$lib/types/canvas';
	import { appStore } from '$lib/stores/appStore.svelte.ts';
	import { CANVAS_WIDTH, CANVAS_HEIGHT, DISPLAY_SCALE } from '$lib/const/dimension';
	import { onMount } from 'svelte';
	import { browser } from '$app/environment';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { Download, Plus, Save } from '@lucide/svelte';
	import { Icons } from '$lib/icons';

	const pages = $derived(Object.values(appStore.getPages()));
	const canvasInstances = $state<Record<string, TCanvasInstance>>({});

	function setCanvasRefInstance(pageId: string, instance: TCanvasInstance) {
		canvasInstances[pageId] = instance;
	}

	function getCanvasRefInstance(pageId: string): TCanvasInstance | undefined {
		return canvasInstances[pageId];
	}

	function handleBackNavigation() {
		const currentDocument = appStore.getCurrentDocument();
		// If creating new document (name is empty), go to home page
		// If editing existing document (name has value), go to documents page
		const destination = currentDocument.name ? '/documents' : '/';
		goto(resolve(destination));
	}

	let exportModalOpen = $state(false);
	let saveModalOpen = $state(false);
	let savePending = $state(false);
	let saveError = $state('');

	function handleDragOver(event: DragEvent, pageId: string) {
		event.preventDefault();

		if (event.dataTransfer) {
			event.dataTransfer.dropEffect = 'copy';
		}

		// Update drag preview in the canvas component
		const canvasComponent = getCanvasRefInstance(pageId);
		if (canvasComponent && canvasComponent.updateDragPreview) {
			canvasComponent.updateDragPreview(event);
		}
	}

	function handleDrop(event: DragEvent, pageId: string) {
		event.preventDefault();

		if (!event.dataTransfer) return;

		try {
			const data = JSON.parse(event.dataTransfer.getData('application/json'));
			// Use currentTarget (the canvas element), not target (which could be a child)
			const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
			const page = appStore.getPages()[pageId];

			if (!page) return;

			// Calculate position relative to the canvas
			const scaleX = CANVAS_WIDTH / rect.width;
			const scaleY = CANVAS_HEIGHT / rect.height;

			let x = (event.clientX - rect.left) * scaleX;
			let y = (event.clientY - rect.top) * scaleY;

			const SNAP_THRESHOLD = 10;
			const { horizontal, vertical } = page.boundaries;

			// Calculate dynamic element dimensions based on drop position
			// Width: from drop position to right boundary
			let elementWidth = horizontal.end - x;
			// Height: default 500px or remaining space, whichever is smaller
			let elementHeight = Math.min(500, vertical.end - y);

			// Ensure minimum dimensions
			const MIN_WIDTH = 100;
			const MIN_HEIGHT = 50;

			if (elementWidth < MIN_WIDTH) {
				elementWidth = Math.min(MIN_WIDTH, horizontal.end - horizontal.start);
			}
			if (elementHeight < MIN_HEIGHT) {
				elementHeight = Math.min(MIN_HEIGHT, vertical.end - vertical.start);
			}

			// Snap to boundaries
			if (Math.abs(x - horizontal.start) < SNAP_THRESHOLD) {
				x = horizontal.start;
				elementWidth = horizontal.end - horizontal.start;
			}
			if (Math.abs(x - horizontal.end) < SNAP_THRESHOLD) {
				x = horizontal.end - elementWidth;
			}
			if (Math.abs(y - vertical.start) < SNAP_THRESHOLD) {
				y = vertical.start;
			}
			if (Math.abs(y - vertical.end) < SNAP_THRESHOLD) {
				y = vertical.end - elementHeight;
			}

			// Enforce boundaries - ensure element fits within bounds
			const boundedX = Math.max(horizontal.start, Math.min(x, horizontal.end - elementWidth));
			const boundedY = Math.max(vertical.start, Math.min(y, vertical.end - elementHeight));

			// Check if dropping on an existing element (search all elements, topmost first)
			const allElements = Object.values(page.elements).sort((a, b) => b.zIndex - a.zIndex);
			let parentElementId: string | null = null;
			for (const element of allElements) {
				if (
					boundedX >= element.x &&
					boundedX <= element.x + element.width &&
					boundedY >= element.y &&
					boundedY <= element.y + element.height
				) {
					parentElementId = element.id;
					break;
				}
			}

			appStore.addElement({
				type: data.type as ElementType,
				x: boundedX,
				y: boundedY,
				pageId: pageId,
				width: elementWidth,
				height: elementHeight,
				parentElementId
			});

			// Clear drag preview
			const canvasComponent = getCanvasRefInstance(pageId);
			if (canvasComponent && canvasComponent.clearDragPreview) {
				canvasComponent.clearDragPreview();
			}
		} catch (error) {
			// Error parsing drag data - silently handle for better UX
			console.error('Error parsing drag data: ', error);
		}
	}

	const handleExport = () => {
		appStore.selectElement(null);
		exportModalOpen = true;
	};

	let isIndexedDbSupported = $state(false);

	const MIN_SCALE = 0.12;
	const MIN_WIDTH = 360;
	const MAX_WIDTH = 1440;

	function calculateScale(width: number) {
		if (width >= MAX_WIDTH) return DISPLAY_SCALE;
		if (width <= MIN_WIDTH) return MIN_SCALE;

		const range = MAX_WIDTH - MIN_WIDTH;
		const progress = (width - MIN_WIDTH) / range;
		const scaleDelta = DISPLAY_SCALE - MIN_SCALE;
		return Number((MIN_SCALE + progress * scaleDelta).toFixed(3));
	}

	const getInitialScale = () => {
		if (!browser) return DISPLAY_SCALE; // Default fallback for SSR

		const MIN_SCALE = 0.12;
		const MIN_WIDTH = 360;
		const MAX_WIDTH = 1440;

		const width = Math.min(
			window.innerWidth,
			document.documentElement.clientWidth || 0,
			window.screen.width || 0
		);

		if (width >= MAX_WIDTH) return DISPLAY_SCALE;
		if (width <= MIN_WIDTH) return MIN_SCALE;

		const range = MAX_WIDTH - MIN_WIDTH;
		const progress = (width - MIN_WIDTH) / range;
		const scaleDelta = DISPLAY_SCALE - MIN_SCALE;
		return Number((MIN_SCALE + progress * scaleDelta).toFixed(3));
	};

	// Set initial scale immediately
	if (browser) {
		const initialScale = getInitialScale();
		appStore.setScale(initialScale);
	}

	onMount(() => {
		isIndexedDbSupported = isIndexedDBSupported();

		// Use RAF to ensure we get the most up-to-date dimensions
		const updateScale = () => {
			requestAnimationFrame(() => {
				const width = Math.min(
					window.innerWidth,
					document.documentElement.clientWidth || 0,
					window.screen.width || 0
				);
				const nextScale = calculateScale(width);
				appStore.setScale(nextScale);
			});
		};

		// Initial update
		updateScale();

		// Debounced resize handler
		let resizeTimer: ReturnType<typeof setTimeout>;
		const handleResize = () => {
			clearTimeout(resizeTimer);
			resizeTimer = setTimeout(updateScale, 100);
		};

		// Use both resize and orientation change events
		window.addEventListener('resize', handleResize, { passive: true });
		window.addEventListener('orientationchange', handleResize, { passive: true });

		// Visual viewport changes (for mobile browsers)
		let vpResizeTimer: ReturnType<typeof setTimeout>;
		const handleVisualViewportResize = () => {
			clearTimeout(vpResizeTimer);
			vpResizeTimer = setTimeout(updateScale, 100);
		};

		if (window.visualViewport) {
			window.visualViewport.addEventListener('resize', handleVisualViewportResize, {
				passive: true
			});
		}

		return () => {
			clearTimeout(resizeTimer);
			clearTimeout(vpResizeTimer);
			window.removeEventListener('resize', handleResize);
			window.removeEventListener('orientationchange', handleResize);
			if (window.visualViewport) {
				window.visualViewport.removeEventListener('resize', handleVisualViewportResize);
			}
		};
	});
</script>

<Seo title="Editor – Lienzo" path="/canvas" noindex />

<div class="flex h-screen overflow-hidden">
	<!-- Toolbar -->
	<Toolbar />

	<!-- Page Navigation -->
	<div
		class="absolute top-0 z-9999 w-full border-b border-primary/10 bg-background/80 p-4 backdrop-blur-md"
	>
		<div
			class="flex items-center justify-between gap-2.5 max-sm:flex-col max-sm:items-start md:flex-nowrap md:gap-0"
		>
			<div class="flex items-center gap-4">
				<div class="hidden items-center justify-between p-2 md:flex">
					<div
						onclick={() => goto(resolve('/'))}
						class="flex cursor-pointer items-center gap-2 overflow-hidden"
						role="button"
						tabindex="0"
						aria-label="Go to home"
						onkeydown={null}
					>
						<div class="flex h-12 w-12 flex-shrink-0 items-center justify-center">
							<Icons.Logo />
						</div>
					</div>
				</div>

				<div class="flex items-center gap-4">
					<Button
						disabled={savePending}
						onClick={appStore.addPage}
						variant="primary"
						data-testid="add-page-btn"
					>
						<Plus class="mr-2 h-4 w-4" />
						Add Page
					</Button>
					<span class="mr-4 text-sm text-muted-foreground" data-testid="page-count">
						{pages.length}
						{pages.length > 1 ? 'Pages' : 'Page'}
					</span>
				</div>
			</div>

			<div class="flex items-center gap-2">
				<Button onClick={handleBackNavigation} variant="ghost" data-testid="back-btn">
					Cancel
				</Button>
				{#if isIndexedDbSupported}
					<Button
						disabled={savePending}
						pending={savePending}
						onClick={() => (saveModalOpen = true)}
						variant="primary"
						data-testid="save-btn"
					>
						<Save class="mr-2 h-4 w-4" />
						Save
					</Button>
				{/if}
				<Button
					disabled={savePending}
					onClick={handleExport}
					variant="primary"
					data-testid="export-btn"
				>
					<Download class="mr-2 h-4 w-4" />
					Export PDF
				</Button>
			</div>
		</div>
	</div>

	<!-- Main Canvas Area -->
	<div class="flex flex-1 flex-col">
		<div
			class="flex-1 overflow-auto p-8 pt-36 max-lg:pb-50 max-md:pt-42 max-sm:pt-58"
			data-testid="canvas-container"
		>
			<div class="flex flex-col items-center justify-center gap-12">
				{#each pages as page (page.id)}
					<Canvas
						bind:this={canvasInstances[page.id]}
						{page}
						showDeleteButton={pages.length > 1}
						width={CANVAS_WIDTH}
						height={CANVAS_HEIGHT}
						data-page-id={page.id}
						onDragover={(e) => handleDragOver(e, page.id)}
						onDrop={(e) => handleDrop(e, page.id)}
						onMount={(instance: TCanvasInstance) => setCanvasRefInstance(page.id, instance)}
					/>
				{/each}
			</div>
		</div>
	</div>

	<!-- Save Document Modal -->
	{#if saveModalOpen}
		<NameModal
			isOpen={saveModalOpen}
			onClose={() => {
				saveModalOpen = false;
				saveError = '';
			}}
			onSave={async (name: string) => {
				if (!name) return;
				savePending = true;
				try {
					const document: DocumentData = {
						...appStore.getCurrentDocument(),
						name
					};
					await saveDocument(document);
					appStore.updateCurrentDocument({ name });
					saveModalOpen = false;
					saveError = '';
				} catch (err) {
					saveError =
						err instanceof StorageQuotaError
							? err.message
							: 'Failed to save. Please try again: ' + err;
				} finally {
					savePending = false;
				}
			}}
			initialName={appStore.getCurrentDocument().name}
		>
			{#if saveError}
				<div class="mt-2 text-sm text-destructive">{saveError}</div>
			{/if}
		</NameModal>
	{/if}

	<!-- Property Panel -->
	<PropertyPanel />

	<!-- Export Modal -->
	<ExportModal isOpen={exportModalOpen} onClose={() => (exportModalOpen = false)} />
</div>
