<script lang="ts">
	import { onMount } from 'svelte';
	import { getAllDocuments, isIndexedDBSupported } from '$lib/stores/idb';
	import type { DocumentData } from '$lib/types/canvas';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { Button, Seo } from '$lib/components';
	import { appStore } from '$lib/stores/appStore.svelte.ts';
	import Document from './(components)/Document.svelte';
	import { Icons } from '$lib/icons';

	let documents = $state<DocumentData[]>([]);
	let loading = $state(true);
	let error = $state('');
	let searchQuery = $state('');

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
	<!-- Header -->
	<header class="border-b border-primary/10 bg-background/80 backdrop-blur-md">
		<div class="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8">
			<div class="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
				<div class="flex items-center space-x-4">
					<Button onClick={() => goto(resolve('/'))} variant="text" size="xs" className="-ml-2">
						<div class="flex items-center gap-3">
							<div class="flex h-8 w-8 items-center justify-center">
								<Icons.Logo />
							</div>
							<span
								class="bg-gradient-to-r from-primary to-primary/80 bg-clip-text text-xl font-bold text-transparent"
							>
								Lienzo
							</span>
						</div>
					</Button>
				</div>
				<div class="flex w-full items-center gap-4 sm:w-auto">
					<div class="relative flex-1 sm:w-64">
						<div class="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
							<svg
								class="h-5 w-5 text-muted-foreground"
								xmlns="http://www.w3.org/2000/svg"
								viewBox="0 0 20 20"
								fill="currentColor"
							>
								<path
									fill-rule="evenodd"
									d="M9 3.5a5.5 5.5 0 100 11 5.5 5.5 0 000-11zM2 9a7 7 0 1112.452 4.391l3.328 3.329a.75.75 0 11-1.06 1.06l-3.329-3.328A7 7 0 012 9z"
									clip-rule="evenodd"
								/>
							</svg>
						</div>
						<input
							type="text"
							bind:value={searchQuery}
							placeholder="Search documents..."
							class="block w-full rounded-md border-0 bg-background py-1.5 pr-3 pl-10 text-foreground ring-1 ring-ring ring-inset placeholder:text-muted-foreground/60 focus:ring-ring/20 focus:ring-inset sm:text-sm sm:leading-6"
						/>
					</div>
					<Button onClick={handleCreateNew} variant="primary" className="whitespace-nowrap">
						<svg
							xmlns="http://www.w3.org/2000/svg"
							class="mr-2 h-4 w-4"
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
		</div>
	</header>

	<!-- Main Content -->
	<main class="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
		<div class="mb-8">
			<h1 class="text-2xl font-bold text-foreground">Documents</h1>
			<p class="mt-1 text-sm text-muted-foreground">View and manage your documents</p>
		</div>
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
						<svg class="h-5 w-5 text-destructive" viewBox="0 0 20 20" fill="currentColor">
							<path
								fill-rule="evenodd"
								d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z"
								clip-rule="evenodd"
							/>
						</svg>
					</div>
					<div class="ml-3">
						<h3 class="text-sm font-medium text-destructive">{error}</h3>
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
