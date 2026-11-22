<script lang="ts">
	import type { TextElement, TextLink } from '$lib/types/canvas';
	import { appStore } from '$lib/stores/appStore.svelte.ts';
	import { linkRangeStore } from '$lib/stores/linkRange.svelte.ts';
	import { textScale } from '$lib/utils/viewport';
	import {
		textSegments,
		selectionCharRange,
		selectionOffsets,
		setSelectionByOffset,
		linksAfterTextChange,
		linkColor
	} from '$lib/utils/textLinks';

	const { element }: { element: TextElement } = $props();
	const scale = $derived(appStore.getScale());
	const textFactor = $derived(textScale(scale));

	let target: HTMLElement | null = null;

	// Track selection across the document (covers double-click, drag, keyboard,
	// programmatic selection) so the properties panel can pre-fill start/end char.
	let previousElementId: string | null = null;
	$effect(() => {
		if (previousElementId && previousElementId !== element.id) {
			linkRangeStore.clear();
		}
		previousElementId = element.id;

		const onSelectionChange = () => {
			const range = selectionCharRange(target);
			if (range) {
				linkRangeStore.set(element.id, range.start, range.end);
			}
		};
		document.addEventListener('selectionchange', onSelectionChange);
		return () => document.removeEventListener('selectionchange', onSelectionChange);
	});

	// Build the inner HTML of the editable area: plain text runs plus <a> wrappers for links.
	const html = $derived(
		textSegments(element.text, element.links)
			.map((seg) => {
				const escaped = escapeHtml(seg.text);
				if (!seg.link) return escaped;
				const url = escapeAttr(seg.link.url);
				const color = escapeAttr(linkColor(seg.link));
				return `<a href="${url}" data-link="${escapeAttr(seg.link.id)}" style="color:${color}">${escaped}</a>`;
			})
			.join('')
	);

	function escapeHtml(value: string): string {
		return value
			.replace(/&/g, '&amp;')
			.replace(/</g, '&lt;')
			.replace(/>/g, '&gt;')
			.replace(/"/g, '&quot;');
	}

	function escapeAttr(value: string): string {
		return value.replace(/&/g, '&amp;').replace(/"/g, '&quot;');
	}

	function openLink(link: TextLink) {
		if (link.type === 'email') {
			location.href = link.url;
		} else {
			window.open(link.url, '_blank');
		}
	}

	function handleClick(e: MouseEvent) {
		const anchor = (e.target as HTMLElement).closest('a[data-link]');
		if (!anchor) return;
		e.preventDefault();
		const linkId = anchor.getAttribute('data-link')!;
		const link = (element.links ?? []).find((l) => l.id === linkId);
		if (link) openLink(link);
	}

	// Whenever the user selects text in this element, expose the character range so
	// the Link properties panel can pre-fill start/end char for a new link.
	function handleSelect() {
		const range = selectionCharRange(target);
		if (!range) return;
		linkRangeStore.set(element.id, range.start, range.end);
	}

	function handleInput(e: Event) {
		const targetEl = e.target as HTMLElement;
		const actualElementHeight = element.height * scale;
		const newText = targetEl.textContent ?? '';

		// Robust link tracking: move existing links with the text edit instead of
		// leaving them glued to stale absolute character offsets.
		const adjustedLinks = linksAfterTextChange(element.links ?? [], element.text, newText);
		if (JSON.stringify(adjustedLinks) !== JSON.stringify(element.links ?? [])) {
			appStore.updateElement({
				elementId: element.id,
				updates: { links: adjustedLinks },
				pageId: element.pageId
			});
		}

		// Use requestAnimationFrame to batch the height/text updates
		requestAnimationFrame(() => {
			targetEl.style.height = 'auto';
			const scrollHeight = targetEl.scrollHeight;

			// Only update if the content is larger than current height
			if (scrollHeight > actualElementHeight) {
				const newHeight = Math.min(scrollHeight + 2, actualElementHeight * 2); // Limit max height to 2x original
				appStore.updateElement({
					elementId: element.id,
					updates: {
						text: newText,
						height: newHeight / scale
					},
					pageId: element.pageId
				});
				targetEl.style.height = `${newHeight}px`;
			} else {
				appStore.updateElement({
					elementId: element.id,
					updates: { text: newText },
					pageId: element.pageId
				});
			}
		});
	}

	// Keep the editable area in sync with the store when the text or links change from
	// outside this component (e.g. paste, undo, or the properties panel editing links).
	// The caret/selection is preserved across rebuilds so typing isn't disrupted.
	let didInit = false;
	$effect(() => {
		if (!target) return;
		const text = element.text;
		const links = element.links ?? [];
		const current = target.textContent ?? '';
		if (!didInit || current !== text) {
			const offset = selectionOffsets(target);
			// eslint-disable-next-line svelte/no-dom-manipulating
			target.innerHTML = html;
			didInit = true;
			if (offset) setSelectionByOffset(target, offset.start);
		} else if (linksChanged(links)) {
			const offset = selectionOffsets(target);
			// eslint-disable-next-line svelte/no-dom-manipulating
			target.innerHTML = html;
			if (offset) setSelectionByOffset(target, offset.start);
		}
	});

	let previousLinks: TextLink[] = [];
	function linksChanged(links: TextLink[]): boolean {
		if (previousLinks.length !== links.length) {
			previousLinks = links;
			return true;
		}
		const changed = links.some((l, i) => l !== previousLinks[i]);
		previousLinks = links;
		return changed;
	}
</script>

<div class="relative h-full w-full overflow-hidden">
	<div
		bind:this={target}
		class="text-element-view absolute inset-0 h-auto min-h-full w-full cursor-move overflow-hidden border-none break-words focus:outline-none"
		contenteditable="true"
		tabindex="0"
		role="textbox"
		aria-label={`Text element ${element.id}`}
		style:font-family="{element.fontFamily}, sans-serif"
		style:padding="{8 * textFactor}px"
		style:font-size="{element.fontSize * textFactor}px"
		style:font-weight={element.fontWeight}
		style:font-style={element.fontStyle}
		style:text-decoration={element.textDecoration}
		style:text-transform={element.textTransform}
		style:text-align={element.textAlign || 'left'}
		style:color={element.color}
		style:background-color={element.backgroundColor
			? `${element.backgroundColor}${Math.round((element.backgroundOpacity ?? 1) * 255)
					.toString(16)
					.padStart(2, '0')}`
			: 'transparent'}
		id={`text-element-${element.id}`}
		onclick={handleClick}
		oninput={handleInput}
		onselect={handleSelect}
		onkeyup={handleSelect}
		onmouseup={handleSelect}
		ondblclick={handleSelect}
	></div>
</div>

<style>
	:global(.text-element-view a) {
		text-decoration: underline;
		cursor: pointer;
	}
	:global(.text-element-view a:visited) {
		color: inherit;
	}
</style>
