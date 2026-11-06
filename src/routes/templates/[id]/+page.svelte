<script lang="ts">
	import '$lib/fonts/editor.css';
	import { resolve } from '$app/paths';
	import { Button, Seo, ThemeToggle } from '$lib/components';
	import { Icons } from '$lib/icons';
	import { SITE_NAME, SITE_URL } from '$lib/const/seo';
	import { templateById, templates } from '$lib/templates';
	import TemplatePreview from '$lib/templates/TemplatePreview.svelte';
	import { openTemplate } from '$lib/templates/open';

	const { data } = $props();

	const template = $derived(templateById(data.id)!);
	const related = $derived(
		templates.filter((t) => t.category === template.category && t.id !== template.id).slice(0, 3)
	);

	const jsonLd = $derived({
		'@context': 'https://schema.org',
		'@graph': [
			{
				'@type': 'CreativeWork',
				name: `${template.name} template`,
				description: template.description,
				url: `${SITE_URL}/templates/${template.id}`,
				genre: template.category,
				isAccessibleForFree: true,
				publisher: { '@type': 'Organization', name: SITE_NAME, url: SITE_URL }
			},
			{
				'@type': 'BreadcrumbList',
				itemListElement: [
					{ '@type': 'ListItem', position: 1, name: SITE_NAME, item: `${SITE_URL}/` },
					{ '@type': 'ListItem', position: 2, name: 'Templates', item: `${SITE_URL}/templates` },
					{ '@type': 'ListItem', position: 3, name: template.name }
				]
			}
		]
	});
</script>

<Seo
	title="{template.name} template – A4, free and editable – Lienzo"
	description="{template.description} A free A4 {template.name.toLowerCase()} template you can edit in your browser and export as a PDF with real text."
	path="/templates/{template.id}"
	{jsonLd}
/>

<div class="min-h-screen">
	<header class="border-b border-border bg-background/80 backdrop-blur-md">
		<div class="mx-auto flex max-w-[1100px] items-center justify-between gap-4 px-4 py-3 md:px-8">
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

	<main class="mx-auto max-w-[1100px] px-4 pt-6 pb-16 md:px-8 md:pt-8">
		<nav aria-label="Breadcrumb" class="text-sm text-muted-foreground">
			<ol class="flex flex-wrap items-center gap-1.5">
				<li><a href={resolve('/')} class="hover:text-foreground hover:underline">Lienzo</a></li>
				<li aria-hidden="true">/</li>
				<li>
					<a href={resolve('/templates')} class="hover:text-foreground hover:underline">Templates</a
					>
				</li>
				<li aria-hidden="true">/</li>
				<li aria-current="page" class="text-foreground">{template.name}</li>
			</ol>
		</nav>

		<div class="mt-8 grid items-start gap-10 md:grid-cols-[minmax(0,380px)_1fr] md:gap-14">
			<div class="flex justify-center rounded-lg border border-border bg-surface p-6 md:p-8">
				<TemplatePreview {template} width={300} />
			</div>

			<div class="flex flex-col gap-5">
				<p class="text-[13px] font-semibold text-primary-text">{template.category}</p>
				<h1
					class="text-[32px] leading-10 font-semibold tracking-[-0.02em] text-foreground md:text-[40px] md:leading-12"
				>
					{template.name} template
				</h1>
				<p class="text-lg leading-7 text-muted-foreground">{template.description}</p>
				<ul class="flex flex-col gap-2 text-[15px] leading-[22px] text-foreground">
					<li>A4 page, ready to print or share as a PDF</li>
					<li>Every word, shape and colour can be changed</li>
					<li>Free, no account, and saved only on your device</li>
				</ul>
				<div class="flex flex-wrap gap-3 pt-2">
					<Button
						variant="primary"
						size="l"
						onClick={() => openTemplate(template)}
						data-testid="use-this-template"
					>
						Use this template
					</Button>
					<Button href="/templates" variant="ghost" size="l" className="border-input!"
						>All templates</Button
					>
				</div>
			</div>
		</div>

		{#if related.length}
			<section aria-labelledby="related-title" class="mt-16">
				<h2 id="related-title" class="text-2xl leading-8 font-semibold text-foreground">
					More {template.category.toLowerCase()} templates
				</h2>
				<ul class="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
					{#each related as other (other.id)}
						<li>
							<a
								href={resolve(`/templates/${other.id}`)}
								class="block rounded-lg border border-border bg-card p-4 hover:border-input focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
							>
								<span class="block text-base font-semibold text-foreground">{other.name}</span>
								<span class="mt-1 block text-[13px] leading-[18px] text-muted-foreground"
									>{other.description}</span
								>
							</a>
						</li>
					{/each}
				</ul>
			</section>
		{/if}
	</main>
</div>
