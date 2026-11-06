<script lang="ts">
	import '$lib/fonts/editor.css';
	import Canvas from './(components)/Canvas.svelte';
	import Toolbar from './(components)/Toolbar.svelte';
	import PropertyPanel from './(components)/PropertyPanel.svelte';
	import ExportModal from './(components)/ExportModal.svelte';
	import CanvasHeader from './(components)/CanvasHeader.svelte';
	import ImportModals from './(components)/ImportModals.svelte';
	import { NameModal, Seo } from '$lib/components';
	import { isIndexedDBSupported } from '$lib/stores/idb';
	import type { ElementType, TCanvasInstance } from '$lib/types/canvas';
	import { appStore } from '$lib/stores/appStore.svelte.ts';
	import { CANVAS_WIDTH, CANVAS_HEIGHT } from '$lib/const/dimension';
	import { newElementPlacement } from '$lib/utils/geometry';
	import { displayScaleForWidth, trackDisplayScale, viewportWidth } from '$lib/utils/viewport';
	import { saveCurrentDocument } from '$lib/canvas/saveDocument';
	import { createCanvasImport } from '$lib/canvas/canvasImport.svelte';
	import { createAutosave } from '$lib/canvas/autosave.svelte';
	import { onMount } from 'svelte';
	import { browser } from '$app/environment';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';

	const pages = $derived(Object.values(appStore.getPages()));
	const canvasInstances = $state<Record<string, TCanvasInstance>>({});

	async function handleBackNavigation() {
		// Edits are saved automatically; finish saving before leaving
		await autosave.flush();
		if (
			autosave.status === 'error' &&
			!confirm('Your latest changes could not be saved. Leave anyway?')
		) {
			return;
		}
		// A document without a name was never edited: go home. Otherwise back to the documents list.
		goto(resolve(appStore.getCurrentDocument().name ? '/documents' : '/'));
	}

	// Dropping a tool from the toolbar onto a page
	function handleDragOver(event: DragEvent, pageId: string) {
		event.preventDefault();
		if (event.dataTransfer) event.dataTransfer.dropEffect = 'copy';

		canvasInstances[pageId]?.updateDragPreview?.(event);
	}

	function handleDrop(event: DragEvent, pageId: string) {
		event.preventDefault();
		if (!event.dataTransfer) return;

		try {
			const data = JSON.parse(event.dataTransfer.getData('application/json'));
			const page = appStore.getPages()[pageId];
			if (!page) return;

			// Position relative to the canvas, in page pixels. Use currentTarget (the canvas), not target (a child).
			const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
			const point = {
				x: (event.clientX - rect.left) * (CANVAS_WIDTH / rect.width),
				y: (event.clientY - rect.top) * (CANVAS_HEIGHT / rect.height)
			};
			const placement = newElementPlacement(point, page.boundaries, Object.values(page.elements));

			appStore.addElement({ type: data.type as ElementType, pageId, ...placement });
			canvasInstances[pageId]?.clearDragPreview?.();
		} catch (error) {
			// Error parsing drag data - silently handle for better UX
			console.error('Error parsing drag data: ', error);
		}
	}

	let exportModalOpen = $state(false);
	const handleExport = () => {
		appStore.selectElement(null);
		exportModalOpen = true;
	};

	// Saving
	let isIndexedDbSupported = $state(false);
	let saveModalOpen = $state(false);
	let savePending = $state(false);
	let saveError = $state('');

	async function handleSave(name: string) {
		if (!name) return;
		savePending = true;
		saveError = (await saveCurrentDocument(name)) ?? '';
		if (!saveError) {
			autosave.markSaved();
			saveModalOpen = false;
		}
		savePending = false;
	}

	// Autosave: edits are saved shortly after they are made, once the browser can store them
	const autosave = createAutosave({
		getRevision: appStore.getRevision,
		getName: () => appStore.getCurrentDocument().name,
		save: saveCurrentDocument
	});
	$effect(() => {
		const revision = appStore.getRevision();
		const id = appStore.getCurrentDocument().id;
		if (isIndexedDbSupported) autosave.changed(id, revision);
	});

	// Importing a document file into the canvas
	const importer = createCanvasImport(
		() => pages.length > 1 || pages.some((page) => Object.keys(page.elements).length > 0)
	);

	// Scale the page to the screen: right away (before the first paint) and whenever the screen changes
	if (browser) appStore.setScale(displayScaleForWidth(viewportWidth()));

	onMount(() => {
		isIndexedDbSupported = isIndexedDBSupported();
		const stopTracking = trackDisplayScale((scale) => appStore.setScale(scale));

		// Save pending edits when the tab is hidden or closed, and warn if they could not be saved
		const flush = () => {
			if (document.visibilityState === 'hidden') void autosave.flush();
		};
		const warn = (event: BeforeUnloadEvent) => {
			if (autosave.hasUnsaved) event.preventDefault();
		};
		// Delete removes the selected elements (but not while typing in a field)
		const deleteSelected = (event: KeyboardEvent) => {
			if (event.key !== 'Delete' && event.key !== 'Backspace') return;
			const target = event.target as HTMLElement | null;
			if (target?.closest('input, textarea, select, [contenteditable="true"]')) return;
			const selected = appStore.getSelectedElements();
			if (!selected.length) return;
			event.preventDefault();
			appStore.deleteElements(
				selected.map((el) => el.id),
				selected[0].pageId
			);
		};
		document.addEventListener('keydown', deleteSelected);
		document.addEventListener('visibilitychange', flush);
		window.addEventListener('pagehide', flush);
		window.addEventListener('beforeunload', warn);

		return () => {
			stopTracking();
			document.removeEventListener('keydown', deleteSelected);
			document.removeEventListener('visibilitychange', flush);
			window.removeEventListener('pagehide', flush);
			window.removeEventListener('beforeunload', warn);
			void autosave.flush(); // leaving the editor
		};
	});
</script>

<Seo title="Editor – Lienzo" path="/canvas" noindex />

<div class="flex h-screen overflow-hidden">
	<Toolbar />

	<CanvasHeader
		pageCount={pages.length}
		busy={savePending}
		canSave={isIndexedDbSupported}
		saveStatus={autosave.status}
		saveError={autosave.error}
		onRetrySave={() => autosave.retry()}
		onBack={handleBackNavigation}
		onSave={() => (saveModalOpen = true)}
		onExport={handleExport}
		onImportFile={(file) => importer.importFile(file)}
	/>

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
						onMount={(instance: TCanvasInstance) => (canvasInstances[page.id] = instance)}
					/>
				{/each}
			</div>
		</div>
	</div>

	{#if saveModalOpen}
		<NameModal
			isOpen={saveModalOpen}
			onClose={() => {
				saveModalOpen = false;
				saveError = '';
			}}
			onSave={handleSave}
			initialName={appStore.getCurrentDocument().name}
		>
			{#if saveError}
				<div class="mt-2 text-sm text-destructive">{saveError}</div>
			{/if}
		</NameModal>
	{/if}

	<ImportModals {importer} />
	<PropertyPanel />
	<ExportModal isOpen={exportModalOpen} onClose={() => (exportModalOpen = false)} />
</div>
