import { page, userEvent } from '@vitest/browser/context';
import { describe, expect, it, vi } from 'vitest';
import { render } from 'vitest-browser-svelte';
import RangeInput from './RangeInput.svelte';

const props = {
	label: 'Opacity',
	testId: 'range',
	value: 0.5,
	min: 0,
	max: 1,
	step: 0.1,
	format: (v: number) => `${(v * 100).toFixed(0)}%`,
	onChange: () => {}
};

describe('RangeInput', () => {
	it('shows the label, the slider and the formatted value', async () => {
		render(RangeInput, props);

		await expect.element(page.getByText('Opacity')).toBeInTheDocument();
		await expect.element(page.getByText('50%')).toBeInTheDocument();
		const slider = page.getByTestId('range');
		await expect.element(slider).toHaveAttribute('min', '0');
		await expect.element(slider).toHaveAttribute('max', '1');
		await expect.element(slider).toHaveAttribute('step', '0.1');
	});

	it('reports changes as numbers', async () => {
		const onChange = vi.fn();
		render(RangeInput, { ...props, onChange });

		const slider = page.getByTestId('range').element() as HTMLInputElement;
		slider.focus();
		await userEvent.keyboard('{ArrowRight}');

		expect(onChange).toHaveBeenCalledWith(0.6);
	});
});
