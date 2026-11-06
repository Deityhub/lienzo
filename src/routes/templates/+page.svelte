<script lang="ts">
	import '$lib/fonts/editor.css';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { Button, Seo, ThemeToggle } from '$lib/components';
	import { Icons } from '$lib/icons';
	import { appStore } from '$lib/stores/appStore.svelte.ts';
	import { SITE_NAME } from '$lib/const/seo';
	import { TEMPLATE_CATEGORIES, templates, type TemplateCategory } from '$lib/templates';
	import TemplatePreview from '$lib/templates/TemplatePreview.svelte';
	import { openTemplate } from '$lib/templates/open';
	import { Plus, Search } from '@lucide/svelte';

	let query = $state('');
	let category = $state<TemplateCategory | 'All'>('All');

	const filters = ['All', ...TEMPLATE_CATEGORIES] as const;
	const shown = $derived(
		templates.filter(
			(t) =>
				(category === 'All' || t.category === category) &&
				`${t.name} ${t.description} ${t.category}`
					.toLowerCase()
					.includes(query.trim().toLowerCase())
		)
	);

	async function startBlank() {
		appStore.initNewDocument();
		await goto(resolve('/canvas'));
	}

	const jsonLd = {
		'@context': 'https://schema.org',
		'@type': 'CollectionPage',
		name: `Document templates – ${SITE_NAME}`,
		hasPart: templates.map((t) => ({
			'@type': 'CreativeWork',
			name: t.name,
			description: t.description
		}))
	};
</script>

<Seo
	title="Free A4 Document Templates – Lienzo"
	description="Start from a ready-made A4 layout: resume, cover letter, invoice, letterhead, flyer, poster, invitation, menu, certificate and more. Every template stays fully editable."
	path="/templates"
	{jsonLd}
/>

<div class="min-h-screen">
	<header class="border-b border-border bg-background/80 backdrop-blur-md">
		<div class="mx-auto flex max-w-[1360px] items-center justify-between gap-4 px-4 py-3 md:px-10">
			<a
				href={resolve('/')}
				aria-label="Lienzo home"
				class="flex items-center gap-2.5 rounded focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
			>
				<Icons.Logo />
				<span class="text-xl font-semibold tracking-tight text-foreground">Lienzo</span>
			</a>
			<nav aria-label="Main" class="flex items-center gap-1">
				<Button href="/documents" variant="ghost">My Documents</Button>
				<ThemeToggle />
			</nav>
		</div>
	</header>

	<main class="mx-auto flex max-w-[1360px] flex-col gap-7 px-4 pt-8 pb-16 md:px-10 md:pt-10">
		<div class="flex flex-wrap items-end justify-between gap-4">
			<div class="max-w-[640px]">
				<h1 class="text-[32px] leading-10 font-semibold tracking-[-0.02em] text-foreground">
					Start from a template
				</h1>
				<p class="mt-1.5 text-base leading-6 text-muted-foreground">
					Ready-made A4 layouts for the things people make most. Everything stays fully editable,
					and your copy is saved on this device.
				</p>
			</div>
			<div class="relative w-full sm:w-64">
				<label for="template-search" class="sr-only">Search templates</label>
				<Search
					class="pointer-events-none absolute top-2.5 left-2.5 h-4 w-4 text-muted-foreground"
					aria-hidden="true"
				/>
				<input
					id="template-search"
					type="search"
					placeholder="Search templates"
					bind:value={query}
					class="h-9 w-full rounded border border-input bg-background pr-3 pl-9 text-sm text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
				/>
			</div>
		</div>

		<div role="group" aria-label="Filter by category" class="flex flex-wrap gap-2">
			{#each filters as filter (filter)}
				<button
					type="button"
					aria-pressed={category === filter}
					data-testid="category-{filter}"
					onclick={() => (category = filter)}
					class="h-8 cursor-pointer rounded-full border border-input px-3.5 text-sm font-medium text-foreground hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none aria-pressed:border-primary aria-pressed:bg-primary-light aria-pressed:font-semibold aria-pressed:text-primary-text"
				>
					{filter}
				</button>
			{/each}
		</div>

		<ul
			class="grid grid-cols-[repeat(auto-fill,minmax(250px,1fr))] gap-6"
			data-testid="template-list"
		>
			{#if category === 'All' && !query.trim()}
				<li
					class="flex min-h-[360px] flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-border p-6 text-center"
				>
					<span
						class="flex h-12 w-12 items-center justify-center rounded-full bg-primary-light text-primary-text"
					>
						<Plus class="h-6 w-6" aria-hidden="true" />
					</span>
					<h2 class="text-base font-semibold text-foreground">Blank document</h2>
					<p class="text-[13px] leading-[18px] text-muted-foreground">
						An empty A4 page with your own margins.
					</p>
					<Button variant="primary" onClick={startBlank} data-testid="template-blank"
						>Start from scratch</Button
					>
				</li>
			{/if}
			{#each shown as template (template.id)}
				<li
					class="flex flex-col overflow-hidden rounded-lg border border-border bg-background"
					data-testid="template-card"
				>
					<div class="flex justify-center bg-surface px-4 pt-5">
						<div class="self-end">
							<TemplatePreview {template} width={190} />
						</div>
					</div>
					<div class="flex flex-1 flex-col gap-3 p-4">
						<div>
							<h2 class="text-base leading-[22px] font-semibold text-foreground">
								<a
									href={resolve(`/templates/${template.id}`)}
									class="rounded hover:underline focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
									>{template.name}</a
								>
							</h2>
							<p class="text-[13px] leading-[18px] text-muted-foreground">{template.description}</p>
						</div>
						<Button
							variant="secondary"
							className="mt-auto"
							onClick={() => openTemplate(template)}
							data-testid="use-{template.id}"
						>
							Use template
						</Button>
					</div>
				</li>
			{/each}
		</ul>

		{#if shown.length === 0}
			<p class="py-10 text-center text-muted-foreground" role="status">
				No templates match “{query}”. Try another word, or start from a blank document.
			</p>
		{/if}
	</main>
</div>
