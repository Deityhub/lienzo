<script lang="ts">
	import { Button, Seo, ThemeToggle } from '$lib/components';
	import { appStore } from '$lib/stores/appStore.svelte.ts';
	import { Icons } from '$lib/icons';
	import { ChevronDown } from '@lucide/svelte';
	import { resolve } from '$app/paths';
	import { templateById } from '$lib/templates';
	import { openTemplate } from '$lib/templates/open';
	import TemplatePreview from '$lib/templates/TemplatePreview.svelte';
	import { AUTHOR_NAME, AUTHOR_URL, SITE_DESCRIPTION, SITE_NAME, SITE_URL } from '$lib/const/seo';

	// A few of the templates, in the order they are shown. Only ones set in Inter, the one font this page loads.
	const featured = [
		'resume',
		'invoice',
		'event-flyer',
		'one-page-report',
		'proposal-cover',
		'class-timetable'
	]
		.map((id) => templateById(id))
		.filter((t) => t !== undefined);

	const currentYear: number = new Date().getFullYear();

	const comparison = [
		{
			what: 'Text',
			image: 'Pixels you cannot select',
			lienzo: 'Real text you can select, search and copy'
		},
		{ what: 'Shapes', image: 'Blurry when zoomed', lienzo: 'Vector, sharp at any size' },
		{
			what: 'Fonts',
			image: 'Baked into the picture',
			lienzo: 'Embedded, only the characters you use'
		},
		{
			what: 'Editing later',
			image: 'Start again from scratch',
			lienzo: 'Import it back into Lienzo and carry on'
		}
	];

	const features = [
		{
			title: 'Text, shapes and images',
			text: 'Drag a tool onto the page. 14 font families, 13 shape types, pictures by link, and screenshots pasted straight from your clipboard.',
			span: 'md:col-span-7'
		},
		{
			title: 'Group and resize',
			text: 'Select several elements, group them, and scale the whole group from a corner. Text sizes follow.',
			span: 'md:col-span-5'
		},
		{
			title: 'Autosave',
			text: 'Saved a moment after you stop editing, with a status that always tells you where you stand.',
			span: 'md:col-span-4'
		},
		{
			title: 'Copy, paste, duplicate',
			text: 'Ctrl or Cmd with C, X, V and D. Paste into another page, document or browser tab.',
			span: 'md:col-span-4'
		},
		{
			title: 'Light and dark',
			text: 'Work in the theme that suits the room. The page you design always stays paper white.',
			span: 'md:col-span-4'
		}
	];

	const faqs = [
		{
			question: 'Do I need an account?',
			answer:
				'No. Open the editor and start designing. Your documents are stored in your browser on this device.'
		},
		{
			question: 'Where are my documents stored?',
			answer:
				"In your browser's own storage. Clearing site data removes them, so export a PDF or a .lienzo.json file for anything you want to keep."
		},
		{
			question: 'Is the exported PDF really editable?',
			answer:
				'The text is real text, so you can select, search and edit it line by line in a PDF editor. The full editable document is also embedded, so importing the PDF back into Lienzo restores it.'
		},
		{
			question: 'Which fonts can I use?',
			answer:
				'Fourteen families, including Inter, Roboto, Open Sans, Montserrat, Poppins, Merriweather and Playfair Display, plus common system fonts. They are embedded in your PDF.'
		},
		{
			question: 'Does it work on a phone or tablet?',
			answer:
				'Yes. The page scales to your screen, and a Select multiple switch lets you select several elements by touch.'
		}
	];

	const jsonLd = {
		'@context': 'https://schema.org',
		'@graph': [
			{
				'@type': 'WebApplication',
				name: SITE_NAME,
				url: SITE_URL,
				description: SITE_DESCRIPTION,
				applicationCategory: 'BusinessApplication',
				operatingSystem: 'Any',
				browserRequirements: 'Requires JavaScript',
				offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
				author: { '@type': 'Person', name: AUTHOR_NAME, url: AUTHOR_URL }
			},
			{
				'@type': 'FAQPage',
				mainEntity: faqs.map(({ question, answer }) => ({
					'@type': 'Question',
					name: question,
					acceptedAnswer: { '@type': 'Answer', text: answer }
				}))
			}
		]
	};

	const startBuilding = () => appStore.initNewDocument();
</script>

<Seo title="Lienzo – Free Document Builder with Editable PDF Export" {jsonLd} />

<a
	href="#main"
	class="sr-only z-[60] rounded bg-background px-3 py-2 text-primary-text focus:not-sr-only focus:absolute focus:top-2 focus:left-4"
>
	Skip to content
</a>

<header class="sticky top-0 z-50 border-b border-border bg-surface/80 backdrop-blur-md">
	<div class="mx-auto flex max-w-[1100px] items-center justify-between gap-4 px-4 py-3 md:px-8">
		<a href={resolve('/')} aria-label="Lienzo home" class="flex items-center gap-2.5">
			<Icons.Logo />
			<span class="text-xl font-semibold tracking-tight text-foreground">Lienzo</span>
		</a>
		<nav aria-label="Main" class="flex items-center gap-1">
			<a
				href="#compare"
				class="hidden rounded px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-accent hover:text-foreground md:block"
				>Why Lienzo</a
			>

			<a
				href="#templates"
				class="hidden rounded px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-accent hover:text-foreground md:block"
				>Templates</a
			>
			<Button href="/documents" variant="ghost">My Documents</Button>
			<span class="hidden sm:block">
				<Button onClick={startBuilding} href="/canvas" variant="primary">Open the editor</Button>
			</span>
			<ThemeToggle />
		</nav>
	</div>
</header>

<main id="main">
	<!-- hero -->
	<section aria-labelledby="hero-title" class="overflow-hidden">
		<div
			class="mx-auto flex max-w-[960px] flex-col items-center gap-6 px-4 pt-16 text-center md:px-8 md:pt-20"
		>
			<p
				class="rounded-full border border-border bg-background px-3 py-1 text-[13px] leading-5 font-semibold text-primary-text"
			>
				Free · No account · Runs in your browser
			</p>
			<h1
				id="hero-title"
				class="text-[40px] leading-[46px] font-semibold tracking-[-0.03em] text-foreground md:text-[68px] md:leading-[76px]"
			>
				Design it. Export it. Edit it again.
			</h1>
			<p class="max-w-[640px] text-lg leading-7 text-muted-foreground md:text-xl md:leading-[30px]">
				Lienzo is a document builder for A4 pages. Place text, shapes and images, and export a PDF
				that keeps real text and carries your editable document inside.
			</p>
			<div class="flex flex-wrap justify-center gap-3 pt-2">
				<Button onClick={startBuilding} href="/canvas" variant="primary" size="l"
					>Start designing</Button
				>
				<Button href="#templates" variant="ghost" size="l" className="border-input!"
					>Browse templates</Button
				>
			</div>
		</div>

		<div
			class="mx-auto mt-14 max-w-[1100px] px-4 md:mt-16 md:px-8"
			role="img"
			aria-label="Two A4 pages in the Lienzo editor: a resume page with a heading and text blocks, and a flyer page with a headline, a circle and a button shape"
		>
			<div
				class="flex flex-wrap items-end justify-center gap-8 rounded-t-2xl border border-b-0 border-border bg-background px-6 pt-8 shadow-[0_-24px_80px_hsl(var(--primary)/0.18)] md:px-8"
			>
				<!-- a resume page -->
				<div class="relative h-[440px] w-[340px] max-w-full bg-paper text-paper-foreground">
					<div class="absolute top-8 left-8 text-[26px] leading-[30px] font-bold tracking-tight">
						Ada Lovelace
					</div>
					<div class="absolute top-[68px] left-8 text-[13px] text-neutral-500">
						Analyst · London
					</div>
					<div class="absolute top-[110px] left-8 flex w-60 flex-col gap-2">
						<span class="h-1.5 rounded-full bg-neutral-300"></span>
						<span class="h-1.5 rounded-full bg-neutral-300"></span>
						<span class="h-1.5 w-4/5 rounded-full bg-neutral-300"></span>
					</div>
					<div class="absolute top-[180px] left-8 h-px w-60 bg-neutral-300"></div>
					<div class="absolute top-[196px] left-8 text-sm font-semibold">Experience</div>
					<div class="absolute top-[226px] left-8 flex w-60 flex-col gap-2">
						<span class="h-1.5 rounded-full bg-neutral-200"></span>
						<span class="h-1.5 rounded-full bg-neutral-200"></span>
						<span class="h-1.5 w-3/5 rounded-full bg-neutral-200"></span>
						<span class="mt-3 h-1.5 rounded-full bg-neutral-200"></span>
						<span class="h-1.5 w-[85%] rounded-full bg-neutral-200"></span>
					</div>
				</div>
				<!-- a flyer page -->
				<div class="relative hidden h-[500px] w-[340px] bg-[#ebf3fc] text-[#0c3b5e] md:block">
					<div
						class="absolute top-12 left-8 w-[220px] text-[34px] leading-[38px] font-bold tracking-[-0.03em]"
					>
						Summer market
					</div>
					<div class="absolute top-[138px] left-8 text-sm text-[#115ea3]">
						Saturday 14 June · Riverside
					</div>
					<div class="absolute top-[190px] left-[196px] h-28 w-28 rounded-full bg-[#0f6cbd]"></div>
					<div
						class="absolute top-[230px] left-8 h-[72px] w-24 rounded-md border-2 border-[#0f6cbd] bg-[#cfe4fa]"
					></div>
					<div
						class="absolute top-[350px] left-8 rounded bg-[#0f6cbd] px-[22px] py-2.5 text-[13px] font-semibold text-white"
					>
						Reserve a stall
					</div>
				</div>
			</div>
		</div>
	</section>

	<!-- templates -->
	<section id="templates" aria-labelledby="templates-title" class="border-t border-border">
		<div class="mx-auto flex max-w-[1100px] flex-col gap-10 px-4 py-16 md:px-8 md:py-28">
			<div class="flex flex-wrap items-end justify-between gap-x-8 gap-y-4">
				<div class="flex max-w-[600px] flex-col gap-3">
					<h2
						id="templates-title"
						class="text-3xl leading-[38px] font-semibold tracking-[-0.025em] md:text-[40px] md:leading-12"
					>
						Start from a template
					</h2>
					<p class="text-base leading-6 text-muted-foreground">
						Resumes, invoices, flyers, certificates and more. Every template is a normal Lienzo
						document, so you can change anything.
					</p>
				</div>
				<Button href="/templates" variant="secondary" data-testid="browse-templates"
					>Browse all templates</Button
				>
			</div>
			<ul class="grid grid-cols-2 gap-3 md:grid-cols-3 md:gap-5" data-testid="featured-templates">
				{#each featured as template (template.id)}
					<li class="overflow-hidden rounded-lg border border-border bg-card">
						<button
							type="button"
							onclick={() => openTemplate(template)}
							data-testid="featured-{template.id}"
							class="group flex h-full w-full cursor-pointer flex-col text-left focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none focus-visible:ring-inset"
						>
							<span class="flex justify-center bg-surface px-4 pt-5">
								<span class="self-end transition-transform group-hover:-translate-y-1">
									<TemplatePreview {template} width={150} />
								</span>
							</span>
							<span class="flex flex-col gap-0.5 p-4">
								<span class="text-base leading-[22px] font-semibold text-foreground"
									>{template.name}</span
								>
								<span class="text-[13px] leading-[18px] text-muted-foreground"
									>{template.category}</span
								>
							</span>
						</button>
					</li>
				{/each}
			</ul>
		</div>
	</section>

	<!-- comparison -->
	<section
		id="compare"
		aria-labelledby="compare-title"
		class="border-y border-border bg-background"
	>
		<div class="mx-auto flex max-w-[1100px] flex-col gap-10 px-4 py-16 md:px-8 md:py-28">
			<div class="flex max-w-[640px] flex-col gap-3">
				<h2
					id="compare-title"
					class="text-3xl leading-[38px] font-semibold tracking-[-0.025em] md:text-[40px] md:leading-12"
				>
					A PDF that is more than a picture
				</h2>
				<p class="text-base leading-6 text-muted-foreground">
					Many editors export each page as an image. Lienzo draws the page itself, so the file
					behaves like a real document.
				</p>
			</div>
			<div class="overflow-hidden rounded-xl border border-border bg-card">
				<div
					class="hidden grid-cols-[1.2fr_1fr_1fr] border-b border-border bg-surface text-sm font-semibold md:grid"
				>
					<div class="px-6 py-4"></div>
					<div class="px-6 py-4 text-muted-foreground">A page saved as an image</div>
					<div class="px-6 py-4 text-primary-text">A Lienzo PDF</div>
				</div>
				{#each comparison as row, i (row.what)}
					<div
						class="grid grid-cols-2 text-[15px] leading-[22px] md:grid-cols-[1.2fr_1fr_1fr] {i <
						comparison.length - 1
							? 'border-b border-border'
							: ''}"
					>
						<div class="col-span-2 px-6 pt-[18px] pb-0 font-semibold md:col-span-1 md:py-[18px]">
							{row.what}
						</div>
						<div class="px-6 py-[18px] text-muted-foreground">{row.image}</div>
						<div class="px-6 py-[18px]">{row.lienzo}</div>
					</div>
				{/each}
			</div>
		</div>
	</section>

	<!-- features -->
	<section id="features" aria-labelledby="features-title">
		<div class="mx-auto flex max-w-[1100px] flex-col gap-10 px-4 py-16 md:px-8 md:py-28">
			<h2
				id="features-title"
				class="max-w-[640px] text-3xl leading-[38px] font-semibold tracking-[-0.025em] md:text-[40px] md:leading-12"
			>
				Built for laying out one good page
			</h2>
			<div class="grid gap-4 md:grid-cols-12">
				{#each features as feature (feature.title)}
					<article
						class="flex flex-col gap-3 rounded-xl border border-border bg-card p-8 {feature.span}"
					>
						<h3 class="text-xl leading-7 font-semibold md:text-2xl md:leading-8">
							{feature.title}
						</h3>
						<p class="max-w-[460px] text-[15px] leading-[22px] text-muted-foreground">
							{feature.text}
						</p>
					</article>
				{/each}
				<article
					class="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-primary-text bg-primary-light p-8 md:col-span-12"
				>
					<div class="flex min-w-0 flex-1 basis-[380px] flex-col gap-2">
						<h3 class="text-2xl leading-8 font-semibold">Private by design</h3>
						<p class="text-[15px] leading-[22px] text-muted-foreground">
							No account and no upload. Documents live in your browser, and you export a PDF or
							.lienzo.json file whenever you want a backup.
						</p>
					</div>
					<Button onClick={startBuilding} href="/canvas" variant="primary" size="l"
						>Try it now</Button
					>
				</article>
			</div>
		</div>
	</section>

	<!-- faq -->
	<section id="faq" aria-labelledby="faq-title" class="border-t border-border bg-background">
		<div class="mx-auto flex max-w-[1100px] flex-wrap gap-10 px-4 py-16 md:gap-20 md:px-8 md:py-28">
			<div class="flex min-w-[260px] flex-1 basis-[280px] flex-col gap-3">
				<h2
					id="faq-title"
					class="text-3xl leading-[38px] font-semibold tracking-[-0.025em] md:text-[40px] md:leading-12"
				>
					Questions, answered
				</h2>
				<p class="text-[15px] leading-[22px] text-muted-foreground">
					The short version of how Lienzo works.
				</p>
			</div>
			<div class="min-w-0 flex-[2_1_480px] border-t border-border">
				{#each faqs as faq, i (faq.question)}
					<details class="group border-b border-border" open={i === 0}>
						<summary
							class="flex min-h-11 cursor-pointer list-none items-center justify-between gap-4 py-[18px] text-lg leading-6 font-semibold [&::-webkit-details-marker]:hidden"
						>
							{faq.question}
							<ChevronDown
								class="h-5 w-5 flex-none text-muted-foreground transition-transform group-open:rotate-180"
								aria-hidden="true"
							/>
						</summary>
						<p class="pb-5 text-base leading-6 text-muted-foreground">{faq.answer}</p>
					</details>
				{/each}
			</div>
		</div>
	</section>

	<!-- call to action -->
	<section aria-labelledby="cta-title" class="border-t border-border bg-primary-light">
		<div
			class="mx-auto flex max-w-[1100px] flex-wrap items-center justify-between gap-6 px-4 py-16 md:px-8"
		>
			<div class="flex min-w-0 flex-1 basis-[380px] flex-col gap-2">
				<h2 id="cta-title" class="text-[28px] leading-9 font-semibold tracking-[-0.015em]">
					Your first document is one click away.
				</h2>
				<p class="text-base leading-6 text-muted-foreground">Free, private and ready in seconds.</p>
			</div>
			<Button onClick={startBuilding} href="/canvas" variant="primary" size="l"
				>Open the editor</Button
			>
		</div>
	</section>
</main>

<footer class="border-t border-border">
	<div
		class="mx-auto flex max-w-[1100px] flex-wrap items-center justify-between gap-x-12 gap-y-6 px-4 py-10 text-sm text-muted-foreground md:px-8"
	>
		<div class="flex items-center gap-2.5 text-base font-semibold text-foreground">
			<Icons.Logo width="24" height="24" />
			Lienzo
		</div>
		<p>
			&copy; {currentYear} Lienzo · Built by
			<!-- eslint-disable-next-line svelte/no-navigation-without-resolve -- an external address -->
			<a href={AUTHOR_URL} rel="external" class="text-primary-text hover:underline">{AUTHOR_NAME}</a
			>
			<span class="ml-2 text-xs">v{__APP_VERSION__}</span>
		</p>
	</div>
</footer>
