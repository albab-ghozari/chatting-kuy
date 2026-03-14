<script>
	import { onMount, onDestroy } from 'svelte';
	import { goto } from '$app/navigation';
	import { notify, requestNotificationPermission } from '$lib/notification.js';

	import ToastContainer from '$lib/components/ToastContainer.svelte';
	import { authStore } from '$lib/stores/auth.js';
	import { conversationApi, messageApi } from '$lib/api.js';
	import {
		connectSocket,
		disconnectSocket,
		onSocketEvent,
		offSocketEvent,
		joinRoom
	} from '$lib/socket.js';
	import ConversationItem from '$lib/components/ui/ConversationItem.svelte';
	import Avatar from '$lib/components/ui/Avatar.svelte';
	import ChatWindow from '$lib/components/ChatWindow.svelte';

	let currentUser = null;
	let conversations = [];
	let activeConversation = null;
	let chatWindow; // referensi ke ChatWindow component
	let loadingConversations = false;
	let searchQuery = '';
	let showNewChat = false;
	let userSearchQuery = '';
	let userResults = [];
	let allUsers = []; // cache semua user untuk instant search
	let searchingUsers = false;
	let mobileView = 'sidebar';
	let notifPermission = 'default';
	let onlineUserIds = new Set(); // set userId yang sedang online

	// ── Typing & Unread di sidebar ─────────────────────────
	// { [conversationId]: true/false }
	let sidebarTyping = {};
	let typingTimers = {};

	$: filtered = conversations
		.slice()
		.sort((a, b) => {
			const ta = a.lastMessageAt ? new Date(a.lastMessageAt).getTime() : 0;
			const tb = b.lastMessageAt ? new Date(b.lastMessageAt).getTime() : 0;
			return tb - ta;
		})
		.filter((c) => c.name.toLowerCase().includes(searchQuery.toLowerCase()));

	function formatPreviewTime(dateStr) {
		if (!dateStr) return '';
		const d = new Date(dateStr);
		const now = new Date();
		const diffDays = Math.floor((now - d) / 86400000);
		if (diffDays === 0)
			return d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
		if (diffDays === 1) return 'Kemarin';
		if (diffDays < 7) return d.toLocaleDateString('id-ID', { weekday: 'short' });
		return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
	}

	// ── Handler typing dari socket (global, di +page level) ──
	function handleGlobalTyping({ userId, room }) {
		if (userId === currentUser?.id) return;

		// Pakai Number agar cocok dengan conv.id yang bertipe number dari Prisma
		const convId = Number(room);

		sidebarTyping = { ...sidebarTyping, [convId]: true };

		clearTimeout(typingTimers[convId]);
		typingTimers[convId] = setTimeout(() => {
			sidebarTyping = { ...sidebarTyping, [convId]: false };
		}, 3000);
	}

	function handleGlobalStopTyping({ userId, room }) {
		if (userId === currentUser?.id) return;
		sidebarTyping = { ...sidebarTyping, [Number(room)]: false };
	}

	// ── Handler pesan baru dari socket (global) ───────────────
	function handleGlobalMessage(msg) {
		const convId = Number(msg.conversationId);
		const isActiveConv = Number(activeConversation?.id) === convId;
		const isFromMe = Number(msg.sender?.id) === Number(currentUser?.id);

		// Update sidebar
		conversations = conversations.map((c) => {
			if (Number(c.id) !== convId) return c;
			return {
				...c,
				lastMessage: msg.content,
				lastMessageAt: msg.createdAt,
				time: formatPreviewTime(msg.createdAt),
				unread: !isActiveConv && !isFromMe ? (c.unread ?? 0) + 1 : (c.unread ?? 0)
			};
		});

		// Notifikasi kalau pesan dari orang lain
		// - Conversation tidak aktif → selalu tampilkan toast
		// - Conversation aktif tapi tab tidak fokus → tetap tampilkan
		if (!isFromMe && (!isActiveConv || !document.hasFocus())) {
			const conv = conversations.find((c) => Number(c.id) === convId);
			notify({
				senderName: msg.sender?.username ?? 'Pesan baru',
				message: msg.content,
				avatar: conv?.otherAvatar ?? null,
				onClickCb: () => {
					if (conv) selectConversation(conv);
				}
			});
		}
	}

	onMount(async () => {
		// Minta izin browser notification (guard untuk Safari iPhone yang tidak support)
		try {
			if (typeof Notification !== 'undefined') {
				notifPermission = Notification.permission;
				if (Notification.permission === 'default') {
					const granted = await requestNotificationPermission();
					notifPermission = granted ? 'granted' : 'denied';
				} else if (Notification.permission === 'granted') {
					await requestNotificationPermission(); // register SW
				}
			}
		} catch (e) {
			console.log('Notification not supported:', e.message);
		}
		const token = localStorage.getItem('token');
		const user = JSON.parse(localStorage.getItem('user') ?? 'null');
		if (!token || !user) {
			goto('/');
			return;
		}
		currentUser = user;
		// Sync avatar dari localStorage
		if (user.avatar) currentUser = { ...user };
		await connectSocket(currentUser.id);
		await loadConversations();

		// Pasang listener global di level page — bukan di ChatWindow
		// agar sidebar bisa update meski conversation tidak aktif
		await onSocketEvent('receive_message', handleGlobalMessage);
		await onSocketEvent('typing', handleGlobalTyping);
		await onSocketEvent('stop_typing', handleGlobalStopTyping);
		await onSocketEvent('new_user', handleNewUser);
		await onSocketEvent('user_online', ({ userId }) => {
			onlineUserIds = new Set([...onlineUserIds, Number(userId)]);
		});
		await onSocketEvent('user_offline', ({ userId }) => {
			onlineUserIds.delete(Number(userId));
			onlineUserIds = new Set(onlineUserIds);
		});
		// Terima list semua user online saat pertama connect/reconnect
		await onSocketEvent('online_users', ({ userIds }) => {
			// Replace dengan data fresh dari server (ini sudah include semua yg online)
			onlineUserIds = new Set([...onlineUserIds, ...userIds.map(Number)]);
		});
	});

	onDestroy(async () => {
		await offSocketEvent('receive_message', handleGlobalMessage);
		await offSocketEvent('typing', handleGlobalTyping);
		await offSocketEvent('stop_typing', handleGlobalStopTyping);
		await offSocketEvent('new_user', handleNewUser);
		await offSocketEvent('user_online');
		await offSocketEvent('user_offline');
		await offSocketEvent('online_users');
		disconnectSocket();
	});

	async function loadConversations() {
		try {
			loadingConversations = true;
			const data = await conversationApi.getAll();
			conversations = data.map((c) => ({
				...c,
				time: formatPreviewTime(c.lastMessageAt),
				unread: c.unread ?? 0 // ← pakai dari backend, bukan hardcode 0
			}));

			// Join semua room setelah dapat daftar conversation
			// agar event typing & pesan baru bisa masuk ke sidebar
			// meskipun conversation belum diklik
			for (const conv of conversations) {
				await joinRoom(conv.id);
			}
		} catch (e) {
			if (e.message?.includes('401')) {
				authStore.logout();
				goto('/');
			}
		} finally {
			loadingConversations = false;
		}
	}

	async function selectConversation(conv) {
		activeConversation = conv;
		mobileView = 'chat';
		// Reset unread saat conversation dibuka
		conversations = conversations.map((c) => (c.id === conv.id ? { ...c, unread: 0 } : c));
		// Messages diload oleh ChatWindow via event 'requestmessages'
	}

	function backToSidebar() {
		mobileView = 'sidebar';
		activeConversation = null;
	}

	function handleSend(e) {
		const { content, conversationId } = e.detail;
		if (!content || !activeConversation) return;
		// Update sidebar preview
		conversations = conversations.map((c) =>
			c.id === activeConversation.id
				? {
						...c,
						lastMessage: content,
						lastMessageAt: new Date().toISOString(),
						time: formatPreviewTime(new Date().toISOString())
					}
				: c
		);
	}

	// handleNewMessage — hanya update sidebar preview
	function handleNewMessage(e) {
		const msg = e.detail;
		const isFromMe = Number(msg.sender?.id) === Number(currentUser?.id);
		const isActiveConv = Number(activeConversation?.id) === Number(msg.conversationId);
		conversations = conversations.map((c) => {
			if (Number(c.id) !== Number(msg.conversationId)) return c;
			return {
				...c,
				lastMessage: msg.content,
				lastMessageAt: msg.createdAt,
				time: formatPreviewTime(msg.createdAt),
				unread: !isActiveConv && !isFromMe ? (c.unread ?? 0) + 1 : (c.unread ?? 0)
			};
		});
	}

	// Handler saat ada user baru daftar
	async function handleNewUser(user) {
		if (Number(user.id) === Number(currentUser?.id)) return;

		// Simpan ke cache
		allUsers = [...allUsers.filter((u) => u.id !== user.id), user];

		// Kalau panel sedang buka dan ada query → re-fetch dari backend
		// agar hasil selalu akurat (termasuk user yang baru daftar)
		if (showNewChat && userSearchQuery.trim()) {
			searchingUsers = true;
			try {
				userResults = await conversationApi.searchUsers(userSearchQuery);
			} catch (e) {
				console.error(e);
			} finally {
				searchingUsers = false;
			}
		}
	}

	// Fetch messages saat ChatWindow dispatch 'requestmessages'
	async function handleRequestMessages(e) {
		const { conversationId } = e.detail;
		try {
			const msgs = await messageApi.getByConversation(conversationId);
			if (chatWindow) chatWindow.setMessages(msgs);
		} catch (err) {
			console.error('fetch messages error:', err);
		}
	}

	let searchTimeout;
	async function handleUserSearch() {
		clearTimeout(searchTimeout);
		const q = userSearchQuery.trim().toLowerCase();

		if (!q) {
			userResults = [];
			return;
		}

		// Tampilkan dulu dari cache allUsers — instant, tanpa tunggu API
		const fromCache = allUsers.filter(
			(u) => Number(u.id) !== Number(currentUser?.id) && u.username.toLowerCase().includes(q)
		);
		if (fromCache.length > 0) userResults = fromCache;

		// Lalu fetch dari API untuk hasil lengkap
		searchTimeout = setTimeout(async () => {
			searchingUsers = true;
			try {
				const results = await conversationApi.searchUsers(userSearchQuery);

				// Merge hasil API ke cache allUsers
				for (const u of results) {
					if (!allUsers.find((x) => x.id === u.id)) allUsers = [...allUsers, u];
				}

				// Gabungkan: hasil API + user baru dari cache yang belum ada di API
				const apiIds = new Set(results.map((u) => u.id));
				const cacheOnly = allUsers.filter(
					(u) =>
						!apiIds.has(u.id) &&
						Number(u.id) !== Number(currentUser?.id) &&
						u.username.toLowerCase().includes(q)
				);
				userResults = [...results, ...cacheOnly];
			} finally {
				searchingUsers = false;
			}
		}, 300);
	}

	let startingChat = false; // guard agar tidak double click

	async function startChat(targetUser) {
		if (startingChat) return; // cegah double call
		startingChat = true;
		try {
			const conv = await conversationApi.create(targetUser.id);
			await loadConversations();
			showNewChat = false;
			userSearchQuery = '';
			userResults = [];
			const found = conversations.find((c) => Number(c.id) === Number(conv.id)) ?? {
				...conv,
				time: '',
				unread: 0
			};
			await selectConversation(found);
		} catch (e) {
			console.error(e);
		} finally {
			startingChat = false;
		}
	}

	function logout() {
		authStore.logout();
		disconnectSocket();
		goto('/');
	}
</script>

<svelte:head><title>Chat</title></svelte:head>

<div
	style="position:fixed;top:0;left:0;right:0;height:calc(var(--vh,1vh)*100);overflow:hidden;display:flex;background:white;width:100%;"
>
	<!-- SIDEBAR -->
	<aside
		class="
    flex w-full flex-col border-r border-gray-100
    bg-white md:w-72 md:shrink-0
    {mobileView === 'chat' ? 'hidden md:flex' : 'flex'}
  "
	>
		<!-- Header -->
		<div class="flex items-center justify-between px-4 pt-5 pb-3">
			<h1 class="text-lg font-bold tracking-tight text-[#0d0f1e]">Pesan</h1>
			<div class="flex items-center gap-1">
				{#if currentUser}
					<button
						on:click={() => goto('/profile')}
						class="transition-opacity hover:opacity-80"
						title="Profil saya"
					>
						<Avatar name={currentUser.username} src={currentUser.avatar ?? null} size="sm" />
					</button>
				{/if}
				<button
					on:click={() => (showNewChat = !showNewChat)}
					class="ml-1 flex h-8 w-8 items-center justify-center rounded-xl text-gray-500 transition-colors hover:bg-gray-100"
					title="Chat baru"
				>
					<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M12 4v16m8-8H4"
						/>
					</svg>
				</button>
				<button
					on:click={() => goto('/profile')}
					class="flex h-8 w-8 items-center justify-center rounded-xl text-gray-400 transition-colors hover:bg-gray-100"
					title="Profil & Pengaturan"
				>
					<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
						/>
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
						/>
					</svg>
				</button>
			</div>
		</div>

		<!-- Panel new chat -->
		{#if showNewChat}
			<div class="mx-3 mb-3 rounded-xl border border-gray-200 bg-gray-50 p-3">
				<p class="mb-2 text-xs font-semibold text-gray-500">Chat baru</p>
				<input
					type="text"
					placeholder="Cari username..."
					bind:value={userSearchQuery}
					on:input={handleUserSearch}
					class="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm
                 placeholder:text-gray-400 focus:border-[#0d0f1e] focus:ring-2 focus:ring-[#0d0f1e]/20
                 focus:outline-none"
				/>
				{#if searchingUsers}
					<p class="mt-2 text-center text-xs text-gray-400">Mencari...</p>
				{:else if userResults.length > 0}
					<div class="mt-2 flex flex-col gap-0.5">
						{#each userResults as u (u.id)}
							<button
								on:click={() => startChat(u)}
								disabled={startingChat}
								class="flex items-center gap-2 rounded-lg px-2 py-2 text-left transition-colors hover:bg-white disabled:opacity-50"
							>
								<Avatar name={u.username} src={u.avatar ?? null} size="sm" />
								<span class="flex-1 text-sm font-medium text-[#0d0f1e]">{u.username}</span>
								{#if startingChat}
									<!-- Spinner loading -->
									<svg
										class="h-4 w-4 shrink-0 animate-spin text-gray-400"
										fill="none"
										viewBox="0 0 24 24"
									>
										<circle
											class="opacity-25"
											cx="12"
											cy="12"
											r="10"
											stroke="currentColor"
											stroke-width="4"
										/>
										<path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
									</svg>
								{/if}
							</button>
						{/each}
					</div>
				{:else if userSearchQuery}
					<p class="mt-2 text-center text-xs text-gray-400">Tidak ditemukan</p>
				{/if}
			</div>
		{/if}

		<!-- Search -->
		<div class="px-4 pb-3">
			<div class="relative">
				<svg
					class="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-gray-400"
					fill="none"
					stroke="currentColor"
					viewBox="0 0 24 24"
				>
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						stroke-width="2"
						d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
					/>
				</svg>
				<input
					type="text"
					placeholder="Cari percakapan..."
					bind:value={searchQuery}
					class="w-full rounded-xl bg-gray-100 py-2.5 pr-4 pl-9 text-sm text-[#0d0f1e]
                 transition-all placeholder:text-gray-400 focus:ring-2 focus:ring-[#0d0f1e]/20 focus:outline-none"
				/>
			</div>
		</div>

		<!-- Conversation list -->
		<div class="flex flex-1 flex-col gap-0.5 overflow-y-auto px-2 pb-4">
			{#if loadingConversations && conversations.length === 0}
				{#each Array(4) as _, i (i)}
					<div class="flex items-center gap-3 px-3 py-3">
						<div class="h-9 w-9 shrink-0 animate-pulse rounded-full bg-gray-200"></div>
						<div class="flex flex-1 flex-col gap-1.5">
							<div class="h-3 w-3/4 animate-pulse rounded bg-gray-200"></div>
							<div class="h-2.5 w-1/2 animate-pulse rounded bg-gray-100"></div>
						</div>
					</div>
				{/each}
			{:else if filtered.length === 0}
				<div class="flex flex-col items-center justify-center gap-2 py-16">
					<div class="flex h-10 w-10 items-center justify-center rounded-xl bg-gray-100">
						<svg
							class="h-5 w-5 text-gray-400"
							fill="none"
							stroke="currentColor"
							viewBox="0 0 24 24"
						>
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="1.5"
								d="M8 10h.01M12 10h.01M16 10h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
							/>
						</svg>
					</div>
					<p class="text-center text-xs text-gray-400">
						{searchQuery ? 'Tidak ada hasil' : 'Belum ada percakapan'}
					</p>
					{#if !searchQuery}
						<button
							on:click={() => (showNewChat = true)}
							class="text-xs font-semibold text-[#0d0f1e] underline underline-offset-2 transition-opacity hover:opacity-70"
						>
							Mulai chat baru
						</button>
					{/if}
				</div>
			{:else}
				{#each filtered as conv (conv.id)}
					<ConversationItem
						name={conv.name}
						lastMessage={conv.lastMessage}
						time={conv.time}
						unread={conv.unread ?? 0}
						active={activeConversation?.id === conv.id}
						isTyping={sidebarTyping[Number(conv.id)] ?? false}
						avatar={conv.otherAvatar ?? null}
						online={onlineUserIds.has(Number(conv.otherUserId))}
						on:click={() => selectConversation(conv)}
					/>
				{/each}
			{/if}
		</div>
	</aside>

	<!-- AREA CHAT -->
	<main
		class="
    flex w-full min-w-0 flex-1 flex-col
    overflow-hidden md:w-auto
    {mobileView === 'sidebar' ? 'hidden md:flex' : 'flex'}
  "
	>
		{#if activeConversation}
			<!-- Header mobile -->
			<div
				class="flex shrink-0 items-center gap-2 border-b border-gray-100 bg-white px-4 py-3 md:hidden"
			>
				<button
					on:click={backToSidebar}
					class="-ml-1 flex h-8 w-8 items-center justify-center rounded-xl text-gray-500 transition-colors hover:bg-gray-100"
				>
					<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M15 19l-7-7 7-7"
						/>
					</svg>
				</button>
				<Avatar
					name={activeConversation.name}
					src={activeConversation.otherAvatar ?? null}
					size="sm"
				/>
				<div>
					<p class="text-sm font-semibold text-[#0d0f1e]">{activeConversation.name}</p>
					<p
						class="text-xs {onlineUserIds.has(Number(activeConversation?.otherUserId))
							? 'font-medium text-emerald-500'
							: 'text-gray-400'}"
					>
						{onlineUserIds.has(Number(activeConversation?.otherUserId)) ? '● online' : '○ offline'}
					</p>
				</div>
			</div>

			<ChatWindow
				bind:this={chatWindow}
				conversation={activeConversation}
				currentUserId={currentUser?.id}
				isOnline={onlineUserIds.has(Number(activeConversation?.otherUserId))}
				on:send={handleSend}
				on:newmessage={handleNewMessage}
				on:requestmessages={handleRequestMessages}
			/>
		{:else}
			<div
				class="hidden flex-1 flex-col items-center justify-center gap-3 px-8 text-center md:flex"
			>
				<div class="mb-2 flex h-16 w-16 items-center justify-center rounded-2xl bg-gray-100">
					<svg class="h-8 w-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="1.5"
							d="M8 10h.01M12 10h.01M16 10h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
						/>
					</svg>
				</div>
				<p class="text-sm font-semibold text-gray-500">Pilih percakapan</p>
				<p class="max-w-xs text-xs text-gray-400">
					Pilih percakapan di kiri atau tekan <span class="font-semibold text-[#0d0f1e]">+</span> untuk
					mulai chat baru.
				</p>
			</div>
		{/if}
	</main>
</div>

<ToastContainer />
