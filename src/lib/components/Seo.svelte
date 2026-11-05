<script lang="ts">
	import { AUTHOR_NAME, OG_IMAGE, SITE_DESCRIPTION, SITE_NAME, SITE_URL } from '$lib/const/seo';

	interface Props {
		title: string;
		description?: string;
		path?: string;
		/** Keep the page out of search results (per-user / client-only pages). */
		noindex?: boolean;
		jsonLd?: Record<string, unknown>;
	}

	const {
		title,
		description = SITE_DESCRIPTION,
		path = '/',
		noindex = false,
		jsonLd
	}: Props = $props();

	const url = $derived(new URL(path, SITE_URL).href);
	// Built by concatenation: a literal closing script tag would end this component's <script> block.
	const SCRIPT_CLOSE = '</' + 'script>';
	// `<` is escaped so the JSON can never break out of the tag; jsonLd is always static data from our own code.
	const jsonLdTag = $derived(
		jsonLd
			? `<script type="application/ld+json">${JSON.stringify(jsonLd).replaceAll('<', '\\u003c')}${SCRIPT_CLOSE}`
			: ''
	);
</script>

<svelte:head>
	<title>{title}</title>
	<meta name="description" content={description} />
	{#if noindex}
		<meta name="robots" content="noindex, nofollow" />
	{:else}
		<link rel="canonical" href={url} />
		<meta name="author" content={AUTHOR_NAME} />
		<meta property="og:type" content="website" />
		<meta property="og:site_name" content={SITE_NAME} />
		<meta property="og:title" content={title} />
		<meta property="og:description" content={description} />
		<meta property="og:url" content={url} />
		<meta property="og:image" content={OG_IMAGE} />
		<meta property="og:image:width" content="1200" />
		<meta property="og:image:height" content="630" />
		<meta property="og:image:alt" content="Lienzo – a modern document builder" />
		<meta name="twitter:card" content="summary_large_image" />
		<meta name="twitter:title" content={title} />
		<meta name="twitter:description" content={description} />
		<meta name="twitter:image" content={OG_IMAGE} />
		{#if jsonLdTag}
			<!-- eslint-disable-next-line svelte/no-at-html-tags -- static, escaped JSON-LD -->
			{@html jsonLdTag}
		{/if}
	{/if}
</svelte:head>
