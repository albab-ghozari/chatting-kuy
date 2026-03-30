<script>
	import { onMount, onDestroy, tick, createEventDispatcher } from 'svelte';
	import { onSocketEvent, offSocketEvent, sendSocketMessage, emitMarkRead } from '$lib/socket.js';
	import { messageApi } from '$lib/api.js';
	import MessageBubble from '$lib/components/ui/MessageBubble.svelte';
	import MessageInput from '$lib/components/ui/MessageInput.svelte';
	import Avatar from '$lib/components/ui/Avatar.svelte';
	import GroupAvatar from '$lib/components/ui/GroupAvatar.svelte';
	import GroupInfoPanel from '$lib/components/GroupInfoPanel.svelte';

	export let conversation = null;
	export let currentUserId = null;
	export let isOnline = false;
	export let lastSeen = null;

	const dispatch = createEventDispatcher();

	let messages = [];
	let loadingMessages = false;
	let messagesContainer;
	let inputValue = '';
	let isTyping = false;
	let typingTimer;
	let sending = false;
	let showGroupInfo = false;

	// Bug #2 fix: O(1) optimistic matching via hash Map
	let optimisticMap = new Map();

	function makeContentHash(content) {
		const len = content.length;
		const head = content.slice(0, 8);
		const tail = content.slice(-8);
		return `${head}${tail}${len}`;
	}

	export function setMessages(msgs, shouldMarkRead = true) {
		messages = msgs ?? [];
		loadingMessages = false;
		optimisticMap.clear();
		if (shouldMarkRead && localConversation?.id && currentUserId) {
			emitMarkRead(localConversation.id, currentUserId);
		}
		scrollToBottom();
	}

	let localConversation = null;

	/**
	 * Bug #5 fix: handleConversationChange hanya dipanggil kalau conversation.id BENAR-BENAR berubah.
	 *
	 * Masalah sebelumnya:
	 *   $: if (conversation?.id) handleConversationChange()
	 *   Reactive ini re-run setiap kali referensi `conversation` berubah —
	 *   termasuk saat handleGroupUpdated spread objek baru ({ ...activeConversation, ...updated })
	 *   meskipun id-nya sama persis. Akibatnya pesan di-reset dan di-request ulang
	 *   setiap kali nama/foto grup diubah.
	 *
	 * Solusi:
	 *   Simpan lastConversationId secara terpisah.
	 *   Bandingkan id sebelum memanggil handleConversationChange().
	 *   localConversation tetap diupdate dari prop conversation untuk data terbaru
	 *   (nama, foto, members), tapi tidak memicu reset pesan.
	 */
	let lastConversationId = null;

	$: {
		// Update localConversation SELALU agar header & panel info grup selalu sinkron
		localConversation = conversation;

		// Tapi hanya trigger handleConversationChange kalau ID-nya berbeda
		const newId = conversation?.id ?? null;
		if (newId && newId !== lastConversationId) {
			lastConversationId = newId;
			handleConversationChange(newId);
		}
	}

	async function handleConversationChange(conversationId) {
		messages = [];
		optimisticMap.clear();
		isTyping = false;
		loadingMessages = true;
		showGroupInfo = false;
		await tick();
		dispatch('requestmessages', { conversationId });
	}

	function handleReceiveMessage(msg) {
		if (Number(msg.conversationId) !== Number(localConversation?.id)) return;
		if (messages.find((m) => m.id === msg.id)) return;

		const hash = makeContentHash(msg.content);
		const optimisticId = optimisticMap.get(hash);

		if (optimisticId) {
			optimisticMap.delete(hash);
			messages = messages.map((m) => m.id === optimisticId ? msg : m);
		} else {
			messages = [...messages, msg];
		}

		dispatch('newmessage', msg);
		if (Number(msg.sender?.id) !== Number(currentUserId)) {
			emitMarkRead(localConversation.id, currentUserId);
		}
		scrollToBottom();
	}

	function handleTypingEvent({ userId, room }) {
		if (Number(userId) === Number(currentUserId)) return;
		if (Number(room) !== Number(localConversation?.id)) return;
		isTyping = true;
		clearTimeout(typingTimer);
		typingTimer = setTimeout(() => (isTyping = false), 3000);
		scrollToBottom();
	}

	function handleStopTypingEvent({ userId, room }) {
		if (Number(userId) === Number(currentUserId)) return;
		if (Number(room) !== Number(localConversation?.id)) return;
		isTyping = false;
	}

	function handleMarkRead({ conversationId }) {
		if (Number(conversationId) !== Number(localConversation?.id)) return;
		dispatch('messagesread', { conversationId });
	}

	function handleGroupUpdatedSocket(data) {
		if (Number(data.id) !== Number(localConversation?.id)) return;
		// Update localConversation langsung — tidak lewat prop agar tidak trigger reactive
		localConversation = { ...localConversation, ...data };
		dispatch('groupUpdated', localConversation);
	}

	onMount(async () => {
		await onSocketEvent('receive_message', handleReceiveMessage);
		await onSocketEvent('typing', handleTypingEvent);
		await onSocketEvent('stop_typing', handleStopTypingEvent);
		await onSocketEvent('messages_read', handleMarkRead);
		await onSocketEvent('group_updated', handleGroupUpdatedSocket);
	});

	onDestroy(async () => {
		await offSocketEvent('receive_message', handleReceiveMessage);
		await offSocketEvent('typing', handleTypingEvent);
		await offSocketEvent('stop_typing', handleStopTypingEvent);
		await offSocketEvent('messages_read', handleMarkRead);
		await offSocketEvent('group_updated', handleGroupUpdatedSocket);
		clearTimeout(typingTimer);
		optimisticMap.clear();
		lastConversationId = null;
	});

	async function handleSend(e) {
		const { content } = e.detail;
		if (!content || !localConversation?.id || sending) return;
		const isImage = content.startsWith('[image]');
		if (!isImage && !content.trim()) return;

		sending = true;
		const optimisticId = `opt-${Date.now()}`;
		const hash = makeContentHash(content);
		optimisticMap.set(hash, optimisticId);

		const optimisticMsg = {
			id: optimisticId,
			content,
			conversationId: localConversation.id,
			createdAt: new Date().toISOString(),
			isRead: false,
			sender: { id: currentUserId, username: 'me' }
		};
		messages = [...messages, optimisticMsg];
		dispatch('send', { content });
		scrollToBottom();

		try {
			await sendSocketMessage({
				content,
				senderId: currentUserId,
				conversationId: localConversation.id
			});
		} catch (err) {
			console.error('send error:', err);
			try {
				await messageApi.send(localConversation.id, content);
			} catch {
				optimisticMap.delete(hash);
				messages = messages.filter((m) => m.id !== optimisticId);
			}
		} finally {
			sending = false;
		}
	}

	async function scrollToBottom() {
		await tick();
		if (messagesContainer) messagesContainer.scrollTop = messagesContainer.scrollHeight;
	}

	function formatDateHeader(dateStr) {
		const d = new Date(dateStr), now = new Date();
		const diffDays = Math.floor((now - d) / 86400000);
		if (diffDays === 0) return 'Hari ini';
		if (diffDays === 1) return 'Kemarin';
		if (diffDays < 7) return d.toLocaleDateString('id-ID', { weekday: 'long' });
		return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
	}

	function formatLastSeen(isoStr) {
		if (!isoStr) return '';
		const d = new Date(isoStr), now = new Date();
		const diffMin = Math.floor((now - d) / 60000);
		const diffHour = Math.floor((now - d) / 3600000);
		const diffDay = Math.floor((now - d) / 86400000);
		if (diffMin < 1) return 'terakhir online baru saja';
		if (diffMin < 60) return `terakhir online ${diffMin} menit lalu`;
		if (diffHour < 24) return `terakhir online ${diffHour} jam lalu`;
		if (diffDay === 1) return 'terakhir online kemarin';
		return `terakhir online ${d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}`;
	}

	$: groupedMessages = (() => {
		const groups = [];
		let lastDate = null;
		for (const msg of messages) {
			const dateKey = new Date(msg.createdAt).toDateString();
			if (dateKey !== lastDate) {
				groups.push({ type: 'date', label: formatDateHeader(msg.createdAt), key: dateKey });
				lastDate = dateKey;
			}
			groups.push({ type: 'message', msg });
		}
		return groups;
	})();

	function handleGroupUpdatedFromPanel(e) {
		localConversation = { ...localConversation, ...e.detail };
		dispatch('groupUpdated', localConversation);
	}

	function handleMemberRemoved(e) {
		const { userId } = e.detail;
		localConversation = {
			...localConversation,
			members: (localConversation.members ?? []).filter((m) => m.id !== userId)
		};
		dispatch('groupUpdated', localConversation);
	}
</script>

<div class="flex flex-1 overflow-hidden">
	<div class="flex flex-1 flex-col overflow-hidden">

		<!-- Header desktop -->
		<div class="hidden shrink-0 items-center gap-3 border-b border-gray-100 bg-white px-5 py-3 md:flex">
			{#if localConversation}
				{#if localConversation.isGroup}
					<button on:click={() => (showGroupInfo = !showGroupInfo)} class="shrink-0 transition-opacity hover:opacity-80">
						{#if localConversation.groupAvatar}
							<img src={localConversation.groupAvatar} alt="grup" class="h-8 w-8 rounded-full object-cover" />
						{:else}
							<GroupAvatar members={localConversation.members ?? []} size="sm" />
						{/if}
					</button>
				{:else}
					<Avatar name={localConversation.name} src={localConversation.otherAvatar ?? null} size="sm" online={isOnline} />
				{/if}
				<div class="min-w-0 flex-1">
					{#if localConversation.isGroup}
						<button on:click={() => (showGroupInfo = !showGroupInfo)} class="truncate text-left text-sm font-semibold text-[#0d0f1e] hover:underline">{localConversation.name}</button>
						<p class="text-xs text-gray-400">{(localConversation.members ?? []).length} anggota · klik untuk info</p>
					{:else}
						<p class="truncate text-sm font-semibold text-[#0d0f1e]">{localConversation.name}</p>
						{#if isOnline}<p class="text-xs font-medium text-emerald-500">Online</p>
						{:else if lastSeen}<p class="text-xs text-gray-400">{formatLastSeen(lastSeen)}</p>{/if}
					{/if}
				</div>
				{#if localConversation.isGroup}
					<button aria-label="Info Grup" on:click={() => (showGroupInfo = !showGroupInfo)} class="flex h-8 w-8 items-center justify-center rounded-xl text-gray-400 hover:bg-gray-100 {showGroupInfo ? 'bg-gray-100 text-[#0d0f1e]' : ''}">
						<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
					</button>
				{/if}
			{/if}
		</div>

		<!-- Messages -->
		<div bind:this={messagesContainer} class="flex flex-1 flex-col gap-2 overflow-y-auto px-4 py-4 pb-2">
			{#if loadingMessages}
				{#each { length: 6 } as _, i (i)}
					<div class="flex items-end gap-2 {i % 2 === 0 ? 'flex-row-reverse' : ''}">
						<div class="animate-pulse rounded-2xl bg-gray-200 {i % 2 === 0 ? 'rounded-br-sm' : 'rounded-bl-sm'} {i % 3 === 0 ? 'h-10 w-[60%]' : i % 3 === 1 ? 'h-8 w-[40%]' : 'h-12 w-[50%]'}"></div>
					</div>
				{/each}
			{:else if messages.length === 0 && !isTyping}
				<div class="flex flex-1 flex-col items-center justify-center gap-2 text-center">
					<div class="flex h-12 w-12 items-center justify-center rounded-2xl bg-gray-100">
						<svg class="h-6 w-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M8 10h.01M12 10h.01M16 10h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
					</div>
					<p class="text-sm text-gray-400">Belum ada pesan</p>
					<p class="text-xs text-gray-300">Kirim pesan pertama ke {localConversation?.name ?? 'teman'}!</p>
				</div>
			{:else}
				{#each groupedMessages as item (item.type === 'date' ? item.key : item.msg.id)}
					{#if item.type === 'date'}
						<div class="flex items-center gap-3 py-1">
							<div class="h-px flex-1 bg-gray-100"></div>
							<span class="text-[10px] font-medium text-gray-400">{item.label}</span>
							<div class="h-px flex-1 bg-gray-100"></div>
						</div>
					{:else}
						<MessageBubble message={item.msg} {currentUserId} animate={true} isGroup={localConversation.isGroup ?? false} />
					{/if}
				{/each}
			{/if}
			{#if isTyping}
				<div class="flex shrink-0 items-end gap-2 pt-1">
					<div class="flex items-center gap-1 rounded-2xl rounded-bl-sm bg-gray-100 px-4 py-3">
						<span class="h-2 w-2 animate-bounce rounded-full bg-gray-400" style="animation-delay:0ms"></span>
						<span class="h-2 w-2 animate-bounce rounded-full bg-gray-400" style="animation-delay:150ms"></span>
						<span class="h-2 w-2 animate-bounce rounded-full bg-gray-400" style="animation-delay:300ms"></span>
					</div>
				</div>
			{/if}
		</div>

		<!-- Input -->
		<div class="shrink-0 px-4 pt-2 pb-4">
			<MessageInput
				bind:value={inputValue}
				disabled={sending}
				conversationId={localConversation?.id}
				{currentUserId}
				on:send={handleSend}
			/>
		</div>
	</div>

	<!-- Panel info grup desktop -->
	{#if showGroupInfo && localConversation?.isGroup}
		<div class="hidden w-72 shrink-0 border-l border-gray-100 md:block">
			<GroupInfoPanel
				conversation={localConversation}
				{currentUserId}
				on:close={() => (showGroupInfo = false)}
				on:updated={handleGroupUpdatedFromPanel}
				on:memberRemoved={handleMemberRemoved}
				on:left={() => dispatch('left')}
			/>
		</div>
	{/if}
</div>
