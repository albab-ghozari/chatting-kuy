<script>
	export let message;
	export let currentUserId = null;
	export let animate = false;
	export let isGroup = false;

	$: isOwn = currentUserId != null && message.sender?.id === currentUserId;
	$: isOptimistic = typeof message.id === 'string' && message.id.startsWith('opt-');
	$: isRead = message.isRead ?? false;
	$: isImage = typeof message.content === 'string' && message.content.startsWith('[image]');
	$: imageSrc = isImage ? message.content.slice('[image]'.length) : null;

	$: animateClass = (() => {
		if (!animate) return '';
		return isOwn ? 'msg-enter-right' : 'msg-enter-left';
	})();

	function formatTime(dateStr) {
		return new Date(dateStr).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
	}

	let lightboxOpen = false;
</script>

<div class="flex items-end gap-2 {isOwn ? 'flex-row-reverse' : 'flex-row'} {animateClass}">
	<div class="flex min-w-0 flex-col gap-1 {isOwn ? 'items-end' : 'items-start'} {isImage ? 'max-w-[70%]' : 'max-w-[75%]'}">
		<!-- Nama pengirim di grup -->
		{#if isGroup && !isOwn}
			<span class="px-1 text-[10px] font-semibold text-gray-500">
				{message.sender?.username ?? ''}
			</span>
		{/if}

		{#if isImage}
			<!-- Bubble foto -->
			<button
				type="button"
				on:click={() => (lightboxOpen = true)}
				class="overflow-hidden rounded-2xl {isOwn ? 'rounded-br-sm' : 'rounded-bl-sm'} transition-opacity hover:opacity-90"
			>
				<img
					src={imageSrc}
					alt="foto"
					class="block max-h-64 w-full object-cover"
					loading="lazy"
				/>
			</button>
		{:else}
			<!-- Bubble teks -->
			<div class="wrap-words w-full overflow-hidden rounded-2xl px-4 py-2.5 text-sm leading-relaxed break-all whitespace-pre-wrap
				{isOwn ? 'rounded-br-sm bg-[#0d0f1e] text-white' : 'rounded-bl-sm bg-gray-100 text-[#0d0f1e]'}">
				{message.content}
			</div>
		{/if}

		<!-- Timestamp + status -->
		<div class="flex items-center gap-1 px-1">
			<span class="text-[10px] text-gray-400">{formatTime(message.createdAt)}</span>
			{#if isOwn}
				{#if isOptimistic}
					<svg class="h-3 w-3 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
					</svg>
				{:else if isRead}
					<span class="flex -space-x-1">
						<svg class="h-3 w-3 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7" /></svg>
						<svg class="h-3 w-3 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7" /></svg>
					</span>
				{:else}
					<span class="flex -space-x-1">
						<svg class="h-3 w-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7" /></svg>
						<svg class="h-3 w-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7" /></svg>
					</span>
				{/if}
			{/if}
		</div>
	</div>
</div>

<!-- Lightbox: klik foto untuk lihat full -->
{#if lightboxOpen}
	<div
		role="dialog"
		aria-modal="true"
		class="fixed inset-0 z-50 flex items-center justify-center bg-black/80"
		on:click={() => (lightboxOpen = false)}
		on:keydown={(e) => e.key === 'Escape' && (lightboxOpen = false)}
	>
		<img
			src={imageSrc}
			alt="foto"
			class="max-h-[90vh] max-w-[90vw] rounded-xl object-contain shadow-2xl"
			on:click|stopPropagation
		/>
		<button
			class="absolute top-4 right-4 flex h-9 w-9 items-center justify-center rounded-full bg-white/20 text-white backdrop-blur hover:bg-white/30"
			on:click={() => (lightboxOpen = false)}
		>
			<svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
			</svg>
		</button>
	</div>
{/if}

<style>
	.msg-enter-right {
		animation: msgRight 0.25s cubic-bezier(0.25, 0.46, 0.45, 0.94) both;
	}
	.msg-enter-left {
		animation: msgLeft 0.25s cubic-bezier(0.25, 0.46, 0.45, 0.94) both;
	}
	@keyframes msgRight {
		from { opacity: 0; transform: translateX(12px) translateY(6px); }
		to { opacity: 1; transform: translateX(0) translateY(0); }
	}
	@keyframes msgLeft {
		from { opacity: 0; transform: translateX(-12px) translateY(6px); }
		to { opacity: 1; transform: translateX(0) translateY(0); }
	}
</style>
