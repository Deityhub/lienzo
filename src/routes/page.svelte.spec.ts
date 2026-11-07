import { page } from '@vitest/browser/context';
import { describe, expect, it } from 'vitest';
import { render } from 'vitest-browser-svelte';
import Page from './+page.svelte';

describe('/+page.svelte', () => {
	it('should render the main heading', async () => {
		render(Page);

		const heading = page.getByRole('heading', { level: 1 });
		await expect.element(heading).toBeInTheDocument();
		await expect.element(heading).toHaveTextContent('Design it. Export it. Edit it again.');
	});

	it('should render the description paragraph', async () => {
		render(Page);

		const description = page.getByText(
			'Lienzo is a document builder for A4 pages. Place text, shapes and images, and export a PDF that keeps real text and carries your editable document inside.'
		);
		await expect.element(description).toBeInTheDocument();
	});

	it('should render the primary "Start designing" button', async () => {
		render(Page);

		const createButton = page.getByRole('link', { name: 'Start designing' }).first();
		await expect.element(createButton).toBeInTheDocument();
		await expect.element(createButton).toHaveAttribute('href', '/canvas');
		await expect.element(createButton).not.toBeDisabled();
	});

	it('should render the "My Documents" button', async () => {
		render(Page);

		const documentsButton = page.getByRole('link', { name: 'My Documents' }).first();
		await expect.element(documentsButton).toBeInTheDocument();
		await expect.element(documentsButton).toHaveAttribute('href', '/documents');
		await expect.element(documentsButton).not.toBeDisabled();
	});

	it('should have proper semantic structure', async () => {
		render(Page);

		// Check heading hierarchy
		const h1 = page.getByRole('heading', { level: 1 });
		await expect.element(h1).toBeInTheDocument();

		// Verify the page title is set
		await expect.element(h1).toHaveTextContent('Design it. Export it. Edit it again.');
	});

	it('has one main heading and a heading for every section', async () => {
		render(Page);

		await expect.element(page.getByRole('heading', { level: 1 })).toBeInTheDocument();
		for (const name of [
			'A PDF that is more than a picture',
			'Built for laying out one good page',
			'Questions, answered'
		]) {
			await expect.element(page.getByRole('heading', { level: 2, name })).toBeInTheDocument();
		}
	});

	it('answers the common questions in the page', async () => {
		render(Page);

		await expect.element(page.getByText('Do I need an account?')).toBeInTheDocument();
		await expect
			.element(page.getByText('Is the exported PDF really editable?'))
			.toBeInTheDocument();
	});

	it('should show the app version in the footer', async () => {
		render(Page);

		await expect.element(page.getByText(`v${__APP_VERSION__}`)).toBeInTheDocument();
	});
});
