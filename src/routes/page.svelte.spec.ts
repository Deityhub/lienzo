import { page } from '@vitest/browser/context';
import { describe, expect, it } from 'vitest';
import { render } from 'vitest-browser-svelte';
import Page from './+page.svelte';

describe('/+page.svelte', () => {
	it('should render the main heading', async () => {
		render(Page);

		const heading = page.getByRole('heading', { level: 1 });
		await expect.element(heading).toBeInTheDocument();
		await expect.element(heading).toHaveTextContent('Create Beautiful Documents');
	});

	it('should render the description paragraph', async () => {
		render(Page);

		const description = page.getByText(
			'A versatile document builder for creating resumes, invoices, letters, and more. Build beautiful, professional documents in minutes with our intuitive drag-and-drop canvas.'
		);
		await expect.element(description).toBeInTheDocument();
	});

	it('should render the primary "Start Building" button', async () => {
		render(Page);

		const createButton = page.getByRole('link', { name: 'Start Building' }).first();
		await expect.element(createButton).toBeInTheDocument();
		await expect.element(createButton).toHaveAttribute('href', '/canvas');
		await expect.element(createButton).not.toBeDisabled();
	});

	it('should render the "My Documents" button', async () => {
		render(Page);

		const documentsButton = page.getByRole('link', { name: 'My Documents' });
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
		await expect.element(h1).toHaveTextContent('Create Beautiful Documents');
	});

	it('should show the app version in the footer', async () => {
		render(Page);

		await expect.element(page.getByText(`v${__APP_VERSION__}`)).toBeInTheDocument();
	});
});
