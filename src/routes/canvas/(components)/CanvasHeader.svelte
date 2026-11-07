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
		Ellipsis,
		LoaderCircle,
		Moon,
		Plus,
		Save,
		Sun,
		TriangleAlert,
		Upload
	} from '@lucide/svelte';
	import { clipboard } from '$lib/canvas/clipboard.svelte';
	import { theme } from '$lib/stores/theme.svelte';
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

	// On a phone the less used actions are in a menu
	let menuOpen = $state(false);
	let menuRoot: HTMLElement | undefined = $state();

	function closeMenuOutside(event: PointerEvent) {
		if (menuOpen && menuRoot && !menuRoot.contains(event.target as Node)) menuOpen = false;
	}

	function runFromMenu(action: () => void) {
		menuOpen = false;
		action();
	}

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
	<div class="flex items-center justify-between gap-x-4 gap-y-2">
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
		<div class="hidden flex-none items-center gap-2 md:flex">
			<Button
				disabled={busy}
				onClick={appStore.addPage}
				variant="secondary"
				className="max-xl:w-9 max-xl:px-0"
				title="Add page"
				data-testid="add-page-btn"
			>
				<Plus class="h-4 w-4 xl:mr-1.5" aria-hidden="true" />
				<span class="max-xl:sr-only">Add page</span>
			</Button>
			<!-- Clicking it must not clear the selection -->
			<span data-keep-selection>
				<Button
					onClick={() => appStore.setMultiSelectMode(!multiSelectMode)}
					variant="secondary"
					aria-pressed={multiSelectMode}
					className="max-xl:w-9 max-xl:px-0"
					title="Select multiple"
					data-testid="multi-select-toggle"
				>
					<BoxSelect class="h-4 w-4 xl:mr-1.5" aria-hidden="true" />
					<span class="max-xl:sr-only">Select multiple</span>
				</Button>
			</span>
			<!-- Pastes onto the page last clicked; clicking it must not clear the selection -->
			<span data-keep-selection>
				<Button
					onClick={() => clipboard.paste()}
					variant="secondary"
					className="max-xl:w-9 max-xl:px-0"
					title="Paste"
					data-testid="paste-btn"
				>
					<ClipboardPaste class="h-4 w-4 xl:mr-1.5" aria-hidden="true" />
					<span class="max-xl:sr-only">Paste</span>
				</Button>
			</span>
			<span class="mx-1 hidden h-6 w-px bg-border xl:block" aria-hidden="true"></span>
			<Button
				disabled={busy}
				onClick={() => importInput?.click()}
				variant="secondary"
				className="max-xl:w-9 max-xl:px-0"
				title="Import"
				data-testid="canvas-import-btn"
			>
				<Upload class="h-4 w-4 xl:mr-1.5" aria-hidden="true" />
				<span class="max-xl:sr-only">Import</span>
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
					className="max-xl:w-9 max-xl:px-0"
					title="Save"
					data-testid="save-btn"
				>
					<Save class="h-4 w-4 xl:mr-1.5" aria-hidden="true" />
					<span class="max-xl:sr-only">Save</span>
				</Button>
			{/if}
			<Button
				disabled={busy}
				onClick={onExport}
				variant="primary"
				className="max-lg:w-9 max-lg:px-0"
				title="Export PDF"
				data-testid="export-btn"
			>
				<Download class="h-4 w-4 lg:mr-1.5" aria-hidden="true" />
				<span class="max-lg:sr-only">Export PDF</span>
			</Button>
			<ThemeToggle />
		</div>

		<!-- On a phone: Export, and a menu for the rest (adding and selecting are in the bar below) -->
		<div class="flex items-center gap-1 md:hidden" bind:this={menuRoot} data-keep-selection>
			<Button disabled={busy} onClick={onExport} variant="primary" data-testid="export-btn-phone">
				<Download class="mr-1.5 h-4 w-4" aria-hidden="true" />
				Export
			</Button>
			<div class="relative">
				<button
					type="button"
					aria-haspopup="menu"
					aria-expanded={menuOpen}
					aria-label="More actions"
					data-testid="more-menu-btn"
					onclick={() => (menuOpen = !menuOpen)}
					class="inline-flex h-11 w-11 cursor-pointer items-center justify-center rounded text-foreground hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
				>
					<Ellipsis class="h-5 w-5" aria-hidden="true" />
				</button>
				{#if menuOpen}
					<div
						role="menu"
						aria-label="More actions"
						class="absolute top-full right-0 z-50 mt-2 w-56 rounded-lg border border-border bg-popover p-1 text-popover-foreground shadow-lg"
						data-testid="more-menu"
					>
						<button
							type="button"
							role="menuitem"
							class="flex min-h-11 w-full cursor-pointer items-center gap-3 rounded px-3 text-left text-sm font-medium hover:bg-accent"
							onclick={() => runFromMenu(() => clipboard.paste())}
						>
							<ClipboardPaste class="h-4 w-4" aria-hidden="true" /> Paste
						</button>
						<button
							type="button"
							role="menuitem"
							disabled={busy}
							class="flex min-h-11 w-full cursor-pointer items-center gap-3 rounded px-3 text-left text-sm font-medium hover:bg-accent disabled:opacity-50"
							onclick={() => runFromMenu(() => importInput?.click())}
						>
							<Upload class="h-4 w-4" aria-hidden="true" /> Import
						</button>
						{#if canSave}
							<button
								type="button"
								role="menuitem"
								disabled={busy}
								class="flex min-h-11 w-full cursor-pointer items-center gap-3 rounded px-3 text-left text-sm font-medium hover:bg-accent disabled:opacity-50"
								onclick={() => runFromMenu(onSave)}
							>
								<Save class="h-4 w-4" aria-hidden="true" /> Save
							</button>
						{/if}
						<div class="my-1 h-px bg-border" role="separator"></div>
						<button
							type="button"
							role="menuitemcheckbox"
							aria-checked={theme.isDark}
							class="flex min-h-11 w-full cursor-pointer items-center gap-3 rounded px-3 text-left text-sm font-medium hover:bg-accent"
							onclick={() => theme.toggle()}
							data-testid="menu-theme"
						>
							{#if theme.isDark}
								<Sun class="h-4 w-4" aria-hidden="true" /> Light theme
							{:else}
								<Moon class="h-4 w-4" aria-hidden="true" /> Dark theme
							{/if}
						</button>
					</div>
				{/if}
			</div>
		</div>
	</div>
</header>

<svelte:window
	onpointerdown={closeMenuOutside}
	onkeydown={(event) => {
		if (event.key === 'Escape') menuOpen = false;
	}}
/>
