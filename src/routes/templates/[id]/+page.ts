import { error } from '@sveltejs/kit';
import { templateById, templates } from '$lib/templates';

export const prerender = true;

// One static page per template, so each can be found and shared on its own
export const entries = () => templates.map((t) => ({ id: t.id }));

export function load({ params }) {
	if (!templateById(params.id)) error(404, 'Template not found');
	return { id: params.id }; // only the id: the page looks the template up, so its elements are not sent twice
}
