<script lang="ts">
	import { Modal } from '$lib/components';
	import { NameModal } from '$lib/components';
	import { appStore } from '$lib/stores/appStore.svelte.ts';
	import { downloadBlob } from '$lib/utils/download';
	import { serializeDocuments } from '$lib/utils/documentFile';
	import { getPageImageData } from '$lib/utils/canvas';
	import { CANVAS_WIDTH, CANVAS_HEIGHT } from '$lib/const/dimension';

	interface Props {
		isOpen: boolean;
		onClose: () => void;
	}

	const { isOpen, onClose }: Props = $props();

	// Canvas dimensions in mm (A4 at 300 DPI)
	const DPI = 300;
	const MM_PER_INCH = 25.4;
	const pageWidth = (CANVAS_WIDTH / DPI) * MM_PER_INCH;
	const pageHeight = (CANVAS_HEIGHT / DPI) * MM_PER_INCH;

	let isGenerating = $state(false);
	let progress = $state(0);
	let showPreview = $state(false);
	let previewImages = $state<string[]>([]);
	let isGeneratingPreview = $state(false);
	let nameModalOpen = $state(false);
	let documentName = $derived(appStore.getCurrentDocument()?.name || '');

	async function generatePreview() {
		if (isGeneratingPreview) return;
		isGeneratingPreview = true;
		showPreview = false;
		try {
			const pages = Object.values(appStore.getPages());
			const previewCanvases: string[] = [];
			for (let i = 0; i < pages.length; i++) {
				const page = pages[i];

				// Use the utility function to create export canvas
				// and Convert to image data
				const scale = appStore.getScale();
				const imgData = await getPageImageData(page, scale);

				previewCanvases.push(imgData);
			}
			previewImages = previewCanvases;
			showPreview = true;
		} catch (_error) {
			alert('Error generating preview. Please try again.');
			console.error('Error generating preview: ', _error);
		} finally {
			isGeneratingPreview = false;
		}
	}

	async function confirmAndExportPDF() {
		if (isGenerating) return;
		if (!documentName) {
			nameModalOpen = true;
			return;
		}
		isGenerating = true;
		try {
			// Real text and vector shapes, with the editable document embedded so it can be imported back
			const { renderDocumentPdf } = await import('$lib/pdf/renderDocument');
			const document = appStore.getCurrentDocument();
			const { bytes, warnings } = await renderDocumentPdf(
				document,
				serializeDocuments([document]),
				documentName
			);
			progress = 100;
			downloadBlob(
				`${documentName || 'document'}.pdf`,
				new Blob([new Uint8Array(bytes)], { type: 'application/pdf' })
			);
			if (warnings.length) alert(`The PDF was exported, but:\n\n${warnings.join('\n')}`);
		} catch (_error) {
			alert('Error generating PDF. Please try again.');
			console.error('Error generating PDF: ', _error);
		} finally {
			isGenerating = false;
			progress = 0;
			showPreview = false;
			onClose();
		}
	}

	function handleClose() {
		if (!isGenerating && !isGeneratingPreview) onClose();
	}

	function handleNameSave(name: string) {
		appStore.updateCurrentDocument({ name });
		documentName = name;
		nameModalOpen = false;

		// Continue export after getting name
		confirmAndExportPDF();
	}
</script>

{#if isOpen}
	{#if nameModalOpen}
		<NameModal
			isOpen={nameModalOpen}
			onClose={() => (nameModalOpen = false)}
			onSave={handleNameSave}
			initialName={documentName}
		/>
	{:else if showPreview}
		<Modal
			open={true}
			title="PDF Preview"
			description={`Here's how your document will appear in the PDF using the exact canvas dimensions of (${Math.round(pageWidth)}mm × ${Math.round(pageHeight)}mm). ${previewImages.length} page${previewImages.length > 1 ? 's' : ''}.`}
			onCancel={() => {
				showPreview = false;
			}}
			onAccept={confirmAndExportPDF}
			acceptLabel={isGenerating ? 'Generating PDF...' : 'Export PDF'}
			disableActions={isGenerating}
			cancelLabel="Back to Options"
		>
			{#if isGenerating}
				<div class="mb-4">
					<div class="mb-2 flex items-center justify-between">
						<span class="text-sm text-muted-foreground">Generating PDF...</span>
						<span class="text-sm text-muted-foreground">{progress}%</span>
					</div>
					<div class="h-2 w-full rounded-full bg-muted">
						<div
							class="h-2 rounded-full bg-primary transition-all duration-300"
							style={`width: ${progress}%`}
						></div>
					</div>
				</div>
			{/if}

			<div
				class="grid max-h-[calc(100vh-24rem)] gap-4 overflow-y-auto"
				class:grid-cols-1={previewImages.length === 1}
				class:grid-cols-2={previewImages.length > 1}
			>
				{#each previewImages as previewImage, index (index)}
					<div class="rounded-lg border border-border bg-background p-2">
						<div class="mb-2 text-sm text-muted-foreground">Page {index + 1}</div>
						<img
							src={previewImage}
							alt={`Document preview page ${index + 1}`}
							class="h-auto w-full rounded border border-border shadow-sm"
							style="max-height: 400px; object-fit: contain;"
						/>
					</div>
				{/each}
			</div>
		</Modal>
	{:else}
		<Modal
			open={true}
			title="Export Document"
			description={`Your document will be exported as a PDF using the exact canvas dimensions of (${Math.round(pageWidth)}mm × ${Math.round(pageHeight)}mm).`}
			onCancel={handleClose}
			onAccept={generatePreview}
			acceptLabel={isGeneratingPreview ? 'Generating Preview...' : 'Preview PDF'}
			disableActions={isGeneratingPreview}
		>
			{#if isGeneratingPreview}
				<div class="mb-4">
					<div class="mb-2 flex items-center justify-between">
						<span class="text-sm text-muted-foreground">Generating Preview...</span>
					</div>
					<div class="h-2 w-full rounded-full bg-muted">
						<div class="h-2 animate-pulse rounded-full bg-primary" style="width: 100%"></div>
					</div>
				</div>
			{/if}
		</Modal>
	{/if}
{/if}
