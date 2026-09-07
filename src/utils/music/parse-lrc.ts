export interface LyricLine {
	readonly time: number;
	readonly text: string;
	readonly translation?: string;
}

function parseTimestamp(minutes: string, seconds: string, fraction = "0"): number {
	const fractionValue = Number(fraction) / 10 ** fraction.length;
	return Number(minutes) * 60 + Number(seconds) + fractionValue;
}

/** 拆分行尾 inline 翻译。 */
export function splitInlineLyricTranslation(text: string): {
	text: string;
	translation?: string;
} {
	const trimmed = text.trim();
	if (!trimmed) return { text: trimmed };

	const match = trimmed.match(/^(.*)\s+[（(]([^）)]+)[）)]\s*$/u);
	if (!match) return { text: trimmed };

	const original = match[1].trim();
	const translation = match[2].trim();
	if (!original || !translation) return { text: trimmed };

	return { text: original, translation };
}

function parseLyricText(value?: string): LyricLine[] {
	if (!value) return [];
	const result: LyricLine[] = [];
	const timestampPattern = /\[(\d{1,2}):(\d{2})(?:[.:](\d{1,3}))?\]/g;

	for (const sourceLine of value.split(/\r?\n/)) {
		const timestamps = [...sourceLine.matchAll(timestampPattern)];
		if (timestamps.length === 0) continue;
		const rawText = sourceLine.replace(timestampPattern, "").trim();
		if (!rawText) continue;
		const { text, translation } = splitInlineLyricTranslation(rawText);
		if (!text) continue;
		for (const timestamp of timestamps) {
			result.push({
				time: parseTimestamp(timestamp[1], timestamp[2], timestamp[3]),
				text,
				...(translation ? { translation } : {}),
			});
		}
	}

	return result.sort((left, right) => left.time - right.time);
}

/** 解析 LRC 歌词，可选合并翻译行。 */
export function parseLrc(lyric?: string, translatedLyric?: string): LyricLine[] {
	const primary = parseLyricText(lyric);
	const translated = parseLyricText(translatedLyric);
	if (translated.length === 0) return primary;

	return primary.map((line) => {
		const matchingLine = translated.find(
			(candidate) => Math.abs(candidate.time - line.time) < 0.08,
		);
		return matchingLine
			? { ...line, translation: matchingLine.text }
			: line;
	});
}
