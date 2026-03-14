<script>
	import { onMount, onDestroy, afterUpdate } from 'svelte';
	import {
		joinRoom,
		onSocketEvent,
		offSocketEvent,
		emitMarkRead,
		sendSocketMessage
	} from '$lib/socket.js';
	import MessageBubble from '$lib/components/ui/MessageBubble.svelte';
	import MessageInput from '$lib/components/ui/MessageInput.svelte';
	import Avatar from '$lib/components/ui/Avatar.svelte';
	import { createEventDispatcher } from 'svelte';

	export let conversation = null; // conversation sekarang include otherAvatar
	export let currentUserId = null;
	export let isOnline = false; // status online lawan bicara
	let loading = false;

	// messages dikelola sepenuhnya di sini — tidak dari prop
	let messages = [];
	const dispatch = createEventDispatcher();

	let inputValue = '';
	let scrollEl;
	let typingUsers = new Set();
	let typingTimers = {};
	let lastConvId = null;

	$: isTyping = typingUsers.size > 0;

	// Saat conversation berganti → load ulang messages dari prop tidak ada,
	// tapi kita emit event ke parent untuk minta messages
	$: if (conversation?.id !== lastConvId) {
		lastConvId = conversation?.id ?? null;
		messages = [];
		if (conversation?.id) {
			loading = true;
			joinRoom(conversation.id);
			dispatch('requestmessages', { conversationId: conversation.id });
		}
	}

	// Parent kirim messages awal lewat prop ini
	export function setMessages(msgs) {
		// Semua pesan dari orang lain langsung isRead: true
		// karena user sedang membuka conversation ini
		messages = msgs.map((m) =>
			Number(m.sender?.id) !== Number(currentUserId) ? { ...m, isRead: true } : m
		);
		loading = false;
		if (conversation?.id && currentUserId) {
			emitMarkRead(conversation.id, currentUserId);
		}
	}

	onMount(async () => {
		// Fix iOS keyboard — cegah window scroll, scroll hanya di scrollEl
		const preventWindowScroll = () => {
			if (window.scrollY !== 0) window.scrollTo(0, 0);
		};
		window.addEventListener('scroll', preventWindowScroll, { passive: true });

		// Saat textarea fokus (keyboard muncul) — scroll pesan ke bawah
		const inputEl = document.querySelector('textarea');
		const handleFocus = () => {
			setTimeout(() => {
				if (scrollEl) scrollEl.scrollTop = scrollEl.scrollHeight;
			}, 300); // tunggu keyboard muncul
		};
		inputEl?.addEventListener('focus', handleFocus);

		// Cleanup
		const origDestroy = () => {
			window.removeEventListener('scroll', preventWindowScroll);
			inputEl?.removeEventListener('focus', handleFocus);
		};

		await onSocketEvent('receive_message', handleReceive);
		await onSocketEvent('typing', handleTyping);
		await onSocketEvent('stop_typing', handleStopTyping);
		await onSocketEvent('messages_read', handleMessagesRead);
	});

	onDestroy(async () => {
		await offSocketEvent('receive_message', handleReceive);
		await offSocketEvent('typing', handleTyping);
		await offSocketEvent('stop_typing', handleStopTyping);
		await offSocketEvent('messages_read', handleMessagesRead);
	});

	afterUpdate(() => {
		if (scrollEl) scrollEl.scrollTop = scrollEl.scrollHeight;
	});

	function handleReceive(msg) {
		if (Number(msg.conversationId) !== Number(conversation?.id)) return;

		const isFromOther = Number(msg.sender?.id) !== Number(currentUserId);

		// Kalau pesan dari orang lain dan conversation sedang aktif/terbuka
		// → langsung tandai isRead: true dan emit mark_read ke server
		if (isFromOther) {
			msg = { ...msg, isRead: true };
			emitMarkRead(conversation.id, currentUserId);
		}

		const optIdx = messages.findIndex(
			(m) =>
				typeof m.id === 'string' &&
				m.id.startsWith('opt-') &&
				m.content === msg.content &&
				Number(m.sender?.id) === Number(msg.sender?.id)
		);
		if (optIdx !== -1) {
			messages = messages.map((m, i) => (i === optIdx ? msg : m));
		} else if (!messages.find((m) => m.id === msg.id)) {
			messages = [...messages, msg];
		}
		dispatch('newmessage', msg);
	}

	function handleMessagesRead({ conversationId }) {
		if (Number(conversationId) !== Number(conversation?.id)) return;
		messages = messages.map((m) =>
			Number(m.sender?.id) === Number(currentUserId) ? { ...m, isRead: true } : m
		);
	}

	function handleTyping({ userId, room }) {
		if (Number(userId) === Number(currentUserId)) return;
		if (Number(room) !== Number(conversation?.id)) return;
		typingUsers = new Set([...typingUsers, userId]);
		clearTimeout(typingTimers[userId]);
		typingTimers[userId] = setTimeout(() => {
			typingUsers.delete(userId);
			typingUsers = new Set(typingUsers);
		}, 2500);
	}

	function handleStopTyping({ userId, room }) {
		if (Number(room) !== Number(conversation?.id)) return;
		typingUsers.delete(userId);
		typingUsers = new Set(typingUsers);
	}

	export function addOptimistic(content) {
		const optimistic = {
			id: `opt-${Date.now()}`,
			content,
			createdAt: new Date().toISOString(),
			isRead: false,
			sender: { id: Number(currentUserId), username: '' }
		};
		messages = [...messages, optimistic];
	}

	function handleSend(e) {
		const { content } = e.detail;
		if (!content || !conversation || !currentUserId) return;
		addOptimistic(content);
		sendSocketMessage({ content, senderId: currentUserId, conversationId: conversation.id });
		dispatch('send', { content, conversationId: conversation.id });
	}

	function groupByDate(msgs) {
		const groups = [];
		let lastDate = '';
		for (const msg of msgs) {
			const date = new Date(msg.createdAt).toLocaleDateString('id-ID', {
				weekday: 'long',
				day: 'numeric',
				month: 'long',
				year: 'numeric'
			});
			if (date !== lastDate) {
				groups.push({ type: 'date', label: date, id: `date-${date}` });
				lastDate = date;
			}
			groups.push({ type: 'message', data: msg, id: String(msg.id) });
		}
		return groups;
	}

	$: grouped = groupByDate(messages);
</script>

<div class="flex h-full flex-col overflow-hidden">
	<!-- Header — desktop only -->
	{#if conversation}
		<div
			class="hidden shrink-0 items-center gap-3 border-b border-gray-100 bg-white px-5 py-4 md:flex"
		>
			<Avatar name={conversation.name} src={conversation.otherAvatar ?? null} size="md" />
			<div>
				<p class="text-sm font-semibold text-[#0d0f1e]">{conversation.name}</p>
				<p class="text-xs {isOnline ? 'font-medium text-emerald-500' : 'text-gray-400'}">
					{isOnline ? '● online' : '○ offline'}
				</p>
			</div>
			<div class="ml-auto">
				<button
					class="flex h-9 w-9 items-center justify-center rounded-xl text-gray-400 transition-colors hover:bg-gray-100"
					aria-label="Info"
				>
					<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<circle cx="12" cy="12" r="10" stroke-width="2" />
						<path stroke-linecap="round" stroke-width="2" d="M12 16v-4M12 8h.01" />
					</svg>
				</button>
			</div>
		</div>
	{/if}

	<!-- Area pesan -->
	<div bind:this={scrollEl} class="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto px-4 py-4">
		{#if loading}
			{#each Array(4) as _, i (i)}
				<div class="flex items-end gap-2 {i % 2 === 0 ? '' : 'flex-row-reverse'}">
					<div class="h-7 w-7 shrink-0 animate-pulse rounded-full bg-gray-200"></div>
					<div
						class="h-10 animate-pulse rounded-2xl bg-gray-200"
						style="width: {80 + ((i * 30) % 120)}px"
					></div>
				</div>
			{/each}
		{:else if messages.length === 0}
			<div class="flex flex-1 flex-col items-center justify-center gap-2 py-16 text-center">
				<div class="flex h-12 w-12 items-center justify-center rounded-2xl bg-gray-100">
					<svg class="h-6 w-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="1.5"
							d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
						/>
					</svg>
				</div>
				<p class="text-sm font-medium text-gray-500">Belum ada pesan</p>
				<p class="text-xs text-gray-400">Mulai percakapan sekarang!</p>
			</div>
		{:else}
			{#each grouped as item (item.id)}
				{#if item.type === 'date'}
					<div class="flex items-center gap-3 py-1">
						<div class="h-px flex-1 bg-gray-100"></div>
						<span class="shrink-0 text-[10px] font-medium text-gray-400">{item.label}</span>
						<div class="h-px flex-1 bg-gray-100"></div>
					</div>
				{:else}
					<MessageBubble
						message={item.data}
						{currentUserId}
						senderAvatar={Number(item.data.sender?.id) !== Number(currentUserId)
							? (conversation?.otherAvatar ?? null)
							: null}
					/>
				{/if}
			{/each}
		{/if}

		<!-- Typing indicator — di dalam scroll area, posisi kiri bawah seperti WA -->
		{#if isTyping}
			<div class="typing-enter flex items-end gap-2">
				<!-- Avatar lawan bicara -->
				{#if conversation}
					<Avatar name={conversation.name} src={conversation?.otherAvatar ?? null} size="sm" />
				{/if}
				<!-- Bubble titik-titik -->
				<div class="flex items-center gap-1 rounded-2xl rounded-bl-sm bg-gray-100 px-4 py-3">
					<span class="h-2 w-2 animate-bounce rounded-full bg-gray-400" style="animation-delay: 0ms"
					></span>
					<span
						class="h-2 w-2 animate-bounce rounded-full bg-gray-400"
						style="animation-delay: 150ms"
					></span>
					<span
						class="h-2 w-2 animate-bounce rounded-full bg-gray-400"
						style="animation-delay: 300ms"
					></span>
				</div>
			</div>
		{/if}
	</div>

	<!-- Input -->
	{#if conversation}
		<div class="shrink-0 border-t border-gray-100 bg-white px-3 py-3">
			<MessageInput
				bind:value={inputValue}
				conversationId={conversation.id}
				{currentUserId}
				on:send={handleSend}
			/>
		</div>
	{/if}
</div>

<style>
	/* Animasi muncul dari bawah saat typing indicator tampil */
	.typing-enter {
		animation: slideUp 0.2s ease-out;
	}

	@keyframes slideUp {
		from {
			opacity: 0;
			transform: translateY(8px);
		}
		to {
			opacity: 1;
			transform: translateY(0);
		}
	}

	/* Bounce tiap titik beda timing */
	:global(.animate-bounce) {
		animation: bounce 1s infinite;
	}

	@keyframes bounce {
		0%,
		60%,
		100% {
			transform: translateY(0);
		}
		30% {
			transform: translateY(-5px);
		}
	}
</style>
