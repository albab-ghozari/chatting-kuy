<script>
	import { createEventDispatcher } from 'svelte';
	import Avatar from './Avatar.svelte';
	import GroupAvatar from './GroupAvatar.svelte';

	export let name = '';
	export let lastMessage = '';
	export let time = '';
	export let unread = 0;
	export let active = false;
	export let isTyping = false;
	export let avatar = null;
	export let online = false;
	export let isGroup = false;
	export let groupMembers = [];
	export let groupAvatar = null;

	const dispatch = createEventDispatcher();

	// Tampilkan preview yang bersih — foto jangan tampil raw base64
	$: preview = (() => {
		if (!lastMessage) return '';
		if (lastMessage.startsWith('[image]')) return '📷 Foto';
		return lastMessage;
	})();
</script>

<button
	on:click={() => dispatch('click')}
	class="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left transition-colors
		{active ? 'bg-[#0d0f1e]' : 'hover:bg-gray-50'}"
>
	<!-- Avatar -->
	{#if isGroup}
		<GroupAvatar members={groupMembers} {groupAvatar} size="md" />
	{:else}
		<Avatar name={name} src={avatar} size="md" {online} />
	{/if}

	<!-- Info -->
	<div class="flex min-w-0 flex-1 flex-col">
		<div class="flex items-center justify-between gap-1">
			<span class="truncate text-sm font-semibold {active ? 'text-white' : 'text-[#0d0f1e]'}">{name}</span>
			{#if time}
				<span class="shrink-0 text-[10px] text-gray-400">{time}</span>
			{/if}
		</div>
		<div class="flex items-center justify-between gap-1">
			<span class="truncate text-xs {active ? 'text-gray-400' : 'text-gray-500'}">
				{#if isTyping}
					<span class="italic text-emerald-500">mengetik...</span>
				{:else}
					{preview}
				{/if}
			</span>
			{#if unread > 0}
				<span class="shrink-0 flex h-4 min-w-4 items-center justify-center rounded-full bg-emerald-500 px-1 text-[10px] font-bold text-white">
					{unread > 99 ? '99+' : unread}
				</span>
			{/if}
		</div>
	</div>
</button>
