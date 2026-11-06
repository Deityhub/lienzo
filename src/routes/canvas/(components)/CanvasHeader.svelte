<script lang="ts">
	import { Button } from '$lib/components';
	import { Icons } from '$lib/icons';
	import { appStore } from '$lib/stores/appStore.svelte.ts';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { BoxSelect, Download, Plus, Save, Upload } from '@lucide/svelte';
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

	let importInput: HTMLInputElement | undefined = $state();

	function handleImportChange(event: Event) {
		const input = event.currentTarget as HTMLInputElement;
		const file = input.files?.[0];
		input.value = ''; // allow importing the same file again
		if (file) onImportFile(file);
	}
</script>

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
					disabled={busy}
					onClick={appStore.addPage}
					variant="primary"
					data-testid="add-page-btn"
				>
					<Plus class="mr-2 h-4 w-4" />
					Add Page
				</Button>
				<!-- Clicking it must not clear the selection -->
				<span data-keep-selection>
					<Button
						onClick={() => appStore.setMultiSelectMode(!multiSelectMode)}
						variant={multiSelectMode ? 'primary' : 'secondary'}
						aria-pressed={multiSelectMode}
						data-testid="multi-select-toggle"
					>
						<BoxSelect class="mr-2 h-4 w-4" />
						Select multiple
					</Button>
				</span>
				<div class="mr-4 flex items-baseline gap-2">
					<span class="text-sm text-muted-foreground" data-testid="page-count">
						{pageCount}
						{pageCount > 1 ? 'Pages' : 'Page'}
					</span>

					{#if canSave}
						<span
							class="text-xs {saveStatus === 'error'
								? 'text-destructive'
								: 'text-muted-foreground'}"
							data-testid="save-status"
							role="status"
							title={saveError}
						>
							{#if saveStatus === 'saving'}
								Saving…
							{:else if saveStatus === 'saved'}
								Saved
							{:else if saveStatus === 'error'}
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

		<div class="flex items-center gap-2">
			<Button onClick={onBack} variant="ghost" data-testid="back-btn">Back</Button>
			<Button
				disabled={busy}
				onClick={() => importInput?.click()}
				variant="secondary"
				data-testid="canvas-import-btn"
			>
				<Upload class="mr-2 h-4 w-4" />
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
					variant="primary"
					data-testid="save-btn"
				>
					<Save class="mr-2 h-4 w-4" />
					Save
				</Button>
			{/if}
			<Button disabled={busy} onClick={onExport} variant="primary" data-testid="export-btn">
				<Download class="mr-2 h-4 w-4" />
				Export PDF
			</Button>
		</div>
	</div>
</div>
