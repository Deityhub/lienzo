<script lang="ts">
	import type { Snippet } from 'svelte';
	import Button from './Button.svelte';

	interface Props {
		open: boolean;
		title?: string;
		description?: string;
		onCancel?: () => void;
		onAccept?: () => void;
		cancelLabel?: string;
		acceptLabel?: string;
		disableActions?: boolean;
		showCancelAction?: boolean;
		showAcceptAction?: boolean;
		closeFromBackdrop?: boolean;
		children: Snippet;
		isPending?: boolean;
	}

	const {
		open = false,
		title = '',
		description = '',
		onCancel = () => {},
		onAccept = () => {},
		cancelLabel = 'Cancel',
		acceptLabel = 'OK',
		disableActions = false,
		showCancelAction = true,
		showAcceptAction = true,
		closeFromBackdrop = false,
		children,
		isPending = false
	}: Props = $props();

	function handleBackdropClick(e: MouseEvent) {
		if (e.target === e.currentTarget && closeFromBackdrop) {
			onCancel?.();
		}
	}
</script>

{#if open}
	<div
		class="fixed inset-0 z-99999 flex items-center justify-center bg-foreground/80 backdrop-blur-md"
		onclick={handleBackdropClick}
		onkeydown={null}
		role="dialog"
		aria-modal="true"
		tabindex="0"
	>
		<div class="mx-4 w-full max-w-lg rounded-xl bg-background shadow-xl">
			<div class="flex items-start justify-between p-6">
				<div class="pr-4">
					{#if title}
						<h2 class="text-lg font-semibold">{title}</h2>
					{/if}
					{#if description}
						<p class="mt-1 text-sm text-muted-foreground">{description}</p>
					{/if}
				</div>
				<Button variant="text" onClick={onCancel} disabled={disableActions || isPending}>
					<svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M6 18L18 6M6 6l12 12"
						></path>
					</svg>
				</Button>
			</div>

			<div class="px-6 pb-6">
				{@render children()}
			</div>

			<div class="flex justify-end gap-3 border-t border-border px-6 py-4">
				{#if showCancelAction}
					<Button variant="ghost" onClick={onCancel} disabled={disableActions || isPending}
						>{cancelLabel}</Button
					>
				{/if}
				{#if showAcceptAction}
					<Button variant="primary" onClick={onAccept} disabled={disableActions} pending={isPending}
						>{acceptLabel}</Button
					>
				{/if}
			</div>
		</div>
	</div>
{/if}
