<script lang="ts">
	import Button from '$lib/components/Button.svelte';
	import { appStore } from '$lib/stores/appStore.svelte.ts';
	import { ArrowRight, Download, Layers, Zap } from '@lucide/svelte';
	import { Icons } from '$lib/icons';

	const steps = [
		{ number: '1', title: 'Start', desc: "Click 'Start Building' to enter the editor" },
		{ number: '2', title: 'Create', desc: 'Add text, shapes, and images to your canvas' },
		{ number: '3', title: 'Design', desc: 'Drag, drop, and arrange elements freely' },
		{ number: '4', title: 'Export', desc: 'Download your document as a PDF' }
	];

	const currentYear: number = new Date().getFullYear();
</script>

<div>
	<!-- header section -->
	<header class="sticky top-0 z-50 border-b border-primary/10 bg-background/80 backdrop-blur-md">
		<div class="container mx-auto flex items-center justify-between px-4 py-4">
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
			<div class="flex items-center gap-4">
				<Button href="/documents" variant="text">My Documents</Button>
				<Button onClick={() => appStore.initNewDocument()} href="/canvas" variant="primary"
					>Start Building</Button
				>
			</div>
		</div>
	</header>

	<!-- hero section -->
	<section class="container mx-auto px-4 py-20 text-center">
		<div class="animate-slide-up">
			<h1
				class="mb-6 bg-gradient-to-r from-primary to-primary/80 bg-clip-text text-5xl font-bold text-transparent md:text-6xl"
			>
				Create Beautiful Documents
			</h1>
			<p class="mx-auto mb-8 max-w-2xl text-xl text-muted-foreground">
				A versatile document builder for creating resumes, invoices, letters, and more. Build
				beautiful, professional documents in minutes with our intuitive drag-and-drop canvas.
			</p>
		</div>
	</section>

	<!-- feature section -->
	<section class="bg-background/50 py-20">
		<div class="container mx-auto px-4">
			<h2 class="mb-16 text-center text-3xl font-bold md:text-4xl">Powerful Features</h2>
			<div class="grid gap-8 md:grid-cols-3">
				<div
					class="group rounded-xl border border-border/50 bg-card p-8 transition-all hover:border-primary/50 hover:shadow-lg"
				>
					<div
						class="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 transition-transform group-hover:scale-110"
					>
						<Zap class="h-6 w-6 text-primary" />
					</div>
					<h3 class="mb-3 text-xl font-semibold">Drag & Drop</h3>
					<p class="text-muted-foreground">
						Easily drag and drop text, shapes, and images onto your canvas. Perfect positioning
						without any technical skills.
					</p>
				</div>

				<div
					class="group rounded-xl border border-border/50 bg-card p-8 transition-all hover:border-primary/50 hover:shadow-lg"
				>
					<div
						class="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 transition-transform group-hover:scale-110"
					>
						<Layers class="h-6 w-6 text-primary" />
					</div>
					<h3 class="mb-3 text-xl font-semibold">Multiple Elements</h3>
					<p class="text-muted-foreground">
						Work with text blocks, geometric shapes, and custom images. Customize colors, sizes, and
						properties for each element.
					</p>
				</div>

				<div
					class="group rounded-xl border border-border/50 bg-card p-8 transition-all hover:border-primary/50 hover:shadow-lg"
				>
					<div
						class="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 transition-transform group-hover:scale-110"
					>
						<Download class="h-6 w-6 text-primary" />
					</div>
					<h3 class="mb-3 text-xl font-semibold">Export to PDF</h3>
					<p class="text-muted-foreground">
						Download your finished document as a professional PDF file. Ready to share or print
						instantly.
					</p>
				</div>
			</div>
		</div>
	</section>

	<!-- How It Works -->
	<section class="container mx-auto px-4 py-20">
		<h2 class="mb-16 text-center text-3xl font-bold md:text-4xl">How It Works</h2>
		<div class="grid gap-4 md:grid-cols-4">
			{#each steps as step (step.number)}
				<div class="text-center">
					<div
						class="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-primary to-primary/80 text-lg font-bold text-primary-foreground"
					>
						{step.number}
					</div>
					<h3 class="mb-2 font-semibold">{step.title}</h3>
					<p class="text-sm text-muted-foreground">{step.desc}</p>
				</div>
			{/each}
		</div>
	</section>

	<!-- CTA Section -->
	<section class="bg-gradient-to-r from-primary to-primary/80 py-20 text-primary-foreground">
		<div class="container mx-auto px-4 text-center">
			<h2 class="mb-4 text-4xl font-bold">Ready to create your document?</h2>
			<p class="mb-8 text-lg text-primary-foreground/90">
				Start building beautiful documents today, completely free.
			</p>
			<Button
				onClick={() => appStore.initNewDocument()}
				href="/canvas"
				variant="secondary"
				className="bg-secondary-foreground hover:bg-secondary-foreground/90"
			>
				Start Building Now
				<ArrowRight class="ml-2 h-5 w-5 transition-transform group-hover:translate-x-1" />
			</Button>
		</div>
	</section>

	<!-- Footer -->
	<footer class="border-t border-border/50 bg-background/50 py-8">
		<div class="container mx-auto px-4 text-center text-muted-foreground">
			<p>&copy; {currentYear} Lienzo. Create beautiful documents with ease.</p>
			<p class="mt-1 text-xs">v{__APP_VERSION__}</p>
		</div>
	</footer>
</div>
