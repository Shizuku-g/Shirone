<script lang="ts">
import Icon from "@iconify/svelte";

interface Props {
	cover?: string;
	coverSrcset?: string;
	coverSizes?: string;
	hasTrack: boolean;
	coverAvailable: boolean;
	noteSize?: number;
	onCoverError?: () => void;
}

let {
	cover,
	coverSrcset,
	coverSizes,
	hasTrack,
	coverAvailable,
	noteSize = 16,
	onCoverError,
}: Props = $props();
</script>

{#if coverAvailable && cover}
	<img
		class="floating-music-artwork__cover"
		src={cover}
		srcset={coverSrcset}
		sizes={coverSizes}
		alt=""
		loading="lazy"
		decoding="async"
		onerror={onCoverError}
	/>
{:else if hasTrack}
	<div class="floating-music-vinyl" aria-hidden="true">
		<div class="floating-music-vinyl__ring"></div>
		<div class="floating-music-vinyl__ring floating-music-vinyl__ring--inner"></div>
		<div class="floating-music-vinyl__dot">
			<Icon icon="material-symbols:music-note-rounded" width={noteSize} height={noteSize} />
		</div>
	</div>
{:else}
	<span class="floating-music-fallback" aria-hidden="true">
		<Icon icon="material-symbols:music-note-rounded" width={20} height={20} />
	</span>
{/if}
