/** 悬浮胶囊播放器样式（blogWeb player-dock 移植，token 对齐 M3E） */
export const floatingMusicStylus = `
.floating-music-dock
	--floating-music-accent: var(--primary)
	position: fixed
	left: var(--floating-music-init-left, var(--m3e-space-4))
	top: var(--floating-music-init-top, calc(100vh - 3.5rem - var(--m3e-space-4)))
	bottom: auto
	z-index: 70
	pointer-events: none
	user-select: none
	touch-action: none

	@media (min-width: 640px)
		left: var(--floating-music-init-left, var(--m3e-space-6))
		top: var(--floating-music-init-top, calc(100vh - 3.5rem - var(--m3e-space-6)))

	&--dragging
		.floating-music-dock__inner
			transition: none

	&__inner
		pointer-events: auto
		overflow: visible
		transition: width var(--m3e-duration-medium) var(--m3e-easing-standard)

	&--collapsed
		width: 3.5rem

	&--expanded
		width: unquote("min(18.5rem, calc(100vw - 4rem))")

.floating-music-fab
	position: relative
	width: 3.5rem
	height: 3.5rem

	&__pulse
		position: absolute
		inset: 0
		z-index: 0
		border-radius: var(--shape-corner-full)
		border: 2px solid unquote("color-mix(in oklab, var(--floating-music-accent) 86%, var(--surface-container-lowest) 14%)")
		opacity: 0
		pointer-events: none
		animation: floating-music-fab-pulse 1.8s cubic-bezier(0.22, 1, 0.36, 1) infinite

		&--delay
			animation-delay: 0.9s

	&__button
		position: relative
		z-index: 1
		display: flex
		align-items: center
		justify-content: center
		width: 3.5rem
		height: 3.5rem
		padding: 0
		overflow: hidden
		border-radius: var(--shape-corner-full)
		border: 1px solid var(--outline-variant)
		background: unquote("color-mix(in srgb, var(--surface-container-low) 95%, transparent)")
		color: var(--on-surface)
		box-shadow: var(--m3e-elevation-2)
		backdrop-filter: blur(14px)
		cursor: pointer
		touch-action: none
		transition: transform var(--m3e-duration-short) var(--m3e-easing-standard)

		.floating-music-artwork__cover
			display: block
			width: 100%
			height: 100%
			object-fit: cover
			object-position: center

		&:hover
			transform: scale(1.05)

		&:active
			transform: scale(0.95)

		&--dragging
			cursor: grabbing
			transform: scale(1.02)

			&:active
				transform: scale(1.02)

		&--active
			border-color: var(--floating-music-accent)
			animation: floating-music-fab-glow 1.6s ease-in-out infinite

		.floating-music-artwork__cover,
		.floating-music-vinyl,
		.floating-music-fallback
			width: 100%
			height: 100%

.floating-music-stack
	position: relative
	display: flex
	flex-direction: row
	align-items: stretch
	width: max-content
	max-width: 100%

.floating-music-panel
	width: 18.5rem
	flex-shrink: 0
	overflow: hidden
	border-radius: 0.85rem
	border: 1px solid unquote("color-mix(in srgb, var(--outline-variant) 88%, transparent)")
	background: unquote("color-mix(in srgb, var(--surface-container-low) 94%, transparent)")
	color: var(--on-surface)
	backdrop-filter: blur(14px)
	box-shadow: var(--m3e-elevation-2), unquote("0 10px 28px color-mix(in oklab, var(--on-surface) 10%, transparent)")
	animation: floating-music-panel-in 0.26s cubic-bezier(0.22, 1, 0.36, 1)
	transform-origin: var(--floating-music-panel-origin, bottom left)

	&--playing
		border-color: unquote("color-mix(in oklab, var(--floating-music-accent) 34%, var(--outline-variant) 66%)")
		box-shadow: var(--m3e-elevation-2), unquote("0 10px 28px color-mix(in oklab, var(--floating-music-accent) 16%, transparent)")

.floating-music-body
	display: flex
	flex-direction: column
	align-items: center
	gap: 0.5rem
	width: 100%
	padding: 0.85rem 1rem 0.9rem
	box-sizing: border-box
	--floating-music-cover-height: 8rem
	--floating-music-track-slot: 2.65rem

.floating-music-topbar
	display: flex
	align-items: center
	justify-content: space-between
	align-self: stretch
	width: 100%
	gap: 0.35rem
	min-height: 1.55rem

.floating-music-volume
	display: flex
	align-items: center
	gap: 0.35rem
	flex: 1
	min-width: 0

	&__slider
		flex: 1
		min-width: 0
		height: 0.18rem
		margin: 0
		accent-color: var(--primary)
		cursor: pointer

.floating-music-artwork
	display: flex
	align-items: center
	justify-content: center
	flex-shrink: 0
	width: 100%
	height: var(--floating-music-cover-height)
	padding: 0
	border: none
	background: transparent
	overflow: hidden
	cursor: pointer

	&--lyrics
		height: unquote("calc(var(--floating-music-cover-height) + 0.5rem + var(--floating-music-track-slot))")
		border-radius: var(--shape-corner-l)
		cursor: pointer

	&__lyrics-wrap
		width: 100%
		height: 100%
		overflow: hidden
		-webkit-mask-image: unquote("linear-gradient(to bottom, transparent 0%, #000 14%, #000 86%, transparent 100%)")
		mask-image: unquote("linear-gradient(to bottom, transparent 0%, #000 14%, #000 86%, transparent 100%)")

	&__cover
		display: block
		width: 100%
		height: 100%
		object-fit: cover
		object-position: center

.floating-music-disc
	position: relative
	width: 6rem
	height: 6rem
	flex-shrink: 0
	overflow: hidden
	border-radius: var(--shape-corner-full)
	border: 1px solid var(--outline-variant)
	background: var(--surface-container-low)
	box-shadow: unquote("0 4px 12px color-mix(in oklab, var(--on-surface) 8%, transparent)")
	transition: border-color var(--m3e-duration-medium) var(--m3e-easing-standard), box-shadow var(--m3e-duration-medium) var(--m3e-easing-standard)

	&::before
		content: ""
		position: absolute
		inset: -3px
		z-index: 0
		border-radius: var(--shape-corner-full)
		border: 2px solid var(--floating-music-accent)
		opacity: 0
		pointer-events: none

	&--playing
		border-color: var(--floating-music-accent)
		box-shadow: 0 0 0 1.5px var(--surface-container-lowest), 0 0 0 2.5px var(--floating-music-accent), unquote("0 4px 16px color-mix(in oklab, var(--floating-music-accent) 24%, transparent)")

		&::before
			animation: floating-music-disc-ripple 3.2s cubic-bezier(0.1, 0.8, 0.2, 1) infinite

	&__spin
		position: relative
		z-index: 1
		display: flex
		align-items: center
		justify-content: center
		width: 100%
		height: 100%
		overflow: hidden
		border-radius: var(--shape-corner-full)

		&--active
			animation: floating-music-disc-spin 16s linear infinite

		.floating-music-vinyl,
		.floating-music-fallback
			width: 100%
			height: 100%

.floating-music-vinyl
	position: relative
	display: grid
	width: 100%
	height: 100%
	place-items: center
	background: radial-gradient(circle at 50% 50%, #4a4e5c 0%, #2a2d36 38%, #14151b 72%)

	&__ring
		position: absolute
		inset: 10%
		border-radius: var(--shape-corner-full)
		border: 1px solid rgba(255, 255, 255, 0.08)

		&--inner
			inset: 22%

	&__dot
		display: grid
		width: 24%
		height: 24%
		place-items: center
		border-radius: var(--shape-corner-full)
		background: var(--floating-music-accent)
		color: var(--on-primary)

.floating-music-fallback
	display: grid
	width: 100%
	height: 100%
	place-items: center
	color: var(--primary)
	background: unquote("color-mix(in srgb, var(--on-surface) 6%, transparent)")

.floating-music-track
	width: 100%
	min-height: var(--floating-music-track-slot)
	text-align: center

	&__title
		margin: 0
		overflow: hidden
		text-overflow: ellipsis
		white-space: nowrap
		font-size: 1.05rem
		font-weight: 700
		line-height: 1.3
		color: var(--on-surface)

	&__artist
		margin: 0.15rem 0 0
		overflow: hidden
		text-overflow: ellipsis
		white-space: nowrap
		font: var(--m3e-type-body-small)
		color: var(--on-surface-variant)

.floating-music-lyrics
	height: 100%
	padding: 0.45rem 0.55rem
	overflow-y: auto
	overscroll-behavior: contain
	text-align: center
	scrollbar-width: none
	-ms-overflow-style: none
	touch-action: pan-y

	&::-webkit-scrollbar
		display: none

	&__line
		display: flex
		flex-direction: column
		align-items: center
		gap: 0.12rem
		width: 100%
		margin: 0
		padding: 0.35rem 0.5rem
		border: none
		border-radius: var(--shape-corner-s)
		background: transparent
		cursor: pointer
		transition: color var(--m3e-duration-short) var(--m3e-easing-standard)

		&--active
			.floating-music-lyrics__primary
				color: var(--primary)
				font-weight: 600
				font-size: 0.95rem

			.floating-music-lyrics__translation
				color: unquote("color-mix(in srgb, var(--primary) 78%, transparent)")
				font-size: 0.78rem

		&--meta
			.floating-music-lyrics__primary
				opacity: 0.72
				font-size: 0.72rem

	&__primary
		display: block
		width: 100%
		color: unquote("color-mix(in srgb, var(--on-surface) 58%, transparent)")
		font: var(--m3e-type-body-small)
		line-height: 1.45
		transition: color var(--m3e-duration-short) var(--m3e-easing-standard), font-size var(--m3e-duration-short) var(--m3e-easing-standard)

	&__translation
		display: block
		width: 100%
		color: unquote("color-mix(in srgb, var(--on-surface) 46%, transparent)")
		font: var(--m3e-type-label-small)
		line-height: 1.35
		transition: color var(--m3e-duration-short) var(--m3e-easing-standard), font-size var(--m3e-duration-short) var(--m3e-easing-standard)

	&__empty
		display: grid
		height: 100%
		place-items: center
		margin: 0
		color: var(--on-surface-variant)
		font: var(--m3e-type-body-small)

.floating-music-progress
	width: 100%

	&__row
		display: flex
		align-items: center
		gap: 0.4rem
		width: 100%

	&__time
		flex: none
		width: 2.35rem
		font: var(--m3e-type-label-small)
		font-variant-numeric: tabular-nums
		color: var(--on-surface-variant)

		&--end
			text-align: right

	&__track
		position: relative
		flex: 1
		min-width: 0
		height: 0.85rem
		cursor: pointer

		input[type="range"]
			position: absolute
			inset: 0
			z-index: 2
			width: 100%
			height: 100%
			margin: 0
			opacity: 0
			cursor: pointer

		.floating-music-progress__bar
			position: absolute
			top: 50%
			left: 0
			right: 0
			z-index: 0
			height: 0.18rem
			border-radius: var(--shape-corner-full)
			background: var(--outline-variant)
			transform: translateY(-50%)
			overflow: hidden
			pointer-events: none

		.floating-music-progress__fill
			height: 100%
			border-radius: inherit
			background: var(--primary)
			pointer-events: none

		.floating-music-progress__thumb
			position: absolute
			top: 50%
			z-index: 1
			width: 0.55rem
			height: 0.55rem
			border-radius: var(--shape-corner-full)
			border: 2px solid var(--primary)
			background: var(--surface-container-lowest)
			transform: translate(-50%, -50%)
			pointer-events: none

.floating-music-controls
	display: grid
	grid-template-columns: repeat(5, 1fr)
	align-items: center
	width: 100%
	margin-top: 0.1rem

	> *
		justify-self: center

.floating-music-queue
	position: absolute
	left: unquote("calc(100% + 0.45rem)")
	top: 0
	bottom: 0
	z-index: 2
	display: flex
	flex-direction: column
	width: 13.5rem
	height: auto
	overflow: hidden
	overscroll-behavior: contain
	pointer-events: auto
	border-radius: var(--shape-corner-l)
	border: 1px solid unquote("color-mix(in srgb, var(--outline-variant) 88%, transparent)")
	background: unquote("color-mix(in srgb, var(--surface-container-low) 94%, transparent)")
	backdrop-filter: blur(14px)
	box-shadow: var(--m3e-elevation-2)

	&--flip-x
		left: auto
		right: unquote("calc(100% + 0.45rem)")

	&__header
		display: flex
		align-items: center
		justify-content: space-between
		gap: var(--m3e-space-2)
		padding: 0.55rem 0.75rem
		border-bottom: 1px solid var(--outline-variant)
		font: var(--m3e-type-label-large)

	&__body
		flex: 1
		min-height: 0
		overflow-y: auto
		overscroll-behavior: contain
		scrollbar-width: none
		-ms-overflow-style: none

		&::-webkit-scrollbar
			display: none

	&__item
		display: flex
		align-items: center
		gap: var(--m3e-space-2)
		width: 100%
		padding: 0.55rem 0.75rem
		border: none
		background: transparent
		color: var(--on-surface)
		text-align: left
		cursor: pointer

		&--current
			background: unquote("color-mix(in srgb, var(--primary) 12%, transparent)")
			color: var(--primary)

	&__index
		flex: none
		width: 1.25rem
		text-align: center
		font: var(--m3e-type-label-small)

	&__meta
		min-width: 0
		flex: 1

	&__title
		display: block
		overflow: hidden
		text-overflow: ellipsis
		white-space: nowrap
		font: var(--m3e-type-body-small)

	&__artist
		display: block
		overflow: hidden
		text-overflow: ellipsis
		white-space: nowrap
		color: var(--on-surface-variant)
		font: var(--m3e-type-label-small)

@keyframes floating-music-fab-pulse
	0%
		transform: scale(1)
		opacity: 0.72
	100%
		transform: scale(1.85)
		opacity: 0

@keyframes floating-music-fab-glow
	0%, 100%
		box-shadow: unquote("0 0 0 0 color-mix(in oklab, var(--floating-music-accent) 42%, transparent), 0 0 14px color-mix(in oklab, var(--floating-music-accent) 48%, transparent)")
	50%
		box-shadow: unquote("0 0 0 6px color-mix(in oklab, var(--floating-music-accent) 24%, transparent), 0 0 26px color-mix(in oklab, var(--floating-music-accent) 70%, transparent)")

@keyframes floating-music-disc-ripple
	0%
		transform: scale(1)
		opacity: 0.65
	28%
		transform: scale(1.14)
		opacity: 0
	100%
		transform: scale(1.14)
		opacity: 0

@keyframes floating-music-panel-in
	from
		opacity: 0
		transform: translateY(8px) scale(0.96)
	to
		opacity: 1
		transform: translateY(0) scale(1)

@keyframes floating-music-disc-spin
	from
		transform: rotate(0deg)
	to
		transform: rotate(360deg)

@media (max-width: 520px)
	.floating-music-dock__inner.floating-music-dock--expanded
		width: unquote("min(18.5rem, calc(100vw - 2rem))")

	.floating-music-stack
		width: unquote("min(18.5rem, calc(100vw - 2rem))")

	.floating-music-queue
		right: 0
		left: 0
		width: 100%
		height: auto

		// 下侧两角：列表在面板上方弹出
		top: auto
		bottom: unquote("calc(100% + 0.45rem)")

		&--flip-x
			right: 0
			left: 0

		// 上侧两角：列表在面板下方弹出
		&--stack-below
			top: unquote("calc(100% + 0.45rem)")
			bottom: auto

		&__body
			max-height: unquote("min(12rem, 36vh)")

:global(html.motion-reduced) .floating-music-disc__spin--active,
:global(html.motion-reduced) .floating-music-disc--playing::before,
:global(html.motion-reduced) .floating-music-fab__button--active,
:global(html.motion-reduced) .floating-music-fab__pulse
	animation: none

@media (prefers-reduced-motion: reduce)
	.floating-music-disc__spin--active,
	.floating-music-disc--playing::before,
	.floating-music-fab__button--active,
	.floating-music-fab__pulse
		animation: none
`;
