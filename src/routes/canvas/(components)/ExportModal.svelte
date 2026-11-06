<script lang="ts">
	import { Modal } from '$lib/components';
	import { appStore } from '$lib/stores/appStore.svelte.ts';
	import { downloadBlob } from '$lib/utils/download';
	import { safeFileName } from '$lib/utils/fileName';
	import { serializeDocuments } from '$lib/utils/documentFile';
	import { getPageImageData } from '$lib/utils/canvas';
	import { CANVAS_WIDTH, CANVAS_HEIGHT } from '$lib/const/dimension';
	import { CircleAlert, CircleCheck, Paperclip, TriangleAlert } from '@lucide/svelte';
	import { untrack } from 'svelte';

	interface Props {
		isOpen: boolean;
		onClose: () => void;
	}

	const { isOpen, onClose }: Props = $props();

	// Canvas dimensions in mm (A4 at 300 DPI)
	const DPI = 300;
	const MM_PER_INCH = 25.4;
	const pageWidth = Math.round((CANVAS_WIDTH / DPI) * MM_PER_INCH);
	const pageHeight = Math.round((CANVAS_HEIGHT / DPI) * MM_PER_INCH);

	type Phase = 'preparing' | 'ready' | 'exporting' | 'done' | 'error';

	let phase = $state<Phase>('preparing');
	let previews = $state<string[]>([]);
	let previewFailed = $state(false);
	let fileName = $state('');
	let fileNameError = $state('');
	let progress = $state({ done: 0, total: 0 });
	let warnings = $state<string[]>([]);
	let savedAs = $state('');
	let session = 0; // a new one for every opening, so a late preview never lands in a later dialog

	const pageCount = $derived(Object.keys(appStore.getPages()).length);
	const percent = $derived(progress.total ? Math.round((progress.done / progress.total) * 100) : 0);
	// Only while the PDF is being made is the dialog locked: the preview may still be drawing and can be left
	const busy = $derived(phase === 'exporting');

	// Open: start from the document's name and draw a preview of each page
	$effect(() => {
		if (isOpen) untrack(() => void prepare());
	});

	async function prepare() {
		const current = ++session;
		phase = 'preparing';
		previews = [];
		previewFailed = false;
		warnings = [];
		fileNameError = '';
		fileName = safeFileName(appStore.getCurrentDocument().name) || 'Untitled document';

		try {
			const images: string[] = [];
			for (const page of Object.values(appStore.getPages())) {
				const image = await getPageImageData(page, appStore.getScale());
				if (!image) throw new Error('Could not draw a page');
				images.push(image);
			}
			if (current !== session) return;
			previews = images;
		} catch (error) {
			console.error('Error generating preview: ', error);
			if (current === session) previewFailed = true; // the PDF can still be made without it
		}
		if (current === session) phase = 'ready';
	}

	async function exportPdf() {
		const name = safeFileName(fileName);
		if (!name) {
			fileNameError = 'Enter a file name.';
			return;
		}
		fileNameError = '';
		const current = session;
		phase = 'exporting';
		progress = { done: 0, total: pageCount };
		warnings = [];

		try {
			// Real text and vector shapes, with the editable document embedded so it can be imported back
			const { renderDocumentPdf } = await import('$lib/pdf/renderDocument');
			const document = appStore.getCurrentDocument();
			const result = await renderDocumentPdf(
				document,
				serializeDocuments([document]),
				name,
				(done, total) => (progress = { done, total })
			);
			downloadBlob(
				`${name}.pdf`,
				new Blob([new Uint8Array(result.bytes)], { type: 'application/pdf' })
			);
			if (current !== session) return;
			warnings = result.warnings;
			savedAs = `${name}.pdf`;
			phase = 'done';
		} catch (error) {
			console.error('Error generating PDF: ', error);
			if (current === session) phase = 'error';
		}
	}

	function close() {
		if (!busy) {
			session++; // anything still in flight belongs to this dialog and is dropped
			onClose();
		}
	}

	const acceptLabel = $derived(
		phase === 'exporting'
			? 'Generating PDF…'
			: phase === 'done'
				? 'Export again'
				: phase === 'error'
					? 'Try again'
					: 'Export PDF'
	);
</script>

{#if isOpen}
	<Modal
		open={true}
		size="lg"
		title="Export PDF"
		description={`A4 (${pageWidth} × ${pageHeight} mm), ${pageCount} page${pageCount === 1 ? '' : 's'}. Text stays selectable, fonts are embedded and your editable document travels inside the file.`}
		onCancel={close}
		onAccept={exportPdf}
		{acceptLabel}
		cancelLabel={phase === 'done' ? 'Close' : 'Cancel'}
		disableActions={busy}
		isPending={phase === 'exporting'}
	>
		<div class="flex flex-col gap-5" data-testid="export-dialog">
			<!-- the pages as they will be drawn -->
			<div class="rounded-lg border border-border bg-surface p-4">
				{#if phase === 'preparing'}
					<div class="flex justify-center gap-4" role="status" aria-label="Preparing the preview">
						<div class="h-60 w-44 animate-pulse rounded bg-muted"></div>
						<div class="hidden h-60 w-44 animate-pulse rounded bg-muted sm:block"></div>
					</div>
				{:else if previewFailed}
					<p class="py-6 text-center text-sm text-muted-foreground">
						The preview could not be drawn, but the PDF can still be exported.
					</p>
				{:else}
					<div class="flex max-h-72 flex-wrap justify-center gap-5 overflow-y-auto">
						{#each previews as preview, index (index)}
							<figure class="flex flex-col items-center gap-2">
								<img
									src={preview}
									alt={`Preview of page ${index + 1}`}
									class="h-60 w-auto rounded-sm border border-border bg-paper shadow-md"
								/>
								<figcaption class="text-xs text-muted-foreground">Page {index + 1}</figcaption>
							</figure>
						{/each}
					</div>
				{/if}
			</div>

			<div class="flex flex-col gap-1.5">
				<label for="export-file-name" class="text-sm font-semibold">File name</label>
				<div class="flex items-center gap-2">
					<input
						id="export-file-name"
						type="text"
						bind:value={fileName}
						maxlength="100"
						disabled={busy}
						aria-invalid={fileNameError ? true : undefined}
						aria-describedby={fileNameError ? 'export-file-name-error' : undefined}
						data-testid="export-file-name"
						class="h-9 min-w-0 flex-1 rounded border border-input border-b-primary bg-background px-3 text-sm text-foreground focus:ring-2 focus:ring-ring focus:outline-none disabled:opacity-50"
					/>
					<span class="text-sm text-muted-foreground">.pdf</span>
				</div>
				{#if fileNameError}
					<p id="export-file-name-error" class="text-sm text-destructive-text" role="alert">
						{fileNameError}
					</p>
				{/if}
			</div>

			{#if phase === 'ready' || phase === 'preparing'}
				<div
					class="flex items-start gap-3 rounded-lg border border-primary-text bg-primary-light px-4 py-3 text-sm"
				>
					<Paperclip class="mt-0.5 h-5 w-5 flex-none text-primary-text" aria-hidden="true" />
					<p>
						<strong class="font-semibold">lienzo-document.json is attached.</strong>
						<span class="text-muted-foreground"
							>Import this PDF back into Lienzo any time to keep editing it.</span
						>
					</p>
				</div>
			{/if}

			{#if phase === 'exporting'}
				<div class="flex flex-col gap-2" role="status">
					<div class="flex justify-between text-sm">
						<span
							>Drawing page {Math.min(progress.done + 1, progress.total)} of {progress.total}…</span
						>
						<span class="text-muted-foreground">{percent}%</span>
					</div>
					<div
						class="h-1.5 rounded-full bg-border"
						role="progressbar"
						aria-label="Export progress"
						aria-valuemin={0}
						aria-valuemax={100}
						aria-valuenow={percent}
					>
						<div
							class="h-1.5 rounded-full bg-primary transition-all duration-300"
							style:width="{percent}%"
						></div>
					</div>
				</div>
			{/if}

			{#if phase === 'done'}
				<div class="flex flex-col gap-2.5" role="status" data-testid="export-done">
					<div
						class="flex items-center gap-2.5 rounded-lg border border-success bg-success-light px-4 py-3 text-sm"
					>
						<CircleCheck class="h-5 w-5 flex-none text-success" aria-hidden="true" />
						<p>
							<strong class="font-semibold">{savedAs} was saved.</strong>
							Check your downloads folder.
						</p>
					</div>
					{#each warnings as warning (warning)}
						<div
							class="flex items-start gap-2.5 rounded-lg border border-warning bg-warning-light px-4 py-3 text-sm"
							data-testid="export-warning"
						>
							<TriangleAlert
								class="mt-0.5 h-5 w-5 flex-none text-warning-dark"
								aria-hidden="true"
							/>
							<p>{warning}</p>
						</div>
					{/each}
				</div>
			{/if}

			{#if phase === 'error'}
				<div
					class="flex items-start gap-2.5 rounded-lg border border-destructive bg-destructive-light px-4 py-3 text-sm"
					role="alert"
					data-testid="export-error"
				>
					<CircleAlert class="mt-0.5 h-5 w-5 flex-none text-destructive-text" aria-hidden="true" />
					<p>
						<strong class="font-semibold text-destructive-text"
							>The PDF could not be created.</strong
						>
						Please try again. If it keeps failing, export your document as a .lienzo.json file from the
						Documents page so nothing is lost.
					</p>
				</div>
			{/if}
		</div>
	</Modal>
{/if}
