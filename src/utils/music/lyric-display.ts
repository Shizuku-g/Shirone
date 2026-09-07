import { parseLrc, type LyricLine } from "./parse-lrc";

/** 首句歌词早于此秒数视为「无前奏」，片头信息不占用固定轮播时长。 */
const IMMEDIATE_VOCAL_THRESHOLD = 1;

const MINOR_METADATA_LINE =
	/^(编\s*曲|制作人|出品|录音|混音|母带|和声|吉他|贝斯|鼓|键盘|统筹|监制|OP|SP|编曲[：:])/i;

type CreditKind = "title" | "artist" | "lyricist" | "composer";

function isLyricistLine(text: string): boolean {
	return /^作\s*词/u.test(text.trim());
}

function isComposerLine(text: string): boolean {
	return /^作\s*曲/u.test(text.trim());
}

function isMinorMetadataLine(text: string): boolean {
	const value = text.trim();
	if (!value) return true;
	if (isLyricistLine(value) || isComposerLine(value)) return false;
	if (MINOR_METADATA_LINE.test(value)) return true;
	if (
		/[作词作曲编]\s*[：:]/u.test(value) &&
		value.length < 48 &&
		!isLyricistLine(value) &&
		!isComposerLine(value)
	) {
		return true;
	}
	return false;
}

function classifyCreditLine(
	text: string,
	title: string,
	artist: string,
): CreditKind | null {
	const value = text.trim();
	if (!value) return null;
	if (title && value === title) return "title";
	if (artist && value === artist) return "artist";
	if (isLyricistLine(value)) return "lyricist";
	if (isComposerLine(value)) return "composer";
	return null;
}

function firstLyricTime(body: LyricLine[]): number | undefined {
	const singable = body.find((line) => !isMinorMetadataLine(line.text));
	return singable?.time ?? body[0]?.time;
}

function applyIntroTiming(credits: LyricLine[], body: LyricLine[]): LyricLine[] {
	if (credits.length === 0) return credits;

	const firstTime = firstLyricTime(body);
	if (firstTime === undefined || !Number.isFinite(firstTime)) return credits;

	if (firstTime < IMMEDIATE_VOCAL_THRESHOLD) {
		return credits.map((line) => ({ ...line, time: 0 }));
	}

	const distinctTimes = new Set(credits.map((line) => line.time.toFixed(2)));
	const lrcHasCreditTimeline =
		distinctTimes.size > 1 || credits.some((line) => line.time >= 0.05);

	if (lrcHasCreditTimeline) return credits;

	const windowEnd = Math.max(firstTime - 0.06, 0.15);
	const step = windowEnd / credits.length;
	return credits.map((line, index) => ({ ...line, time: index * step }));
}

function mergeCreditAndBody(
	credits: LyricLine[],
	body: LyricLine[],
): LyricLine[] {
	const tagged = [
		...credits.map((line, order) => ({ line, group: 0, order })),
		...body.map((line, order) => ({ line, group: 1, order })),
	];
	tagged.sort((a, b) => {
		if (a.line.time !== b.line.time) return a.line.time - b.line.time;
		if (a.group !== b.group) return a.group - b.group;
		return a.order - b.order;
	});
	return tagged.map((item) => item.line);
}

/** 构建悬浮播放器歌词展示行（含片头 credits 与正文）。 */
export function buildLyricDisplayLines(
	title?: string,
	artist?: string,
	lyric?: string,
	translatedLyric?: string,
): LyricLine[] {
	const parsed = parseLrc(lyric, translatedLyric);
	const titleTrim = title?.trim() ?? "";
	const artistTrim = artist?.trim() ?? "";

	const buckets: Record<CreditKind, LyricLine[]> = {
		title: [],
		artist: [],
		lyricist: [],
		composer: [],
	};
	const body: LyricLine[] = [];

	for (const line of parsed) {
		const kind = classifyCreditLine(line.text, titleTrim, artistTrim);
		if (kind) {
			buckets[kind].push({ time: line.time, text: line.text });
			continue;
		}
		body.push(line);
	}

	const credits: LyricLine[] = [];

	if (titleTrim) {
		if (buckets.title.length > 0) credits.push(...buckets.title);
		else credits.push({ time: 0, text: titleTrim });
	}

	if (artistTrim) {
		if (buckets.artist.length > 0) credits.push(...buckets.artist);
		else credits.push({ time: 0, text: artistTrim });
	}

	credits.push(...buckets.lyricist, ...buckets.composer);

	const timedCredits = applyIntroTiming(credits, body);
	return mergeCreditAndBody(timedCredits, body);
}

export function pickActiveLyricIndex(
	lines: LyricLine[],
	currentTime: number,
): number {
	if (lines.length === 0) return -1;

	let index = 0;
	for (let cursor = 0; cursor < lines.length; cursor += 1) {
		if (currentTime >= lines[cursor].time) index = cursor;
		else break;
	}
	return index;
}

export { isMinorMetadataLine };
