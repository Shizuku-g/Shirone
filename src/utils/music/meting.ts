import type {
	MetingMusicConfig,
	TrackDescriptor,
} from "../../types/musicConfig.ts";

export const DEFAULT_METING_API =
	"https://api.injahow.cn/meting/?server=:server&type=:type&id=:id&r=:r";
export const DEFAULT_METING_SERVER = "netease";
export const DEFAULT_METING_TYPE = "playlist";
/** 按曲名/歌手搜索网易云曲目 ID，用于本地曲目补全歌词。 */
export const DEFAULT_MUSIC_SEARCH_API =
	"https://music-api.gdstudio.xyz/api.php";

export interface RawMetingSong {
	id?: number | string;
	name?: string;
	title?: string;
	artist?: string;
	author?: string;
	duration?: number | string;
	pic?: string;
	url?: string;
	lrc?: string;
}

/** 从 Meting 资源字段或 URL 查询参数中提取平台歌曲 ID。 */
export function extractMetingResourceId(
	value?: string | number | null,
): string | null {
	if (value === undefined || value === null) return null;
	const trimmed = String(value).trim();
	if (!trimmed) return null;
	if (/^\d+$/.test(trimmed)) return trimmed;

	try {
		const url = new URL(trimmed, "https://local.invalid");
		const id = url.searchParams.get("id")?.trim();
		return id && /^\d+$/.test(id) ? id : null;
	} catch {
		return null;
	}
}

/** Meting 歌单里的 lrc 字段常为歌词 API 链接，而非 LRC 正文。 */
export function isMetingLyricReference(value?: string): boolean {
	if (!value?.trim()) return false;
	const trimmed = value.trim();
	return /^https?:\/\//i.test(trimmed) || /type=lrc/i.test(trimmed);
}

/** 判断是否为可直接解析的 LRC 文本。 */
export function isResolvedLyricText(value?: string): boolean {
	if (!value?.trim()) return false;
	if (isMetingLyricReference(value)) return false;
	return value.includes("[");
}

/**
 * 根据 Meting 配置组装请求 URL。若 ID 为空则返回 null。
 */
export function buildMetingUrl(config: MetingMusicConfig): string | null {
	const id = config.id?.trim();
	if (!id) return null;

	return buildMetingResourceUrl(config, config.type?.trim() || DEFAULT_METING_TYPE, id);
}

/** 组装 Meting 单曲资源 URL（lrc / url / pic 等）。 */
export function buildMetingResourceUrl(
	config: MetingMusicConfig,
	resourceType: string,
	resourceId: string,
): string | null {
	const id = resourceId.trim();
	if (!id) return null;

	const api = config.api?.trim() || DEFAULT_METING_API;
	const server = config.server?.trim() || DEFAULT_METING_SERVER;
	const random = Date.now().toString();

	return api
		.replace(":server", encodeURIComponent(server))
		.replace(":type", encodeURIComponent(resourceType))
		.replace(":id", encodeURIComponent(id))
		.replace(":auth", "")
		.replace(":r", random);
}

/** 从 TrackDescriptor.id 解析 Meting 平台原始歌曲 ID。 */
export function parseMetingTrackSongId(
	trackId: string,
	server = DEFAULT_METING_SERVER,
): string | null {
	const prefix = `meting-${server}-`;
	if (trackId.startsWith(prefix)) {
		const songId = trackId.slice(prefix.length);
		return songId && !songId.includes("-") ? songId : null;
	}

	const match = trackId.match(/^meting-[^-]+-(.+)$/);
	if (!match) return null;
	const songId = match[1];
	return songId && !songId.includes("-") ? songId : null;
}

export interface MetingSearchResult {
	readonly id: string;
	readonly name: string;
	readonly artist?: string | readonly string[];
	readonly lyric_id?: string;
}

/** 归一化曲名/歌手，便于本地与远端曲目匹配。 */
export function normalizeMusicMetadata(value: string): string {
	return value.trim().toLowerCase().replace(/\s+/g, " ");
}

function formatSearchArtist(
	artist: MetingSearchResult["artist"],
): string {
	if (!artist) return "";
	if (Array.isArray(artist)) {
		return artist
			.map((item) => String(item).trim())
			.filter(Boolean)
			.join(" / ");
	}
	return String(artist).trim();
}

function artistsLooselyMatch(candidate: string, expected: string): boolean {
	const left = normalizeMusicMetadata(candidate);
	const right = normalizeMusicMetadata(expected);
	if (!left || !right) return false;
	return left === right || left.includes(right) || right.includes(left);
}

/** 在搜索结果中挑选与本地 metadata 最匹配的一曲。 */
export function pickBestMetingSearchMatch(
	results: readonly MetingSearchResult[],
	title: string,
	artist?: string,
): MetingSearchResult | null {
	if (results.length === 0) return null;

	const normalizedTitle = normalizeMusicMetadata(title);
	const normalizedArtist = artist?.trim()
		? normalizeMusicMetadata(artist)
		: null;

	const scored = results
		.map((result) => {
			const resultTitle = normalizeMusicMetadata(result.name);
			const resultArtist = normalizeMusicMetadata(
				formatSearchArtist(result.artist),
			);
			let score = 0;

			if (resultTitle === normalizedTitle) score += 10;
			else if (
				resultTitle.includes(normalizedTitle) ||
				normalizedTitle.includes(resultTitle)
			) {
				score += 5;
			} else {
				return { result, score: -1 };
			}

			if (normalizedArtist) {
				if (resultArtist === normalizedArtist) score += 8;
				else if (artistsLooselyMatch(resultArtist, normalizedArtist)) score += 4;
				else score -= 2;
			}

			return { result, score };
		})
		.filter((item) => item.score >= 0);

	if (scored.length === 0) return results[0] ?? null;
	scored.sort((left, right) => right.score - left.score);
	return scored[0]?.result ?? null;
}

/** 在当前播放列表的 Meting 曲目中按曲名/歌手查找平台 ID。 */
export function findMetingSongIdInPlaylist(
	playlist: readonly TrackDescriptor[],
	title: string,
	artist?: string,
	server = DEFAULT_METING_SERVER,
): string | null {
	const normalizedTitle = normalizeMusicMetadata(title);
	const normalizedArtist = artist?.trim()
		? normalizeMusicMetadata(artist)
		: null;

	for (const track of playlist) {
		const songId = parseMetingTrackSongId(track.id, server);
		if (!songId) continue;
		if (normalizeMusicMetadata(track.title) !== normalizedTitle) continue;
		if (
			normalizedArtist &&
			track.artist &&
			!artistsLooselyMatch(track.artist, normalizedArtist)
		) {
			continue;
		}
		return songId;
	}

	return null;
}

/**
 * 通过曲名（及可选歌手）搜索 Meting 平台曲目 ID；失败时静默返回 undefined。
 */
export async function searchMetingSongIdByMetadata(
	config: MetingMusicConfig,
	title: string,
	artist?: string,
	customFetch: typeof fetch = fetch,
): Promise<string | undefined> {
	const trimmedTitle = title.trim();
	if (!trimmedTitle) return undefined;

	const searchApi = config.searchApi?.trim() || DEFAULT_MUSIC_SEARCH_API;
	const server = config.server?.trim() || DEFAULT_METING_SERVER;
	const url = new URL(searchApi);
	url.searchParams.set("types", "search");
	url.searchParams.set("source", server);
	url.searchParams.set("name", trimmedTitle);
	url.searchParams.set("count", "8");

	try {
		const response = await customFetch(url.toString());
		if (!response.ok) return undefined;

		const data = (await response.json()) as unknown;
		if (!Array.isArray(data) || data.length === 0) return undefined;

		const results: MetingSearchResult[] = [];
		for (const item of data) {
			if (!item || typeof item !== "object") continue;
			const record = item as {
				id?: string | number;
				name?: string;
				artist?: string | string[];
				lyric_id?: string | number;
			};
			const id = String(record.lyric_id ?? record.id ?? "").trim();
			const name = String(record.name ?? "").trim();
			if (!id || !name) continue;
			results.push({
				id,
				name,
				artist: record.artist,
				lyric_id: id,
			});
		}

		const match = pickBestMetingSearchMatch(results, trimmedTitle, artist);
		return match?.lyric_id ?? match?.id;
	} catch {
		return undefined;
	}
}

/** 解析用于拉取歌词的平台歌曲 ID（Meting 曲目 / 列表匹配 / 曲名搜索）。 */
export async function resolveMetingLyricSongId(
	config: MetingMusicConfig,
	track: Pick<TrackDescriptor, "id" | "title" | "artist" | "lyric" | "source">,
	playlist: readonly TrackDescriptor[],
	customFetch: typeof fetch = fetch,
): Promise<string | undefined> {
	const server = config.server?.trim() || DEFAULT_METING_SERVER;
	const directId =
		parseMetingTrackSongId(track.id, server) ??
		extractMetingResourceId(track.lyric) ??
		extractMetingResourceId(track.source);
	if (directId) return directId;

	const playlistMatch = findMetingSongIdInPlaylist(
		playlist,
		track.title,
		track.artist,
		server,
	);
	if (playlistMatch) return playlistMatch;

	return searchMetingSongIdByMetadata(
		config,
		track.title,
		track.artist,
		customFetch,
	);
}

/**
 * 按需拉取 Meting 单曲 LRC 原文；失败时静默返回 undefined。
 */
export async function fetchMetingLyric(
	config: MetingMusicConfig,
	songId: string,
	customFetch: typeof fetch = fetch,
): Promise<string | undefined> {
	const trimmedId = songId.trim();
	if (!trimmedId) return undefined;

	const url = /^https?:\/\//i.test(trimmedId)
		? trimmedId
		: buildMetingResourceUrl(config, "lrc", trimmedId);
	if (!url) return undefined;

	try {
		const response = await customFetch(url);
		if (!response.ok) return undefined;

		const text = (await response.text()).trim();
		if (!text) return undefined;

		const contentType = response.headers.get("content-type") ?? "";
		if (contentType.includes("json") || text.startsWith("[") || text.startsWith("{")) {
			try {
				const data = JSON.parse(text) as unknown;
				if (Array.isArray(data)) {
					const first = data[0] as { lyric?: string; lrc?: string } | undefined;
					const lyric = (first?.lyric ?? first?.lrc ?? "").trim();
					return lyric || undefined;
				}
				if (data && typeof data === "object") {
					const record = data as { lyric?: string; lrc?: string };
					const lyric = (record.lyric ?? record.lrc ?? "").trim();
					return lyric || undefined;
				}
			} catch {
				// 部分 Meting 节点直接返回 LRC 纯文本
			}
		}

		return text.includes("[") ? text : undefined;
	} catch {
		return undefined;
	}
}

/**
 * 将 Meting API 单曲响应清洗并转换为标准的 TrackDescriptor。
 */
export function parseMetingSong(
	song: RawMetingSong,
	index: number,
	server = DEFAULT_METING_SERVER,
): TrackDescriptor | null {
	if (!song || typeof song !== "object") return null;

	const title = (song.name ?? song.title ?? "").trim();
	const source = (song.url ?? "").trim();
	if (!title || !source) return null;

	const songId =
		extractMetingResourceId(song.id) ??
		extractMetingResourceId(song.url) ??
		extractMetingResourceId(song.lrc);
	const id = songId
		? `meting-${server}-${songId}`
		: `meting-${server}-${index}-${Math.random().toString(36).slice(2, 8)}`;

	const artist = (song.artist ?? song.author ?? "").trim() || undefined;
	const cover = (song.pic ?? "").trim() || undefined;

	let duration: number | undefined;
	if (typeof song.duration === "number" && Number.isFinite(song.duration)) {
		duration =
			song.duration > 10000
				? Math.floor(song.duration / 1000)
				: Math.floor(song.duration);
	} else if (typeof song.duration === "string") {
		const parsed = Number.parseInt(song.duration, 10);
		if (Number.isFinite(parsed) && parsed > 0) {
			duration = parsed > 10000 ? Math.floor(parsed / 1000) : parsed;
		}
	}
	if (duration !== undefined && duration <= 0) {
		duration = undefined;
	}

	const rawLrc = (song.lrc ?? "").trim();
	const lyric = isResolvedLyricText(rawLrc) ? rawLrc : undefined;

	return Object.freeze({
		id,
		title,
		source,
		artist,
		cover,
		duration,
		lyric,
	});
}

/**
 * 从 Meting API 异步获取并解析曲目列表。
 */
export async function fetchMetingTracks(
	config: MetingMusicConfig,
	customFetch: typeof fetch = fetch,
): Promise<readonly TrackDescriptor[]> {
	const url = buildMetingUrl(config);
	if (!url) return [];

	const response = await customFetch(url);
	if (!response.ok) {
		throw new Error(`Meting API HTTP ${response.status}`);
	}

	const data = (await response.json()) as RawMetingSong[];
	if (!Array.isArray(data)) return [];

	const server = config.server || DEFAULT_METING_SERVER;
	const tracks: TrackDescriptor[] = [];
	const seenIds = new Set<string>();

	for (let i = 0; i < data.length; i++) {
		const track = parseMetingSong(data[i], i, server);
		if (track && !seenIds.has(track.id)) {
			seenIds.add(track.id);
			tracks.push(track);
		}
	}

	return Object.freeze(tracks);
}
