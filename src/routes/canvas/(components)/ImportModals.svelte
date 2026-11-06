<script lang="ts">
	import { Modal } from '$lib/components';
	import type { createCanvasImport } from '$lib/canvas/canvasImport.svelte';

	const { importer }: { importer: ReturnType<typeof createCanvasImport> } = $props();
</script>

<Modal
	open={importer.pending !== null}
	title="Replace the current canvas?"
	acceptLabel="Replace canvas"
	onCancel={() => importer.cancel()}
	onAccept={() => importer.confirm()}
	closeFromBackdrop={true}
>
	<p class="text-sm text-muted-foreground" data-testid="canvas-import-confirm">
		Importing "{importer.pending?.name}" replaces everything on the canvas. Unsaved changes will be
		lost.
	</p>
</Modal>

<Modal
	open={importer.error !== ''}
	title="Couldn't import the file"
	onCancel={() => importer.dismissError()}
	showAcceptAction={false}
	cancelLabel="Close"
	closeFromBackdrop={true}
>
	<p class="text-sm text-destructive" data-testid="canvas-import-error">{importer.error}</p>
</Modal>
