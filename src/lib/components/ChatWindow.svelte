<script>
	import { onMount, onDestroy, tick, createEventDispatcher } from 'svelte';
	import {
		onSocketEvent,
		offSocketEvent,
		sendSocketMessage,
		emitMarkRead
	} from '$lib/socket.js';
	import { messageApi } from '$lib/api.js';
	import MessageBubble from '$lib/components/ui/MessageBubble.svelte';
	import MessageInput from '$lib/components/ui/MessageInput.svelte';
	import Avatar from '$lib/components/ui/Avatar.svelte';

	export let conversation = null;
	export let currentUserId = null;
	export let isOnline = false;

	const dispatch = createEventDispatcher();

	let messages = [];
	let loadingMessages = false;
	let messagesContainer;
	let inputValue = '';
	let isTyping = false;
	let typingTimer;
	let sending = false;

	// Dipanggil dari parent (+page.svelte) lewat bind:this
	// loadingMessages di-set false di sini — bukan di handleConversationChange
	// supaya skeleton tetap tampil sampai data benar-benar tiba
	export function setMessages(msgs, shouldMarkRead = true) {
		messages = msgs ?? [];
		loadingMessages = false;
		if (shouldMarkRead && conversation?.id && currentUserId) {
			emitMarkRead(conversation.id, currentUserId);
		}
		scrollToBottom();
	}

	$: if (conversation?.id) {
		handleConversationChange();
	}

	async function handleConversationChange() {
		messages = [];
		isTyping = false;
		loadingMessages = true; // tetap true sampai setMessages dipanggil
		await tick();
		dispatch('requestmessages', { conversationId: conversation.id });
		// TIDAK reset loadingMessages di sini — biarkan setMessages yang melakukannya
	}

	function handleReceiveMessage(msg) {
		if (Number(msg.conversationId) !== Number(conversation?.id)) return;

		// Hindari duplikat
		if (messages.find((m) => m.id === msg.id)) return;

		// Ganti optimistic message jika ada
		const optIdx = messages.findIndex(
			(m) => typeof m.id === 'string' && m.id.startsWith('opt-') && m.content === msg.content
		);
		if (optIdx !== -1) {
			messages = messages.map((m, i) => (i === optIdx ? msg : m));
		} else {
			messages = [...messages, msg];
		}

		dispatch('newmessage', msg);

		// Tandai terbaca jika pesan dari lawan
		if (Number(msg.sender?.id) !== Number(currentUserId)) {
			emitMarkRead(conversation.id, currentUserId);
		}

		scrollToBottom();
	}

	function handleTypingEvent({ userId, room }) {
		if (Number(userId) === Number(currentUserId)) return;
		if (Number(room) !== Number(conversation?.id)) return;
		isTyping = true;
		clearTimeout(typingTimer);
		typingTimer = setTimeout(() => (isTyping = false), 3000);
	}

	function handleStopTypingEvent({ userId, room }) {
		if (Number(userId) === Number(currentUserId)) return;
		if (Number(room) !== Number(conversation?.id)) return;
		isTyping = false;
	}

	function handleMarkRead({ conversationId }) {
		if (Number(conversationId) !== Number(conversation?.id)) return;
		dispatch('messagesread', { conversationId });
	}

	onMount(async () => {
		await onSocketEvent('receive_message', handleReceiveMessage);
		await onSocketEvent('typing', handleTypingEvent);
		await onSocketEvent('stop_typing', handleStopTypingEvent);
		await onSocketEvent('messages_read', handleMarkRead);
	});

	onDestroy(async () => {
		await offSocketEvent('receive_message', handleReceiveMessage);
		await offSocketEvent('typing', handleTypingEvent);
		await offSocketEvent('stop_typing', handleStopTypingEvent);
		await offSocketEvent('messages_read', handleMarkRead);
		clearTimeout(typingTimer);
	});

	async function handleSend(e) {
		const { content } = e.detail;
		if (!content?.trim() || !conversation?.id || sending) return;

		sending = true;

		// Optimistic UI
		const optimisticId = `opt-${Date.now()}`;
		const optimisticMsg = {
			id: optimisticId,
			content,
			conversationId: conversation.id,
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
				conversationId: conversation.id
			});
			await messageApi.send(conversation.id, content);
		} catch (err) {
			console.error('send error:', err);
			messages = messages.filter((m) => m.id !== optimisticId);
		} finally {
			sending = false;
		}
	}

	async function scrollToBottom() {
		await tick();
		if (messagesContainer) {
			messagesContainer.scrollTop = messagesContainer.scrollHeight;
		}
	}

	function formatDateHeader(dateStr) {
		const d = new Date(dateStr);
		const now = new Date();
		const diffDays = Math.floor((now - d) / 86400000);
		if (diffDays === 0) return 'Hari ini';
		if (diffDays === 1) return 'Kemarin';
		if (diffDays < 7) return d.toLocaleDateString('id-ID', { weekday: 'long' });
		return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
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
</script>

<!-- Chat Header (Desktop) -->
<div class="hidden shrink-0 items-center gap-3 border-b border-gray-100 bg-white px-5 py-3 md:flex">
	{#if conversation}
		<div class="relative">
			<Avatar name={conversation.name} src={conversation.otherAvatar ?? null} size="sm" />
			{#if isOnline}
				<span
					class="absolute right-0 bottom-0 h-2.5 w-2.5 rounded-full border-2 border-white bg-emerald-400"
				></span>
			{/if}
		</div>
		<div class="flex-1 min-w-0">
			<p class="truncate text-sm font-semibold text-[#0d0f1e]">{conversation.name}</p>
			<p class="text-xs {isOnline ? 'font-medium text-emerald-500' : 'text-gray-400'}">
				{isOnline ? '● Online' : '○ Offline'}
			</p>
		</div>
	{/if}
</div>

<!-- Messages Area -->
<div
	bind:this={messagesContainer}
	class="flex flex-1 flex-col gap-2 overflow-y-auto px-4 py-4"
>
	{#if loadingMessages}
		<!-- Skeleton: tampil selama data belum datang -->
		{#each { length: 6 } as _, i (i)}
			<div class="flex items-end gap-2 {i % 2 === 0 ? 'flex-row-reverse' : ''}">
				<div
					class="animate-pulse rounded-2xl bg-gray-200
					{i % 2 === 0 ? 'rounded-br-sm' : 'rounded-bl-sm'}
					{i % 3 === 0 ? 'h-10 w-[60%]' : i % 3 === 1 ? 'h-8 w-[40%]' : 'h-12 w-[50%]'}"
				></div>
			</div>
		{/each}
	{:else if messages.length === 0}
		<!-- Empty state: hanya tampil kalau sudah selesai loading dan memang kosong -->
		<div class="flex flex-1 flex-col items-center justify-center gap-2 text-center">
			<div class="flex h-12 w-12 items-center justify-center rounded-2xl bg-gray-100">
				<svg class="h-6 w-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						stroke-width="1.5"
						d="M8 10h.01M12 10h.01M16 10h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
					/>
				</svg>
			</div>
			<p class="text-sm text-gray-400">Belum ada pesan</p>
			<p class="text-xs text-gray-300">Kirim pesan pertama ke {conversation?.name ?? 'teman'}!</p>
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
				<MessageBubble
					message={item.msg}
					{currentUserId}
					animate={true}
				/>
			{/if}
		{/each}

		{#if isTyping}
			<div class="flex items-end gap-2">
				<div class="flex items-center gap-1 rounded-2xl rounded-bl-sm bg-gray-100 px-4 py-3">
					<span class="h-2 w-2 animate-bounce rounded-full bg-gray-400" style="animation-delay:0ms"></span>
					<span class="h-2 w-2 animate-bounce rounded-full bg-gray-400" style="animation-delay:150ms"></span>
					<span class="h-2 w-2 animate-bounce rounded-full bg-gray-400" style="animation-delay:300ms"></span>
				</div>
			</div>
		{/if}
	{/if}
</div>

<!-- Input Area -->
<div class="shrink-0 px-4 pb-4 pt-2">
	<MessageInput
		bind:value={inputValue}
		disabled={sending}
		conversationId={conversation?.id}
		{currentUserId}
		on:send={handleSend}
	/>
</div>
