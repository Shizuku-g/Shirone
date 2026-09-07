<script lang="ts">
import IconButton from "@components/atoms/action/IconButton.svelte";
import Tooltip from "@components/atoms/overlay/Tooltip.svelte";
import FloatingPlayerCover from "@components/organisms/music/floating/FloatingPlayerCover.svelte";
import FloatingPlayerLyrics from "@components/organisms/music/floating/FloatingPlayerLyrics.svelte";
import Icon from "@iconify/svelte";
import { onMount } from "svelte";
import type { ResolvedMusicOptions } from "@/config/musicConfig";
import { isResolvedLyricText } from "@/utils/music/meting";
import {
	clampFloatingPlayerFabPosition,
	FLOATING_PLAYER_FAB_SIZE_PX,
	isFloatingPlayerRightExpandCorner,
	isFloatingPlayerTopExpandCorner,
	readInitialFabAnchor,
	resolveExpandedDockPosition,
	resolveExpandPanelTransformOrigin,
	resolveFloatingPanelTransformOrigin,
	resolveFloatingPlayerExpandCorner,
	writeFloatingPlayerPosition,
	type FloatingPlayerExpandCorner,
	type FloatingPlayerPosition,
} from "@/utils/music/floating-player-position";
import type {
	MusicErrorCode,
	MusicRuntime,
	MusicSnapshot,
	PlaybackMode,
} from "@/types/musicConfig";

interface Labels {
	expand: string;
	collapse: string;
	previous: string;
	play: string;
	pause: string;
	next: string;
	mute: string;
	unmute: string;
	playbackMode: string;
	modeSequence: string;
	modeRepeatOne: string;
	modeShuffle: string;
	showLyrics: string;
	hideLyrics: string;
	noLyrics: string;
	showPlaylist: string;
	hidePlaylist: string;
	playlist: string;
	empty: string;
	loading: string;
	notPlaying: string;
	waitingPlaylist: string;
	seek: string;
	dragPlayer: string;
	errors: Record<MusicErrorCode, string>;
}

interface Props {
	options: ResolvedMusicOptions;
	labels: Labels;
}

let { options, labels }: Props = $props();

let runtime = $state<MusicRuntime | null>(null);
let snapshot = $state<MusicSnapshot>({
	playlist: options.playlist,
	currentIndex: options.playlist.length > 0 ? 0 : -1,
	currentTrack: options.playlist[0] ?? null,
	status: options.provider === "meting" ? "loading" : "idle",
	currentTime: 0,
	duration: options.playlist[0]?.duration ?? 0,
	volume: options.defaultVolume,
	muted: false,
	mode: options.defaultMode,
	error:
		options.playlist.length > 0 ||
		options.provider === "meting" ||
		options.provider === "mixed"
			? null
			: "empty-playlist",
});

let collapsed = $state(true);
let showLyrics = $state(false);
let showQueue = $state(false);
let brokenCovers = $state<Set<string>>(new Set());
let scrubTime = $state<number | null>(null);
let collapseTimer = $state<number | null>(null);
let rootEl = $state<HTMLElement | null>(null);
const initialFabAnchor =
	typeof window !== "undefined" ? readInitialFabAnchor() : null;
let fabAnchor = $state<FloatingPlayerPosition | null>(initialFabAnchor);
let dockPosition = $state<FloatingPlayerPosition | null>(initialFabAnchor);
let panelTransformOrigin = $state("bottom left");
let isDragging = $state(false);
let dragPointerId = $state<number | null>(null);
let dragOffset = { x: 0, y: 0 };
let fabPressTimer = $state<number | null>(null);
let fabPointerId = $state<number | null>(null);
let fabPointer = { x: 0, y: 0 };
let fabPressStart = { x: 0, y: 0 };
let suppressFabExpand = $state(false);
let longPressReady = $state(false);
/** 展开时锁定正方形锚点角，避免切换歌词/列表时反复改 left/top。 */
let lockedExpandCorner = $state<FloatingPlayerExpandCorner | null>(null);

const FAB_LONG_PRESS_MS = 150;
const FAB_MOVE_CANCEL_PX = 10;
/** 展开面板估算尺寸，用于首帧定位；挂载后会按实测 rect 微调。 */
const PANEL_WIDTH_ESTIMATE = 296;
const PANEL_HEIGHT_ESTIMATE = 310;

const dockStyle = $derived.by(() => {
	if (!dockPosition) return undefined;
	return `--floating-music-panel-origin:${panelTransformOrigin};left:${dockPosition.left}px;top:${dockPosition.top}px;`;
});

const playing = $derived(snapshot.status === "playing");
const loading = $derived(snapshot.status === "loading");
const hasTracks = $derived(snapshot.playlist.length > 0);
const playbackActive = $derived(playing || loading);
const currentTrack = $derived(snapshot.currentTrack);
const duration = $derived(Math.max(0, snapshot.duration));
const displayTime = $derived(scrubTime ?? snapshot.currentTime);
const progressPercent = $derived(
	duration > 0 ? Math.min(Math.max((displayTime / duration) * 100, 0), 100) : 0,
);
const coverAvailable = $derived(
	Boolean(
		currentTrack?.cover &&
			!brokenCovers.has(currentTrack.id) &&
			hasTracks,
	),
);
const modeLabels: Record<PlaybackMode, string> = {
	sequence: labels.modeSequence,
	"repeat-one": labels.modeRepeatOne,
	shuffle: labels.modeShuffle,
};
const modeIcons: Record<PlaybackMode, string> = {
	sequence: "material-symbols:repeat-rounded",
	"repeat-one": "material-symbols:repeat-one-rounded",
	shuffle: "material-symbols:shuffle-rounded",
};
const modeLabel = $derived(modeLabels[snapshot.mode]);
const modeIcon = $derived(modeIcons[snapshot.mode]);
const lyricPending = $derived(
	!isResolvedLyricText(currentTrack?.lyric) &&
		(options.provider === "meting" || options.provider === "mixed"),
);
const lyricFallback = $derived(
	showLyrics && lyricPending ? labels.loading : labels.noLyrics,
);
const queueFlipped = $derived(
	lockedExpandCorner !== null &&
		isFloatingPlayerRightExpandCorner(lockedExpandCorner),
);
/** 手机端：上侧两角时列表改到面板下方，避免向上溢出视口。 */
const queueMobileBelow = $derived(
	lockedExpandCorner !== null &&
		isFloatingPlayerTopExpandCorner(lockedExpandCorner),
);

function applyFabAnchor(left: number, top: number) {
	fabAnchor = clampFloatingPlayerFabPosition(left, top);
	dockPosition = fabAnchor;
	panelTransformOrigin = resolveFloatingPanelTransformOrigin(
		fabAnchor,
		FLOATING_PLAYER_FAB_SIZE_PX,
		FLOATING_PLAYER_FAB_SIZE_PX,
	);
}

function measurePanelSize(root: HTMLElement): { width: number; height: number } | null {
	const panel = root.querySelector(".floating-music-panel");
	if (!panel) return null;
	const rect = panel.getBoundingClientRect();
	if (rect.width <= 0 || rect.height <= 0) return null;
	return { width: rect.width, height: rect.height };
}

function syncExpandedDockPosition() {
	if (!rootEl || !fabAnchor || collapsed || !lockedExpandCorner) return;
	requestAnimationFrame(() => {
		if (!rootEl || !fabAnchor || collapsed || !lockedExpandCorner) return;
		const size = measurePanelSize(rootEl);
		if (!size) return;
		dockPosition = resolveExpandedDockPosition(
			fabAnchor,
			size.width,
			size.height,
			lockedExpandCorner,
		);
		panelTransformOrigin = resolveExpandPanelTransformOrigin(
			lockedExpandCorner,
		);
	});
}

function syncCollapsedDockPosition() {
	if (!fabAnchor) return;
	dockPosition = fabAnchor;
	panelTransformOrigin = resolveFloatingPanelTransformOrigin(
		fabAnchor,
		FLOATING_PLAYER_FAB_SIZE_PX,
		FLOATING_PLAYER_FAB_SIZE_PX,
	);
}

function clampFabAnchorToViewport() {
	if (!fabAnchor) return;
	fabAnchor = clampFloatingPlayerFabPosition(fabAnchor.left, fabAnchor.top);
	if (collapsed) syncCollapsedDockPosition();
	else syncExpandedDockPosition();
}

function clearFabPressTimer() {
	if (fabPressTimer !== null) window.clearTimeout(fabPressTimer);
	fabPressTimer = null;
}

function beginDockDrag(pointerId: number) {
	if (!fabAnchor) return;
	isDragging = true;
	dragPointerId = pointerId;
	dragOffset = {
		x: fabPressStart.x - fabAnchor.left,
		y: fabPressStart.y - fabAnchor.top,
	};
	clearCollapseTimer();
}

function handleDragMove(event: PointerEvent) {
	if (!isDragging || event.pointerId !== dragPointerId) return;
	event.preventDefault();
	applyFabAnchor(event.clientX - dragOffset.x, event.clientY - dragOffset.y);
}

function handleDragEnd(event: PointerEvent) {
	if (!isDragging || event.pointerId !== dragPointerId) return;
	isDragging = false;
	dragPointerId = null;
	if (fabAnchor) writeFloatingPlayerPosition(fabAnchor);
}

function handleFabPointerDown(event: PointerEvent) {
	if (!rootEl || event.button !== 0 || !collapsed) return;
	event.preventDefault();
	clearFabPressTimer();
	fabPointerId = event.pointerId;
	fabPointer = { x: event.clientX, y: event.clientY };
	fabPressStart = { x: event.clientX, y: event.clientY };
	suppressFabExpand = false;
	longPressReady = false;
	(event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
	fabPressTimer = window.setTimeout(() => {
		if (fabPointerId !== event.pointerId) return;
		longPressReady = true;
		suppressFabExpand = true;
		beginDockDrag(event.pointerId);
		applyFabAnchor(fabPointer.x - dragOffset.x, fabPointer.y - dragOffset.y);
	}, FAB_LONG_PRESS_MS);
}

function handleFabPointerMove(event: PointerEvent) {
	if (fabPointerId !== event.pointerId) return;
	fabPointer = { x: event.clientX, y: event.clientY };

	if (!longPressReady && !isDragging) {
		const moved = Math.hypot(
			event.clientX - fabPressStart.x,
			event.clientY - fabPressStart.y,
		);
		if (moved > FAB_MOVE_CANCEL_PX) {
			clearFabPressTimer();
			suppressFabExpand = true;
		}
	}

	if (isDragging) handleDragMove(event);
}

function handleFabPointerUp(event: PointerEvent) {
	if (fabPointerId !== event.pointerId) return;
	clearFabPressTimer();

	if (isDragging) {
		handleDragEnd(event);
	} else if (!suppressFabExpand) {
		expandPlayer();
	}

	fabPointerId = null;
	longPressReady = false;
	suppressFabExpand = false;

	try {
		(event.currentTarget as HTMLElement).releasePointerCapture(event.pointerId);
	} catch {
		// 指针可能已被浏览器释放。
	}
}

function handleFabPointerCancel(event: PointerEvent) {
	if (fabPointerId !== event.pointerId) return;
	clearFabPressTimer();
	if (isDragging) handleDragEnd(event);
	fabPointerId = null;
	longPressReady = false;
	suppressFabExpand = false;
}

onMount(() => {
	let unsubscribe = () => {};
	let active = true;
	void import("@utils/music").then(({ getMusicRuntime }) => {
		if (!active) return;
		runtime = getMusicRuntime(options);
		unsubscribe = runtime.subscribe((next) => {
			snapshot = next;
		});
		void runtime.initialize();
	});

	if (!fabAnchor) {
		const anchor = readInitialFabAnchor();
		if (anchor) {
			fabAnchor = anchor;
			dockPosition = anchor;
			panelTransformOrigin = resolveFloatingPanelTransformOrigin(
				anchor,
				FLOATING_PLAYER_FAB_SIZE_PX,
				FLOATING_PLAYER_FAB_SIZE_PX,
			);
		}
	}

	const handleResize = () => clampFabAnchorToViewport();
	window.addEventListener("resize", handleResize);

	const handlePointerDown = (event: PointerEvent) => {
		if (collapsed || !rootEl || isDragging) return;
		if (!rootEl.contains(event.target as Node)) collapsePlayer();
	};
	document.addEventListener("pointerdown", handlePointerDown);

	return () => {
		active = false;
		unsubscribe();
		window.removeEventListener("resize", handleResize);
		document.removeEventListener("pointerdown", handlePointerDown);
		clearCollapseTimer();
		clearFabPressTimer();
	};
});

$effect(() => {
	collapsed;
	queueMicrotask(() => {
		if (collapsed) syncCollapsedDockPosition();
		else syncExpandedDockPosition();
	});
});

function clearCollapseTimer() {
	if (collapseTimer !== null) window.clearTimeout(collapseTimer);
	collapseTimer = null;
}

function startCollapseTimer() {
	clearCollapseTimer();
	if (collapsed) return;
	collapseTimer = window.setTimeout(() => {
		collapsePlayer();
	}, 5000);
}

function expandPlayer() {
	clearCollapseTimer();
	if (fabAnchor) {
		lockedExpandCorner = resolveFloatingPlayerExpandCorner(fabAnchor);
		dockPosition = resolveExpandedDockPosition(
			fabAnchor,
			PANEL_WIDTH_ESTIMATE,
			PANEL_HEIGHT_ESTIMATE,
			lockedExpandCorner,
		);
		panelTransformOrigin = resolveExpandPanelTransformOrigin(
			lockedExpandCorner,
		);
	}
	collapsed = false;
}

function collapsePlayer() {
	clearCollapseTimer();
	collapsed = true;
	showLyrics = false;
	showQueue = false;
	lockedExpandCorner = null;
	syncCollapsedDockPosition();
}

function formatTime(value: number): string {
	if (!Number.isFinite(value) || value < 0) return "0:00";
	const seconds = Math.floor(value);
	return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
}

function cycleMode() {
	const modes: PlaybackMode[] = ["sequence", "repeat-one", "shuffle"];
	const index = modes.indexOf(snapshot.mode);
	runtime?.setMode(modes[(index + 1) % modes.length]);
}

function markBrokenCover(id: string) {
	brokenCovers = new Set(brokenCovers).add(id);
}

function commitScrub(value: number) {
	if (!Number.isFinite(value)) return;
	runtime?.seek(Math.max(0, value));
	scrubTime = null;
}

function toggleLyrics() {
	clearCollapseTimer();
	showLyrics = !showLyrics;
}

function toggleQueue() {
	clearCollapseTimer();
	showQueue = !showQueue;
	if (showQueue) void runtime?.initialize();
}

let previousTrackId = $state<string | null>(null);
$effect(() => {
	const id = currentTrack?.id ?? null;
	if (id === previousTrackId) return;
	previousTrackId = id;
	showLyrics = false;
	scrubTime = null;
});
</script>

<div
	bind:this={rootEl}
	class={`floating-music-dock${isDragging ? " floating-music-dock--dragging" : ""}`}
	style={dockStyle}
	onmouseenter={clearCollapseTimer}
	onmouseleave={startCollapseTimer}
>
	<div
		class={`floating-music-dock__inner${collapsed ? " floating-music-dock--collapsed" : " floating-music-dock--expanded"}`}
	>
		{#if collapsed}
			<div class="floating-music-fab">
				{#if playbackActive}
					<span class="floating-music-fab__pulse" aria-hidden="true"></span>
					<span
						class="floating-music-fab__pulse floating-music-fab__pulse--delay"
						aria-hidden="true"
					></span>
				{/if}
				<button
					type="button"
					class={`floating-music-fab__button m3-state-layer${playbackActive ? " floating-music-fab__button--active" : ""}${isDragging || longPressReady ? " floating-music-fab__button--dragging" : ""}`}
					title={labels.expand}
					aria-label={labels.expand}
					onpointerdown={handleFabPointerDown}
					onpointermove={handleFabPointerMove}
					onpointerup={handleFabPointerUp}
					onpointercancel={handleFabPointerCancel}
				>
					<FloatingPlayerCover
						cover={currentTrack?.cover}
						coverSrcset={currentTrack?.coverSrcset}
						coverSizes={currentTrack?.coverSizes}
						hasTrack={hasTracks}
						coverAvailable={coverAvailable}
						noteSize={12}
						onCoverError={() => currentTrack && markBrokenCover(currentTrack.id)}
					/>
				</button>
			</div>
		{:else}
			<div class="floating-music-stack">
				{#if showQueue}
					<div
						class={`floating-music-queue${queueFlipped ? " floating-music-queue--flip-x" : ""}${queueMobileBelow ? " floating-music-queue--stack-below" : ""}`}
						role="dialog"
						aria-label={labels.playlist}
					>
						<div class="floating-music-queue__header">
							<span>{labels.playlist}</span>
							<span>{snapshot.playlist.length}</span>
						</div>
						<div class="floating-music-queue__body">
							{#if hasTracks}
								{#each snapshot.playlist as track, index (track.id)}
									<button
										type="button"
										class={`floating-music-queue__item m3-state-layer${index === snapshot.currentIndex ? " floating-music-queue__item--current" : ""}`}
										onclick={() => void runtime?.select(index)}
									>
										<span class="floating-music-queue__index" aria-hidden="true">
											{#if index === snapshot.currentIndex && playing}
												<Icon icon="material-symbols:play-arrow-rounded" width={14} height={14} />
											{:else}
												{index + 1}
											{/if}
										</span>
										<span class="floating-music-queue__meta">
											<span class="floating-music-queue__title">{track.title}</span>
											{#if track.artist}
												<span class="floating-music-queue__artist">{track.artist}</span>
											{/if}
										</span>
									</button>
								{/each}
							{:else}
								<p class="floating-music-lyrics__empty">{labels.empty}</p>
							{/if}
						</div>
					</div>
				{/if}

				<div class={`floating-music-panel${playbackActive ? " floating-music-panel--playing" : ""}`}>
					<div class={`floating-music-body${showLyrics ? " floating-music-body--lyrics" : ""}`}>
						<div class="floating-music-topbar">
							<div class="floating-music-volume">
								<Tooltip label={snapshot.muted ? labels.unmute : labels.mute} placement="top">
									<IconButton
										icon="material-symbols:volume-up-rounded"
										checkedIcon="material-symbols:volume-off-rounded"
										label={snapshot.muted ? labels.unmute : labels.mute}
										size="xsmall"
										toggle
										checked={snapshot.muted}
										onclick={() => runtime?.setMuted(!snapshot.muted)}
									/>
								</Tooltip>
								<input
									type="range"
									min="0"
									max="1"
									step="0.01"
									value={snapshot.muted ? 0 : snapshot.volume}
									aria-label={labels.mute}
									class="floating-music-volume__slider"
									oninput={(event) =>
										runtime?.setVolume(
											Number((event.currentTarget as HTMLInputElement).value),
										)}
								/>
							</div>
							<Tooltip label={labels.collapse} placement="top">
								<IconButton
									icon="material-symbols:close-rounded"
									label={labels.collapse}
									size="xsmall"
									onclick={collapsePlayer}
								/>
							</Tooltip>
						</div>

						<button
							type="button"
							class={`floating-music-artwork${showLyrics ? " floating-music-artwork--lyrics" : ""}`}
							title={showLyrics ? labels.hideLyrics : labels.showLyrics}
							aria-label={showLyrics ? labels.hideLyrics : labels.showLyrics}
							onclick={toggleLyrics}
						>
							{#if showLyrics}
								<div
									class="floating-music-artwork__lyrics-wrap"
									onclick={(event) => event.stopPropagation()}
									onkeydown={(event) => event.stopPropagation()}
									role="presentation"
								>
									<FloatingPlayerLyrics
										title={currentTrack?.title}
										artist={currentTrack?.artist}
										lyric={currentTrack?.lyric}
										currentTime={snapshot.currentTime}
										fallback={lyricFallback}
										seekLabel={labels.seek}
										onSeek={(time) => runtime?.seek(time)}
									/>
								</div>
							{:else}
								<div class={`floating-music-disc${playing ? " floating-music-disc--playing" : ""}`}>
									<div
										class={`floating-music-disc__spin${playing ? " floating-music-disc__spin--active" : ""}`}
									>
										<FloatingPlayerCover
											cover={currentTrack?.cover}
											coverSrcset={currentTrack?.coverSrcset}
											coverSizes={currentTrack?.coverSizes}
											hasTrack={hasTracks}
											coverAvailable={coverAvailable}
											noteSize={14}
											onCoverError={() =>
												currentTrack && markBrokenCover(currentTrack.id)}
										/>
									</div>
								</div>
							{/if}
						</button>

						{#if !showLyrics}
							<div class="floating-music-track">
								<p class="floating-music-track__title">
									{hasTracks ? currentTrack?.title : labels.notPlaying}
								</p>
								<p class="floating-music-track__artist">
									{hasTracks
										? currentTrack?.artist || "—"
										: loading
											? labels.loading
											: labels.waitingPlaylist}
								</p>
							</div>
						{/if}

						<div class="floating-music-progress">
						<div class="floating-music-progress__row">
							<span class="floating-music-progress__time">{formatTime(displayTime)}</span>
							<div class="floating-music-progress__track">
								<input
									type="range"
									min="0"
									max={duration || 100}
									step="0.1"
									value={displayTime}
									disabled={duration <= 0 || !hasTracks}
									aria-label={labels.seek}
									oninput={(event) =>
										(scrubTime = Number((event.currentTarget as HTMLInputElement).value))}
									onpointerup={(event) =>
										commitScrub(Number((event.currentTarget as HTMLInputElement).value))}
								/>
								<div class="floating-music-progress__bar">
									<div
										class="floating-music-progress__fill"
										style={`width: ${progressPercent}%`}
									></div>
								</div>
								<div
									class="floating-music-progress__thumb"
									style={`left: ${progressPercent}%`}
								></div>
							</div>
							<span class="floating-music-progress__time floating-music-progress__time--end">
								{formatTime(duration)}
							</span>
						</div>
					</div>

					<div class="floating-music-controls">
						<Tooltip label={modeLabel} placement="top">
							<IconButton
								icon={modeIcon}
								label={`${labels.playbackMode}: ${modeLabel}`}
								size="xsmall"
								disabled={!hasTracks}
								onclick={cycleMode}
							/>
						</Tooltip>
						<Tooltip label={labels.previous} placement="top">
							<IconButton
								icon="material-symbols:skip-previous-rounded"
								label={labels.previous}
								size="small"
								disabled={!hasTracks}
								onclick={() => void runtime?.previous()}
							/>
						</Tooltip>
						<Tooltip label={playing ? labels.pause : labels.play} placement="top">
							<IconButton
								icon="material-symbols:play-arrow-rounded"
								checkedIcon="material-symbols:pause-rounded"
								label={playing ? labels.pause : labels.play}
								variant="filled"
								size="medium"
								toggle
								checked={playing}
								disabled={!hasTracks && options.provider !== "meting"}
								onclick={() => void runtime?.toggle()}
							/>
						</Tooltip>
						<Tooltip label={labels.next} placement="top">
							<IconButton
								icon="material-symbols:skip-next-rounded"
								label={labels.next}
								size="small"
								disabled={!hasTracks}
								onclick={() => void runtime?.next()}
							/>
						</Tooltip>
						<Tooltip
							label={showQueue ? labels.hidePlaylist : labels.showPlaylist}
							placement="top"
						>
							<IconButton
								icon="material-symbols:queue-music-rounded"
								label={showQueue ? labels.hidePlaylist : labels.showPlaylist}
								size="xsmall"
								disabled={!hasTracks && options.provider !== "meting"}
								onclick={toggleQueue}
							/>
						</Tooltip>
					</div>
					</div>
				</div>
			</div>
		{/if}
	</div>

	{#if snapshot.error && snapshot.status === "error"}
		<p class="sr-only">{labels.errors[snapshot.error]}</p>
	{/if}
</div>
