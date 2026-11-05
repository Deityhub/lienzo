import type { Handle } from '@sveltejs/kit';

// Preload only the UI font (Inter, latin). Other fonts belong to the editor and load on demand.
export const handle: Handle = ({ event, resolve }) =>
	resolve(event, {
		preload: ({ type, path }) =>
			type === 'js' || type === 'css' || (type === 'font' && path.includes('Inter-Variable-latin.'))
	});
