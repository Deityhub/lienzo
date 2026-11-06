<script lang="ts">
	import Button from '$lib/components/Button.svelte';
	import { clipboard } from '$lib/canvas/clipboard.svelte';
	import { Copy, CopyPlus, Scissors } from '@lucide/svelte';
</script>

<div class="space-y-2">
	<h4 class="font-medium text-foreground">Copy &amp; Paste</h4>
	<div class="flex flex-wrap gap-2">
		<Button
			data-testid="copy-btn"
			onClick={() => clipboard.copy()}
			size="xs"
			variant="secondary"
			className="max-lg:min-w-[6rem]"
		>
			<Copy class="mr-1 h-3.5 w-3.5" />
			Copy
		</Button>
		<Button
			data-testid="cut-btn"
			onClick={() => clipboard.cut()}
			size="xs"
			variant="secondary"
			className="max-lg:min-w-[6rem]"
		>
			<Scissors class="mr-1 h-3.5 w-3.5" />
			Cut
		</Button>
		<Button
			data-testid="duplicate-btn"
			onClick={() => clipboard.duplicate()}
			size="xs"
			variant="secondary"
			className="max-lg:min-w-[6rem]"
		>
			<CopyPlus class="mr-1 h-3.5 w-3.5" />
			Duplicate
		</Button>
	</div>
</div>
