import { goto } from '$app/navigation';
import { resolve } from '$app/paths';
import { appStore } from '$lib/stores/appStore.svelte.ts';
import { documentFromTemplate } from '.';
import type { Template } from './types';

/** Open a new document made from the template in the editor. */
export async function openTemplate(template: Template) {
	appStore.setCurrentDocument(documentFromTemplate(template));
	await goto(resolve('/canvas'));
}
