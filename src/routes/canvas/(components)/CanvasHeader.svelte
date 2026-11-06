<script lang="ts">
	import { Button, ThemeToggle } from '$lib/components';
	import { Icons } from '$lib/icons';
	import { appStore } from '$lib/stores/appStore.svelte.ts';
	import { resolve } from '$app/paths';
	import {
		BoxSelect,
		Check,
		ChevronLeft,
		ClipboardPaste,
		Download,
		LoaderCircle,
		Plus,
		Save,
		TriangleAlert,
		Upload
	} from '@lucide/svelte';
	import { clipboard } from '$lib/canvas/clipboard.svelte';
	import type { SaveStatus } from '$lib/canvas/autosave.svelte';

	interface Props {
		pageCount: number;
		/** A save is in progress: the actions are disabled */
		busy: boolean;
		/** Saving needs IndexedDB, which some browsers do not offer */
		canSave: boolean;
		/** Progress of the automatic saving */
		saveStatus: SaveStatus;
		saveError: string;
		onRetrySave: () => void;
		onBack: () => void;
		onSave: () => void;
		onExport: () => void;
		onImportFile: (file: File) => void;
	}

	const {
		pageCount,
		busy,
		canSave,
		saveStatus,
		saveError,
		onRetrySave,
		onBack,
		onSave,
		onExport,
		onImportFile
	}: Props = $props();

	const multiSelectMode = $derived(appStore.getMultiSelectMode());
	const documentName = $derived(appStore.getCurrentDocument().name || 'Untitled document');

	let importInput: HTMLInputElement | undefined = $state();

	function handleImportChange(event: Event) {
		const input = event.currentTarget as HTMLInputElement;
		const file = input.files?.[0];
		input.value = ''; // allow importing the same file again
		if (file) onImportFile(file);
	}
</script>

<header
	class="absolute top-0 z-9999 w-full border-b border-border bg-background/90 px-4 py-3 backdrop-blur-md"
>
	<div class="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
		<!-- where you are: back, the document, and how it is saved -->
		<div class="flex min-w-0 items-center gap-3">
			<Button onClick={onBack} variant="ghost" data-testid="back-btn" className="-ml-1 pl-2!">
				<ChevronLeft class="mr-1 h-5 w-5" aria-hidden="true" />
				Back
			</Button>
			<span class="hidden h-6 w-px bg-border sm:block" aria-hidden="true"></span>
			<a
				href={resolve('/')}
				aria-label="Lienzo home"
				class="hidden flex-none rounded focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none md:block"
			>
				<Icons.Logo width="28" height="28" />
			</a>
			<div class="flex min-w-0 flex-col">
				<h1 class="truncate text-sm leading-5 font-semibold" data-testid="document-title">
					{documentName}
				</h1>
				<div class="flex items-center gap-1.5 text-xs leading-4 text-muted-foreground">
					<span data-testid="page-count">
						{pageCount}
						{pageCount > 1 ? 'Pages' : 'Page'}
					</span>
					{#if canSave}
						<span aria-hidden="true" class:hidden={saveStatus === 'idle'}>·</span>
						<span
							class="flex items-center gap-1 {saveStatus === 'error'
								? 'text-destructive-text'
								: ''}"
							data-testid="save-status"
							role="status"
							title={saveError}
						>
							{#if saveStatus === 'saving'}
								<LoaderCircle class="h-3 w-3 animate-spin" aria-hidden="true" />
								Saving…
							{:else if saveStatus === 'saved'}
								<Check class="h-3 w-3 text-success" aria-hidden="true" />
								Saved
							{:else if saveStatus === 'error'}
								<TriangleAlert class="h-3 w-3" aria-hidden="true" />
								Could not save
								<button class="underline" onclick={onRetrySave} data-testid="retry-save-btn"
									>Retry</button
								>
							{/if}
						</span>
					{/if}
				</div>
			</div>
		</div>

		<!-- what you can do -->
		<div class="flex flex-wrap items-center gap-2">
			<Button
				disabled={busy}
				onClick={appStore.addPage}
				variant="secondary"
				data-testid="add-page-btn"
			>
				<Plus class="mr-1.5 h-4 w-4" aria-hidden="true" />
				Add page
			</Button>
			<!-- Clicking it must not clear the selection -->
			<span data-keep-selection>
				<Button
					onClick={() => appStore.setMultiSelectMode(!multiSelectMode)}
					variant="secondary"
					aria-pressed={multiSelectMode}
					data-testid="multi-select-toggle"
				>
					<BoxSelect class="mr-1.5 h-4 w-4" aria-hidden="true" />
					Select multiple
				</Button>
			</span>
			<!-- Pastes onto the page last clicked; clicking it must not clear the selection -->
			<span data-keep-selection>
				<Button onClick={() => clipboard.paste()} variant="secondary" data-testid="paste-btn">
					<ClipboardPaste class="mr-1.5 h-4 w-4" aria-hidden="true" />
					Paste
				</Button>
			</span>
			<span class="mx-1 hidden h-6 w-px bg-border lg:block" aria-hidden="true"></span>
			<Button
				disabled={busy}
				onClick={() => importInput?.click()}
				variant="secondary"
				data-testid="canvas-import-btn"
			>
				<Upload class="mr-1.5 h-4 w-4" aria-hidden="true" />
				Import
			</Button>
			<input
				bind:this={importInput}
				type="file"
				accept=".lienzo.json,.json,application/json,.pdf,application/pdf"
				class="hidden"
				onchange={handleImportChange}
				data-testid="canvas-import-input"
				aria-label="Import a document into the canvas"
			/>
			{#if canSave}
				<Button
					disabled={busy}
					pending={busy}
					onClick={onSave}
					variant="secondary"
					data-testid="save-btn"
				>
					<Save class="mr-1.5 h-4 w-4" aria-hidden="true" />
					Save
				</Button>
			{/if}
			<Button disabled={busy} onClick={onExport} variant="primary" data-testid="export-btn">
				<Download class="mr-1.5 h-4 w-4" aria-hidden="true" />
				Export PDF
			</Button>
			<ThemeToggle />
		</div>
	</div>
</header>
