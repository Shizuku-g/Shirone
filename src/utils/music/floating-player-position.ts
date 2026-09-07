import { FLOATING_MUSIC_POSITION_STORAGE_KEY } from "./constants";

export interface FloatingPlayerPosition {
	readonly left: number;
	readonly top: number;
}

/** 内接正方形四角之一，面板对应角与该角重合后向视口内侧展开。 */
export type FloatingPlayerExpandCorner =
	| "top-left"
	| "top-right"
	| "bottom-left"
	| "bottom-right";

/** FAB 圆内最大内接正方形。 */
export interface FabInscribedSquare {
	readonly left: number;
	readonly top: number;
	readonly right: number;
	readonly bottom: number;
	readonly centerX: number;
	readonly centerY: number;
}

const MIN_EDGE_MARGIN = 8;
/** 与 floatingMusicStyles 中 FAB 的 3.5rem 一致。 */
export const FLOATING_PLAYER_FAB_SIZE_PX = 56;
/** 播放列表与面板间距（0.45rem @ 16px）。 */
export const FLOATING_PLAYER_QUEUE_GAP_PX = 7.2;

function viewportMargin(): number {
	if (typeof window === "undefined") return 16;
	return window.matchMedia("(min-width: 640px)").matches ? 24 : 16;
}

/** 计算 FAB 圆的内接正方形边界。 */
export function resolveFabInscribedSquare(
	fabAnchor: FloatingPlayerPosition,
): FabInscribedSquare {
	const inset = (FLOATING_PLAYER_FAB_SIZE_PX * (1 - 1 / Math.SQRT2)) / 2;
	const side = FLOATING_PLAYER_FAB_SIZE_PX - inset * 2;
	const left = fabAnchor.left + inset;
	const top = fabAnchor.top + inset;
	return {
		left,
		top,
		right: left + side,
		bottom: top + side,
		centerX: fabAnchor.left + FLOATING_PLAYER_FAB_SIZE_PX / 2,
		centerY: fabAnchor.top + FLOATING_PLAYER_FAB_SIZE_PX / 2,
	};
}

/** 展开锚点是否落在正方形右侧两角。 */
export function isFloatingPlayerRightExpandCorner(
	corner: FloatingPlayerExpandCorner,
): boolean {
	return corner === "top-right" || corner === "bottom-right";
}

/** 展开锚点是否落在正方形上侧两角（面板向下展开）。 */
export function isFloatingPlayerTopExpandCorner(
	corner: FloatingPlayerExpandCorner,
): boolean {
	return corner === "top-left" || corner === "top-right";
}

/** 将 FAB 锚点坐标限制在视口内（始终按圆形尺寸计算，不受展开面板影响）。 */
export function clampFloatingPlayerFabPosition(
	left: number,
	top: number,
): FloatingPlayerPosition {
	return clampFloatingPlayerPosition(
		left,
		top,
		FLOATING_PLAYER_FAB_SIZE_PX,
		FLOATING_PLAYER_FAB_SIZE_PX,
	);
}

/** 计算默认左下角 FAB 锚点坐标。 */
export function resolveDefaultFloatingPlayerFabPosition(): FloatingPlayerPosition {
	return resolveDefaultFloatingPlayerPosition(
		FLOATING_PLAYER_FAB_SIZE_PX,
		FLOATING_PLAYER_FAB_SIZE_PX,
	);
}

/** 计算默认左下角坐标。 */
export function resolveDefaultFloatingPlayerPosition(
	_dockWidth: number,
	dockHeight: number,
): FloatingPlayerPosition {
	if (typeof window === "undefined") {
		return { left: 16, top: 0 };
	}
	const margin = viewportMargin();
	return {
		left: margin,
		top: Math.max(
			MIN_EDGE_MARGIN,
			window.innerHeight - dockHeight - margin,
		),
	};
}

/** 将坐标限制在视口内。 */
export function clampFloatingPlayerPosition(
	left: number,
	top: number,
	dockWidth: number,
	dockHeight: number,
): FloatingPlayerPosition {
	if (typeof window === "undefined") {
		return { left, top };
	}
	const maxLeft = Math.max(
		MIN_EDGE_MARGIN,
		window.innerWidth - dockWidth - MIN_EDGE_MARGIN,
	);
	const maxTop = Math.max(
		MIN_EDGE_MARGIN,
		window.innerHeight - dockHeight - MIN_EDGE_MARGIN,
	);
	return {
		left: Math.min(Math.max(MIN_EDGE_MARGIN, left), maxLeft),
		top: Math.min(Math.max(MIN_EDGE_MARGIN, top), maxTop),
	};
}

/** 读取已保存的位置。 */
export function readFloatingPlayerPosition(): FloatingPlayerPosition | null {
	if (typeof window === "undefined") return null;
	try {
		const raw = window.localStorage.getItem(FLOATING_MUSIC_POSITION_STORAGE_KEY);
		if (!raw) return null;
		const parsed = JSON.parse(raw) as { left?: unknown; top?: unknown };
		const left = Number(parsed.left);
		const top = Number(parsed.top);
		if (!Number.isFinite(left) || !Number.isFinite(top)) return null;
		return { left, top };
	} catch {
		return null;
	}
}

/** 持久化位置。 */
export function writeFloatingPlayerPosition(position: FloatingPlayerPosition): void {
	if (typeof window === "undefined") return;
	try {
		window.localStorage.setItem(
			FLOATING_MUSIC_POSITION_STORAGE_KEY,
			JSON.stringify(position),
		);
	} catch {
		// 存储不可用时静默降级。
	}
}

/**
 * 按内接正方形中心所在象限，选取正方形的一个角作为固定展开锚点：
 * - 左上象限 → 正方形左上角
 * - 右上象限 → 正方形右上角
 * - 左下象限 → 正方形左下角
 * - 右下象限 → 正方形右下角
 */
export function resolveFloatingPlayerExpandCorner(
	fabAnchor: FloatingPlayerPosition,
): FloatingPlayerExpandCorner {
	if (typeof window === "undefined") {
		return "bottom-left";
	}
	const square = resolveFabInscribedSquare(fabAnchor);
	const inTopHalf = square.centerY < window.innerHeight / 2;
	const inLeftHalf = square.centerX < window.innerWidth / 2;
	if (inTopHalf && inLeftHalf) return "top-left";
	if (inTopHalf) return "top-right";
	if (inLeftHalf) return "bottom-left";
	return "bottom-right";
}

/** 面板指定角与正方形锚点角重合，计算 dock 左上角坐标。 */
function resolvePanelOriginFromCorner(
	square: FabInscribedSquare,
	panelWidth: number,
	panelHeight: number,
	corner: FloatingPlayerExpandCorner,
): FloatingPlayerPosition {
	switch (corner) {
		case "top-left":
			return { left: square.left, top: square.top };
		case "top-right":
			return { left: square.right - panelWidth, top: square.top };
		case "bottom-left":
			return { left: square.left, top: square.bottom - panelHeight };
		case "bottom-right":
			return { left: square.right - panelWidth, top: square.bottom - panelHeight };
	}
}

/** 按正方形固定角展开面板；播放列表为 absolute 叠层，不改变面板位置。 */
export function resolveExpandedDockPosition(
	fabAnchor: FloatingPlayerPosition,
	panelWidth: number,
	panelHeight: number,
	corner: FloatingPlayerExpandCorner,
): FloatingPlayerPosition {
	const square = resolveFabInscribedSquare(fabAnchor);
	const origin = resolvePanelOriginFromCorner(
		square,
		panelWidth,
		panelHeight,
		corner,
	);
	return clampFloatingPlayerPosition(
		origin.left,
		origin.top,
		panelWidth,
		panelHeight,
	);
}

export function resolveExpandPanelTransformOrigin(
	corner: FloatingPlayerExpandCorner,
): string {
	return corner.replace("-", " ");
}

/** 客户端首屏同步读取 FAB 锚点（避免先默认再跳转）。 */
export function readInitialFabAnchor(): FloatingPlayerPosition | null {
	if (typeof window === "undefined") return null;
	const stored = readFloatingPlayerPosition();
	if (stored) return clampFloatingPlayerFabPosition(stored.left, stored.top);
	return resolveDefaultFloatingPlayerFabPosition();
}

/** 根据停靠位置决定收起态 transform-origin。 */
export function resolveFloatingPanelTransformOrigin(
	position: FloatingPlayerPosition,
	dockWidth: number,
	dockHeight: number,
): string {
	if (typeof window === "undefined") return "bottom left";
	const centerX = position.left + dockWidth / 2;
	const centerY = position.top + dockHeight / 2;
	const anchorX = centerX >= window.innerWidth / 2 ? "right" : "left";
	const anchorY = centerY >= window.innerHeight / 2 ? "bottom" : "top";
	return `${anchorY} ${anchorX}`;
}
