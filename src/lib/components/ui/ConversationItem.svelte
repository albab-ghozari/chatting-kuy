<script>
	import Avatar from './Avatar.svelte';

	export let name = '';
	export let lastMessage = '';
	export let time = '';
	export let unread = 0;
	export let active = false;
	export let online = false;
	export let isTyping = false;
	export let avatar = null; // foto profil lawan bicara
</script>

<button
	type="button"
	on:click
	class="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left transition-all duration-150
         {active ? 'bg-[#0d0f1e] text-white' : 'text-[#0d0f1e] hover:bg-gray-100'}"
>
	<Avatar {name} {online} src={avatar} size="md" />

	<div class="min-w-0 flex-1">
		<!-- Baris 1: nama + waktu -->
		<div class="flex items-center justify-between gap-2">
			<span class="truncate text-sm font-semibold {active ? 'text-white' : 'text-[#0d0f1e]'}">
				{name}
			</span>
			{#if time}
				<span class="shrink-0 text-[10px] {active ? 'text-gray-300' : 'text-gray-400'}">{time}</span
				>
			{/if}
		</div>

		<!-- Baris 2: preview pesan / typing + badge unread -->
		<div class="mt-0.5 flex items-center justify-between gap-2">
			{#if isTyping}
				<!-- Indikator mengetik dengan animasi titik -->
				<span class="flex items-center gap-1 text-xs font-medium text-emerald-500">
					sedang mengetik
					<span class="flex items-center gap-0.5">
						<span
							class="h-1 w-1 animate-bounce rounded-full bg-emerald-500"
							style="animation-delay:0ms"
						></span>
						<span
							class="h-1 w-1 animate-bounce rounded-full bg-emerald-500"
							style="animation-delay:150ms"
						></span>
						<span
							class="h-1 w-1 animate-bounce rounded-full bg-emerald-500"
							style="animation-delay:300ms"
						></span>
					</span>
				</span>
			{:else}
				<p
					class="truncate text-xs {active
						? 'text-gray-300'
						: unread > 0
							? 'font-semibold text-[#0d0f1e]'
							: 'text-gray-500'}"
				>
					{lastMessage || 'Belum ada pesan'}
				</p>
			{/if}

			<!-- Badge unread -->
			{#if unread > 0 && !active}
				<span
					class="flex h-[18px] min-w-[18px] shrink-0 items-center justify-center
                     rounded-full bg-[#0d0f1e] px-1 text-[10px] font-bold text-white"
				>
					{unread > 99 ? '99+' : unread}
				</span>
			{/if}
		</div>
	</div>
</button>

<style>
	@keyframes bounce {
		0%,
		60%,
		100% {
			transform: translateY(0);
		}
		30% {
			transform: translateY(-3px);
		}
	}
	.animate-bounce {
		animation: bounce 1s infinite;
	}
</style>
