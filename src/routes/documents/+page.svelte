<script lang="ts">
	import { onMount } from 'svelte';
	import { getAllDocuments, isIndexedDBSupported } from '$lib/stores/idb';
	import type { DocumentData } from '$lib/types/canvas';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { Button, Modal, Seo, ThemeToggle } from '$lib/components';
	import { appStore } from '$lib/stores/appStore.svelte.ts';
	import Document from './(components)/Document.svelte';
	import { Icons } from '$lib/icons';
	import { Download, Plus, Search, Upload } from '@lucide/svelte';
	import {
		exportAllDocuments,
		FILE_EXTENSION,
		findConflicts,
		readDocumentFiles,
		saveImportedDocuments,
		type ConflictChoice
	} from '$lib/utils/documentFile';

	let documents = $state<DocumentData[]>([]);
	let loading = $state(true);
	let error = $state('');
	let searchQuery = $state('');
	let fileInput: HTMLInputElement | undefined = $state();
	let importing = $state(false);
	let notice = $state<{ kind: 'success' | 'error'; message: string; details: string[] } | null>(
		null
	);

	async function fetchDocuments() {
		loading = true;
		try {
			documents = await getAllDocuments();
			error = '';
		} catch (_error) {
			console.error('Error loading documents:', _error);
			error = 'Failed to load documents. Please try again.';
		} finally {
			loading = false;
		}
	}

	// Documents read from the chosen files, waiting for the user to resolve id conflicts
	let pendingImport = $state<{
		documents: DocumentData[];
		conflicts: DocumentData[];
		errors: string[];
	} | null>(null);

	async function handleImport(event: Event) {
		const input = event.currentTarget as HTMLInputElement;
		const files = Array.from(input.files ?? []);
		input.value = ''; // allow importing the same file again
		if (!files.length) return;

		importing = true;
		try {
			const { documents: incoming, errors } = await readDocumentFiles(files);
			const conflicts = findConflicts(incoming, documents);
			if (conflicts.length) {
				pendingImport = { documents: incoming, conflicts, errors };
			} else {
				await finishImport(incoming, errors, 'copy');
			}
		} catch (_error) {
			console.error('Error importing documents:', _error);
			notice = { kind: 'error', message: 'Import failed. Please try again.', details: [] };
		} finally {
			importing = false;
		}
	}

	async function finishImport(incoming: DocumentData[], errors: string[], choice: ConflictChoice) {
		const imported = await saveImportedDocuments(incoming, documents, choice);
		await fetchDocuments();
		const plural = imported === 1 ? 'document' : 'documents';
		notice = {
			kind: imported > 0 ? 'success' : 'error',
			message:
				imported > 0
					? `Imported ${imported} ${plural}.${errors.length ? ' Some could not be imported:' : ''}`
					: 'Nothing was imported:',
			details: errors
		};
	}

	async function resolveConflicts(choice: ConflictChoice) {
		const pending = pendingImport;
		if (!pending) return;
		pendingImport = null;
		importing = true;
		try {
			await finishImport(pending.documents, pending.errors, choice);
		} catch (_error) {
			console.error('Error importing documents:', _error);
			notice = { kind: 'error', message: 'Import failed. Please try again.', details: [] };
		} finally {
			importing = false;
		}
	}

	async function handleCreateNew() {
		appStore.initNewDocument();
		await goto(resolve('/canvas'));
	}

	// Filter documents based on search query
	const filteredDocuments = $derived(
		documents.filter((document) => document.name.toLowerCase().includes(searchQuery.toLowerCase()))
	);

	onMount(() => {
		if (!isIndexedDBSupported()) {
			return goto(resolve('/'));
		}
		fetchDocuments();
	});
</script>

<Seo title="My Documents – Lienzo" path="/documents" noindex />

<div class="min-h-screen">
	<!-- Header: one row on a tablet or desktop; on a phone the name and main action on top, search and file actions below -->
	<header class="border-b border-border bg-background/80 backdrop-blur-md">
		<div class="mx-auto max-w-7xl px-4 py-3 sm:px-6 lg:px-8">
			<div class="flex flex-wrap items-center justify-between gap-x-4 gap-y-3">
				<a
					href={resolve('/')}
					aria-label="Lienzo home"
					class="order-1 flex items-center gap-2.5 rounded focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
				>
					<Icons.Logo />
					<span class="text-xl font-semibold tracking-tight text-foreground">Lienzo</span>
				</a>

				<div class="order-2 flex items-center gap-2 md:order-3">
					<Button
						onClick={handleCreateNew}
						variant="primary"
						className="whitespace-nowrap max-sm:min-h-11"
						data-testid="new-document-btn"
					>
						<Plus class="mr-1.5 h-4 w-4" aria-hidden="true" />
						New Document
					</Button>
					<ThemeToggle />
				</div>

				<div
					class="order-3 flex w-full items-center gap-2 md:order-2 md:w-auto md:flex-1 md:justify-end"
				>
					<div class="relative min-w-0 flex-1 md:max-w-64">
						<Search
							class="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground"
							aria-hidden="true"
						/>
						<label for="search-documents" class="sr-only">Search documents</label>
						<input
							id="search-documents"
							type="search"
							bind:value={searchQuery}
							placeholder="Search documents..."
							class="block h-9 w-full rounded border border-input bg-background pr-3 pl-9 text-sm text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-ring focus:outline-none max-sm:h-11"
						/>
					</div>
					<!-- Icon only on a phone, with the name spoken -->
					<Button
						onClick={() => fileInput?.click()}
						variant="secondary"
						className="whitespace-nowrap max-sm:min-h-11 max-sm:min-w-11"
						disabled={importing}
						data-testid="import-btn"
					>
						<Upload class="h-4 w-4 sm:mr-2" aria-hidden="true" />
						<span class="max-sm:sr-only">Import</span>
					</Button>
					<Button
						onClick={() => exportAllDocuments(documents)}
						variant="secondary"
						className="whitespace-nowrap max-sm:min-h-11 max-sm:min-w-11"
						disabled={documents.length === 0}
						data-testid="export-all-btn"
					>
						<Download class="h-4 w-4 sm:mr-2" aria-hidden="true" />
						<span class="max-sm:sr-only">Export all</span>
					</Button>
					<input
						bind:this={fileInput}
						type="file"
						accept={`${FILE_EXTENSION},.json,application/json,.pdf,application/pdf`}
						multiple
						class="hidden"
						onchange={handleImport}
						data-testid="import-input"
						aria-label="Import documents from a file"
					/>
				</div>
			</div>
		</div>
	</header>

	<Modal
		open={pendingImport !== null}
		title="Some documents already exist"
		onCancel={() => (pendingImport = null)}
		showAcceptAction={false}
		closeFromBackdrop={true}
	>
		<p class="text-sm text-muted-foreground">
			{pendingImport?.conflicts.length === 1
				? 'This document is already in your library:'
				: `These ${pendingImport?.conflicts.length} documents are already in your library:`}
		</p>
		<ul class="mt-2 max-h-40 list-disc overflow-y-auto pl-5 text-sm" data-testid="conflict-list">
			{#each pendingImport?.conflicts ?? [] as conflict (conflict.id)}
				<li>{conflict.name}</li>
			{/each}
		</ul>
		<div class="mt-5 flex flex-col gap-2 sm:flex-row">
			<Button
				onClick={() => resolveConflicts('copy')}
				variant="primary"
				data-testid="import-keep-both-btn"
			>
				Keep both (import as copy)
			</Button>
			<Button
				onClick={() => resolveConflicts('replace')}
				variant="secondary-destructive"
				data-testid="import-replace-btn"
			>
				Replace existing
			</Button>
		</div>
		<p class="mt-3 text-xs text-muted-foreground">
			Replacing overwrites the saved version and cannot be undone.
		</p>
	</Modal>

	<!-- Main Content -->
	<main class="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
		<div class="mb-8">
			<h1 class="text-2xl font-bold text-foreground">Documents</h1>
			<p class="mt-1 text-sm text-muted-foreground">View and manage your documents</p>
		</div>
		{#if notice}
			<div
				class="mb-6 rounded-md p-4 text-sm {notice.kind === 'success'
					? 'bg-success/15 text-foreground'
					: 'bg-destructive/20 text-destructive-text'}"
				role={notice.kind === 'success' ? 'status' : 'alert'}
				data-testid="import-notice"
			>
				<div class="flex items-start justify-between gap-4">
					<p class="font-medium">{notice.message}</p>
					<button type="button" class="underline" onclick={() => (notice = null)}>Dismiss</button>
				</div>
				{#if notice.details.length}
					<ul class="mt-2 list-disc pl-5">
						{#each notice.details as detail (detail)}
							<li>{detail}</li>
						{/each}
					</ul>
				{/if}
			</div>
		{/if}
		{#if loading}
			<div
				class="flex flex-col items-center justify-center py-12 text-center text-muted-foreground"
			>
				<div class="mx-auto h-12 w-12 animate-spin rounded-full border-b-2 border-primary"></div>
				<p class="mt-4 text-muted-foreground">Loading documents...</p>
			</div>
		{:else if error}
			<div class="rounded-md bg-destructive/20 p-4">
				<div class="flex">
					<div class="flex-shrink-0">
						<svg class="h-5 w-5 text-destructive-text" viewBox="0 0 20 20" fill="currentColor">
							<path
								fill-rule="evenodd"
								d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z"
								clip-rule="evenodd"
							/>
						</svg>
					</div>
					<div class="ml-3">
						<h3 class="text-sm font-medium text-destructive-text">{error}</h3>
					</div>
				</div>
			</div>
		{:else if filteredDocuments.length === 0}
			<div
				class="flex h-64 flex-col items-center justify-center rounded-lg border-2 border-dashed border-muted-foreground/20 p-12 text-center"
			>
				<svg
					class="mx-auto h-16 w-16 text-muted-foreground/50"
					fill="none"
					viewBox="0 0 24 24"
					stroke="currentColor"
				>
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						stroke-width="1.5"
						d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
					/>
				</svg>
				<h3 class="mt-2 text-sm font-medium text-muted-foreground">No documents</h3>
				<p class="mt-1 text-sm text-muted-foreground">
					{searchQuery
						? 'No documents match your search.'
						: 'Get started by creating a new document.'}
				</p>
				<div class="mt-6">
					<Button onClick={handleCreateNew} variant="primary">
						<svg
							xmlns="http://www.w3.org/2000/svg"
							class="mr-2 -ml-1 h-5 w-5"
							viewBox="0 0 20 20"
							fill="currentColor"
						>
							<path
								fill-rule="evenodd"
								d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z"
								clip-rule="evenodd"
							/>
						</svg>
						New Document
					</Button>
				</div>
			</div>
		{:else}
			<div class="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
				{#each filteredDocuments as document (document.id)}
					<Document {document} {fetchDocuments} />
				{/each}
			</div>
		{/if}
	</main>
</div>
