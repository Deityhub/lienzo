import adapterNode from '@sveltejs/adapter-node';
import adapterVercel from '@sveltejs/adapter-vercel';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

// Vercel is the default target; the Docker image builds with ADAPTER=node.
const adapter = process.env.ADAPTER === 'node' ? adapterNode() : adapterVercel();

/** @type {import('@sveltejs/kit').Config} */
const config = {
	// Consult https://svelte.dev/docs/kit/integrations
	// for more information about preprocessors
	preprocess: vitePreprocess(),
	kit: {
		adapter,
		// Links are plain absolute paths. The relative ones SvelteKit makes for prerendered pages came out wrong on /templates/[id].
		paths: { relative: false }
	}
};

export default config;
