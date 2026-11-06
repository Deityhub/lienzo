import { SITE_URL } from '$lib/const/seo';
import { templates } from '$lib/templates';

export const prerender = true;

// Only indexable pages belong here (/canvas and /documents are per-user and noindex).
const pages = ['/', '/templates', ...templates.map((t) => `/templates/${t.id}`)];

export function GET() {
	const urls = pages
		.map((path) => `<url><loc>${new URL(path, SITE_URL).href}</loc></url>`)
		.join('');
	return new Response(
		`<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls}</urlset>`,
		{ headers: { 'Content-Type': 'application/xml' } }
	);
}
