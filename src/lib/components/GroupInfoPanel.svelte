<script>
	import { createEventDispatcher } from 'svelte';
	import { conversationApi } from '$lib/api.js';
	import Avatar from '$lib/components/ui/Avatar.svelte';

	export let conversation = null;
	export let currentUserId = null;

	const dispatch = createEventDispatcher();

	let editingName = false;
	let nameInput = '';
	let saving = false;
	let error = '';
	let addingMember = null;

	$: isAdmin = (conversation?.members ?? []).find((m) => m.id === currentUserId)?.role === 'admin';
	$: nameInput = conversation?.name ?? '';

	// ── SEARCH MEMBERS ────────────────────────────
	let memberSearchQuery = '';
	let memberSearchResults = [];
	let searchingMembers = false;
	let searchTimeout;

	$:{memberSearchQuery; debounceSearch();}
	
	function debounceSearch() {
		clearTimeout(searchTimeout);
		searchTimeout = setTimeout(async () => {
			if (!memberSearchQuery.trim() || !isAdmin) {
				memberSearchResults = [];
				return;
			}
			searchingMembers = true;
			try {
				const results = await conversationApi.searchUsers(memberSearchQuery);
				// Filter users already in group
				const currentMemberIds = new Set(conversation?.members?.map(m => m.id) ?? []);
				memberSearchResults = results.filter(u => !currentMemberIds.has(u.id));
			} catch (e) {
				error = e.message;
			} finally {
				searchingMembers = false;
			}
		}, 300);
	}

	// ── Ganti foto grup ────────────────────────────
	function pickAvatar() {
		if (!isAdmin) return;
		const input = document.createElement('input');
		input.type = 'file';
		input.accept = 'image/*';
		input.onchange = async (e) => {
			const file = e.target.files[0];
			if (!file) return;
			if (file.size > 2_000_000) { error = 'Foto terlalu besar (max 2MB)'; return; }
			const reader = new FileReader();
			reader.onload = async (ev) => {
				await saveGroup({ groupAvatar: ev.target.result });
			};
			reader.readAsDataURL(file);
		};
		input.click();
	}

	// ── Hapus foto grup ────────────────────────────
	async function removeAvatar() {
		if (!isAdmin) return;
		await saveGroup({ groupAvatar: null });
	}

	// ── Simpan ke API ─────────────────────────────────
	async function saveGroup(data) {
		if (saving) return;
		saving = true;
		error = '';
		try {
			const updated = await conversationApi.updateGroup(conversation.id, data);
			dispatch('updated', updated);
			editingName = false;
		} catch (e) {
			error = e.message;
		} finally {
			saving = false;
		}
	}

	function saveName() {
		const trimmed = nameInput.trim();
		if (!trimmed || trimmed === conversation?.name) { editingName = false; return; }
		saveGroup({ groupName: trimmed });
	}

	// ── Tambah anggota ──────────────────────────────
	async function addMember(userId) {
		if (addingMember || !isAdmin) return;
		addingMember = userId;
		try {
			const result = await conversationApi.addMember(conversation.id, userId);
			// Update local members (optimistic)
			const newMember = { id: userId, username: result.user.username, avatar: result.user.avatar ?? null, role: 'member' };
			const updatedMembers = [...(conversation?.members ?? []), newMember];
			dispatch('updated', { id: conversation.id, members: updatedMembers });
			memberSearchQuery = '';
			memberSearchResults = [];
		} catch (e) {
			error = e.message;
		} finally {
			addingMember = null;
		}
	}

	// ── Keluarkan anggota ────────────────────────────
	let removingId = null;
	async function removeMember(memberId) {
		if (removingId) return;
		removingId = memberId;
		try {
			await conversationApi.removeMember(conversation.id, memberId);
			dispatch('memberRemoved', { conversationId: conversation.id, userId: memberId });
		} catch (e) {
			error = e.message;
		} finally {
			removingId = null;
		}
	}

	// ── Keluar dari grup ─────────────────────────────
	async function leaveGroup() {
		if (removingId) return;
		removingId = currentUserId;
		try {
			await conversationApi.removeMember(conversation.id, currentUserId);
			dispatch('left');
		} catch (e) {
			error = e.message;
			removingId = null;
		}
	}
</script>

<div class="flex h-full flex-col bg-white">

	<!-- Header panel -->
	<div class="flex shrink-0 items-center gap-3 border-b border-gray-100 px-5 py-4" style="padding-top: max(16px, env(safe-area-inset-top))">
		<button on:click={() => dispatch('close')} class="flex h-8 w-8 items-center justify-center rounded-xl text-gray-500 hover:bg-gray-100">
			<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
			</svg>
		</button>
		<p class="text-sm font-semibold text-[#0d0f1e]">Info Grup</p>
		{#if saving || searchingMembers}
			<span class="ml-auto text-xs text-gray-400">{saving ? 'Menyimpan...' : 'Mencari...'}</span>
		{/if}
	</div>

	<div class="flex-1 overflow-y-auto">
		<!-- Foto & nama grup -->
		<div class="flex flex-col items-center gap-3 px-5 py-6">
			<!-- Foto grup -->
			<div class="relative">
				{#if conversation?.groupAvatar}
					<img src={conversation.groupAvatar} alt="grup" class="h-20 w-20 rounded-full object-cover" />
				{:else}
					<div class="flex h-20 w-20 items-center justify-center rounded-full bg-indigo-100">
						<svg class="h-10 w-10 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
						</svg>
					</div>
				{/if}
				{#if isAdmin}
					<!-- Tombol ganti foto -->
					<button
						on:click={pickAvatar}
						disabled={saving}
						class="absolute bottom-0 right-0 flex h-7 w-7 items-center justify-center rounded-full bg-[#0d0f1e] text-white shadow hover:opacity-80 disabled:opacity-50"
						title="Ganti foto"
					>
						<svg class="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
						</svg>
					</button>
				{/if}
			</div>

			<!-- Tombol hapus foto -->
			{#if isAdmin && conversation?.groupAvatar}
				<button
					on:click={removeAvatar}
					disabled={saving}
					class="flex items-center gap-1 rounded-lg px-3 py-1 text-xs text-red-400 hover:bg-red-50 hover:text-red-600 disabled:opacity-40"
				>
					<svg class="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
					</svg>
					Hapus foto
				</button>
			{/if}

			<!-- Nama grup -->
			{#if editingName}
				<div class="flex w-full items-center gap-2">
					<input
						bind:value={nameInput}
						on:keydown={(e) => { if (e.key === 'Enter') saveName(); if (e.key === 'Escape') editingName = false; }}
						class="flex-1 rounded-xl border border-gray-200 px-3 py-2 text-sm focus:border-[#0d0f1e] focus:outline-none"
						autofocus
					/>
					<button on:click={saveName} disabled={saving} class="rounded-xl bg-[#0d0f1e] px-3 py-2 text-xs text-white disabled:opacity-50">
						{saving ? '...' : 'Simpan'}
					</button>
					<button on:click={() => (editingName = false)} class="rounded-xl px-2 py-2 text-xs text-gray-400 hover:bg-gray-100">Batal</button>
				</div>
			{:else}
				<div class="flex items-center gap-2">
					<p class="text-base font-bold text-[#0d0f1e]">{conversation?.name}</p>
					{#if isAdmin}
						<button on:click={() => (editingName = true)} class="text-gray-400 hover:text-gray-600" title="Ubah nama grup">
							<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
							</svg>
						</button>
					{/if}
				</div>
				<p class="text-xs text-gray-400">{(conversation?.members ?? []).length} anggota</p>
			{/if}

			{#if error}
				<p class="text-xs text-red-500">{error}</p>
			{/if}
		</div>

		<!-- Daftar anggota -->
		<div class="px-4 pb-4">
			<p class="mb-2 px-1 text-xs font-semibold uppercase tracking-wide text-gray-400">Anggota ({(conversation?.members ?? []).length})</p>
			<div class="flex flex-col gap-0.5">
				{#each (conversation?.members ?? []) as member (member.id)}
					<div class="flex items-center gap-3 rounded-xl px-3 py-2.5 hover:bg-gray-50">
						<Avatar name={member.username} src={member.avatar ?? null} size="sm" />
						<div class="flex-1 min-w-0">
							<p class="truncate text-sm font-medium text-[#0d0f1e]">
								{member.username}{#if member.id === currentUserId}<span class="text-gray-400"> (kamu)</span>{/if}
							</p>
							{#if member.role === 'admin'}
								<p class="text-[10px] font-semibold text-indigo-500">Admin</p>
							{/if}
						</div>
						{#if isAdmin && member.id !== currentUserId}
							<button
								on:click={() => removeMember(member.id)}
								disabled={removingId === member.id}
								class="shrink-0 rounded-lg px-2 py-1 text-[10px] text-red-400 hover:bg-red-50 hover:text-red-600 disabled:opacity-40"
							>
								{removingId === member.id ? '...' : 'Keluarkan'}
							</button>
						{/if}
					</div>
				{/each}
			</div>
		</div>

		<!-- TAMBAH ANGGOTA (Admin Only) -->
		{#if isAdmin}
		<div class="border-t border-gray-100 px-4 pb-4 pt-2">
			<p class="mb-2 px-1 text-xs font-semibold uppercase tracking-wide text-gray-400">Tambah Anggota</p>
			<div class="relative">
				<svg class="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
				</svg>
				<input 
					bind:value={memberSearchQuery}
					placeholder="Cari username untuk ditambahkan..."
					class="w-full rounded-xl bg-gray-50 py-2.5 pl-9 pr-4 text-sm placeholder:text-gray-400 focus:ring-2 focus:ring-[#0d0f1e]/20 focus:outline-none"
					disabled={addingMember}
				/>
			</div>
			{#if searchingMembers}
				<p class="mt-2 text-center text-xs text-gray-400">Mencari...</p>
			{:else if memberSearchResults.length === 0 && memberSearchQuery}
				<p class="mt-2 text-center text-xs text-gray-400">User tidak ditemukan</p>
			{:else if memberSearchResults.length > 0}
				<div class="mt-2 flex flex-col gap-0.5 max-h-48 overflow-y-auto">
					{#each memberSearchResults as user (user.id)}
						<button 
							on:click={() => addMember(user.id)}
							disabled={addingMember === user.id}
							class="flex items-center gap-3 rounded-xl px-3 py-2.5 text-left hover:bg-gray-50 disabled:opacity-50"
						>
							<Avatar name={user.username} src={user.avatar ?? null} size="sm" />
							<span class="flex-1 text-sm font-medium text-[#0d0f1e]">{user.username}</span>
							{#if addingMember === user.id}
								<span class="text-xs text-emerald-500">Menambahkan...</span>
							{:else}
								<span class="rounded-lg bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-700">Tambah</span>
							{/if}
						</button>
					{/each}
				</div>
			{/if}
		</div>
		{/if}
	</div>

	<!-- Tombol keluar grup -->
	<div class="shrink-0 border-t border-gray-100 px-5 py-4">
		<button
			on:click={leaveGroup}
			disabled={!!removingId}
			class="w-full rounded-xl border border-red-200 py-2.5 text-sm font-semibold text-red-500 transition-colors hover:bg-red-50 disabled:opacity-40"
		>
			{removingId === currentUserId ? 'Keluar...' : 'Keluar dari Grup'}
		</button>
	</div>
</div>
