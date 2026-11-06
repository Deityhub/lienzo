<script lang="ts">
	import { Modal } from '$lib/components';
	import type { Snippet } from 'svelte';

	interface NameModalProps {
		isOpen: boolean;
		initialName?: string;
		onClose: () => void;
		onSave: (name: string) => void;
		children?: Snippet;
	}

	const { isOpen, initialName = '', onClose, onSave, children }: NameModalProps = $props();

	let name = $state(initialName);
	let error = $state('');

	function handleSave() {
		if (!name.trim()) {
			error = 'Please enter a name.';
			return;
		}
		error = '';
		onSave(name.trim());
	}

	function handleCancel() {
		onClose();
	}
</script>

{#if isOpen}
	<Modal
		open={true}
		title="Name Your Document"
		description="Enter a name for your document."
		onCancel={handleCancel}
		onAccept={handleSave}
		acceptLabel="Save"
		cancelLabel="Cancel"
		disableActions={false}
	>
		<input
			class="w-full rounded border border-border px-3 py-2 text-base focus:border-primary focus:outline-none"
			type="text"
			bind:value={name}
			placeholder="e.g. Product Designer Resume"
			maxlength="64"
			data-autofocus
		/>
		{#if error}
			<div class="mt-2 text-sm text-destructive-text">{error}</div>
		{/if}
		{@render children?.()}
	</Modal>
{/if}
