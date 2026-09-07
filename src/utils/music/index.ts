export { MUSIC_VOLUME_STORAGE_KEY, PLAYBACK_MODES } from "./constants";
export {
	buildMetingUrl,
	buildMetingResourceUrl,
	DEFAULT_METING_API,
	DEFAULT_METING_SERVER,
	DEFAULT_METING_TYPE,
	DEFAULT_MUSIC_SEARCH_API,
	extractMetingResourceId,
	fetchMetingLyric,
	fetchMetingTracks,
	findMetingSongIdInPlaylist,
	isMetingLyricReference,
	isResolvedLyricText,
	normalizeMusicMetadata,
	parseMetingSong,
	parseMetingTrackSongId,
	pickBestMetingSearchMatch,
	resolveMetingLyricSongId,
	searchMetingSongIdByMetadata,
	type MetingSearchResult,
	type RawMetingSong,
} from "./meting";
export {
	createMusicRuntime,
	destroyMusicRuntime,
	getMusicRuntime,
	type MusicRuntimeDependencies,
} from "./music-runtime";
export { nextTrackIndex, previousTrackIndex } from "./playlist";
export {
	buildLyricDisplayLines,
	isMinorMetadataLine,
	pickActiveLyricIndex,
} from "./lyric-display";
export { parseLrc, splitInlineLyricTranslation, type LyricLine } from "./parse-lrc";
export type {
	MusicErrorCode,
	MusicRuntime,
	MusicSnapshot,
	MusicStatus,
	PlaybackMode,
	TrackDescriptor,
} from "./types";
