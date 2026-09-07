<script lang="ts">
import {
	buildLyricDisplayLines,
	isMinorMetadataLine,
	pickActiveLyricIndex,
} from "@utils/music/lyric-display";
import { isResolvedLyricText } from "@utils/music/meting";
import { onMount } from "svelte";

interface Props {
	title?: string;
	artist?: string;
	lyric?: string;
	currentTime: number;
	fallback: string;
	seekLabel: string;
	onSeek: (time: number) => void;
}

let {
	title = "",
	artist = "",
	lyric = "",
	currentTime,
	fallback,
	seekLabel,
	onSeek,
}: Props = $props();

let scrollEl = $state<HTMLDivElement | null>(null);

const lines = $derived(buildLyricDisplayLines(title, artist, lyric));
const activeIndex = $derived(pickActiveLyricIndex(lines, currentTime));
const hasLyricSource = $derived(isResolvedLyricText(lyric));

function formatTime(seconds: number): string {
	if (!Number.isFinite(seconds) || seconds < 0) return "0:00";
	const whole = Math.floor(seconds);
	return `${Math.floor(whole / 60)}:${String(whole % 60).padStart(2, "0")}`;
}

$effect(() => {
	if (!scrollEl || activeIndex < 0) return;
	const activeButton = scrollEl.querySelector<HTMLButtonElement>(
		".floating-music-lyrics__line--active",
	);
	if (!activeButton) return;
	const top =
		activeButton.offsetTop -
		scrollEl.offsetTop -
		scrollEl.clientHeight / 2 +
		activeButton.clientHeight / 2;
	scrollEl.scrollTo({ top: Math.max(0, top), behavior: "smooth" });
});

onMount(() => {
	const element = scrollEl;
	if (!element) return;
	const handleWheel = (event: WheelEvent) => {
		if (element.scrollHeight <= element.clientHeight) return;
		event.stopPropagation();
		const maxScroll = element.scrollHeight - element.clientHeight;
		const nextScroll = Math.min(
			maxScroll,
			Math.max(0, element.scrollTop + event.deltaY),
		);
		if (nextScroll !== element.scrollTop) {
			event.preventDefault();
			element.scrollTop = nextScroll;
		}
	};
	element.addEventListener("wheel", handleWheel, { passive: false });
	return () => element.removeEventListener("wheel", handleWheel);
});
</script>

{#if !hasLyricSource || lines.length === 0 || activeIndex < 0}
	<div class="floating-music-lyrics">
		<p class="floating-music-lyrics__empty">{fallback}</p>
	</div>
{:else}
	<div
		bind:this={scrollEl}
		class="floating-music-lyrics"
		onwheel={(event) => event.stopPropagation()}
	>
		{#each lines as line, index ( `${line.time}-${index}-${line.text}` )}
			<button
				type="button"
				class={`floating-music-lyrics__line${index === activeIndex ? " floating-music-lyrics__line--active" : ""}${isMinorMetadataLine(line.text) ? " floating-music-lyrics__line--meta" : ""}`}
				title={`${seekLabel} ${formatTime(line.time)}`}
				onclick={() => onSeek(line.time)}
			>
				<span class="floating-music-lyrics__primary">{line.text}</span>
				{#if line.translation}
					<span class="floating-music-lyrics__translation">{line.translation}</span>
				{/if}
			</button>
		{/each}
	</div>
{/if}
