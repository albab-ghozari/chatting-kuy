<script>
	export let message;
	export let currentUserId;
	export let animate = false;

	$: isOwn = message.sender.id === currentUserId;
	$: isOptimistic = typeof message.id === 'string' && message.id.startsWith('opt-');
	$: isRead = message.isRead ?? false;

	// Freeze saat komponen dibuat — evaluate sekali, tidak reactive
	// Pakai IIFE agar tidak bergantung pada reactive system
	const animateClass = (() => {
		if (!animate) return '';
		const own = message.sender.id === currentUserId;
		return own ? 'msg-enter-right' : 'msg-enter-left';
	})();

	function formatTime(dateStr) {
		return new Date(dateStr).toLocaleTimeString('id-ID', {
			hour: '2-digit',
			minute: '2-digit'
		});
	}
</script>

<div class="flex items-end gap-2 {isOwn ? 'flex-row-reverse' : 'flex-row'} {animateClass}">
	{#if !isOwn}
		<!-- avatar -->
	{/if}

	<div class="flex max-w-[75%] min-w-0 flex-col gap-1 {isOwn ? 'items-end' : 'items-start'}">
		{#if !isOwn}
			<span class="px-1 text-xs font-medium text-gray-400">
				{message.sender.username}
			</span>
		{/if}

		<div
			class="
      wrap-words w-full overflow-hidden rounded-2xl px-4
      py-2.5 text-sm leading-relaxed break-all whitespace-pre-wrap
      {isOwn ? 'rounded-br-sm bg-[#0d0f1e] text-white' : 'rounded-bl-sm bg-gray-100 text-[#0d0f1e]'}
    "
		>
			{message.content}
		</div>

		<div class="flex items-center gap-1 px-1">
			<span class="text-[10px] text-gray-400">
				{formatTime(message.createdAt)}
			</span>

			{#if isOwn}
				{#if isOptimistic}
					<svg class="h-3 w-3 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M5 13l4 4L19 7"
						/>
					</svg>
				{:else if isRead}
					<span class="flex -space-x-1">
						<svg
							class="h-3 w-3 text-blue-500"
							fill="none"
							stroke="currentColor"
							viewBox="0 0 24 24"
						>
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2.5"
								d="M5 13l4 4L19 7"
							/>
						</svg>
						<svg
							class="h-3 w-3 text-blue-500"
							fill="none"
							stroke="currentColor"
							viewBox="0 0 24 24"
						>
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2.5"
								d="M5 13l4 4L19 7"
							/>
						</svg>
					</span>
				{:else}
					<span class="flex -space-x-1">
						<svg
							class="h-3 w-3 text-gray-400"
							fill="none"
							stroke="currentColor"
							viewBox="0 0 24 24"
						>
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2.5"
								d="M5 13l4 4L19 7"
							/>
						</svg>
						<svg
							class="h-3 w-3 text-gray-400"
							fill="none"
							stroke="currentColor"
							viewBox="0 0 24 24"
						>
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2.5"
								d="M5 13l4 4L19 7"
							/>
						</svg>
					</span>
				{/if}
			{/if}
		</div>
	</div>
</div>

<style>
	.msg-enter-right {
		animation: msgRight 0.25s cubic-bezier(0.25, 0.46, 0.45, 0.94) both;
	}

	.msg-enter-left {
		animation: msgLeft 0.25s cubic-bezier(0.25, 0.46, 0.45, 0.94) both;
	}

	@keyframes msgRight {
		from {
			opacity: 0;
			transform: translateX(12px) translateY(6px);
		}
		to {
			opacity: 1;
			transform: translateX(0) translateY(0);
		}
	}

	@keyframes msgLeft {
		from {
			opacity: 0;
			transform: translateX(-12px) translateY(6px);
		}
		to {
			opacity: 1;
			transform: translateX(0) translateY(0);
		}
	}
</style>
