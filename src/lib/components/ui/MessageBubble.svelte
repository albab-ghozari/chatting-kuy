<script>
	export let message;
	export let currentUserId;

	$: isOwn = message.sender.id === currentUserId;
	$: isOptimistic = typeof message.id === 'string' && message.id.startsWith('opt-');
	$: isRead = message.isRead ?? false;

	function formatTime(dateStr) {
		return new Date(dateStr).toLocaleTimeString('id-ID', {
			hour: '2-digit',
			minute: '2-digit'
		});
	}
</script>

<div class="flex items-end gap-2 {isOwn ? 'flex-row-reverse' : 'flex-row'}">
	{#if !isOwn}
		<!-- <Avatar name={message.sender.username} src={message.sender.avatar ?? null} size="sm" /> -->
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

		<!-- Timestamp + ceklis (hanya untuk pesan sendiri) -->
		<div class="flex items-center gap-1 px-1">
			<span class="text-[10px] text-gray-400">
				{formatTime(message.createdAt)}
			</span>

			{#if isOwn}
				{#if isOptimistic}
					<!-- Pesan belum terkirim ke server — jam saja -->
					<svg class="h-3 w-3 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M5 13l4 4L19 7"
						/>
					</svg>
				{:else if isRead}
					<!-- ✓✓ Biru — sudah dibaca -->
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
					<!-- ✓✓ Abu — terkirim tapi belum dibaca -->
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
