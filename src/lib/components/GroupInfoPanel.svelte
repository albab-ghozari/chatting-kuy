<script>
	import { createEventDispatcher } from 'svelte';
	import { conversationApi } from '$lib/api.js';
	import Avatar from '$lib/components/ui/Avatar.svelte';

	export let conversation = null;  // objek grup
	export let currentUserId = null;

	const dispatch = createEventDispatcher();

	let editingName = false;
	let nameInput = conversation?.name ?? '';
	let saving = false;
	let error = '';

	$: isAdmin = (conversation?.members ?? []).find((m) => m.id === currentUserId)?.role === 'admin';
	$: nameInput = conversation?.name ?? '';

	// ── Ganti foto grup ─────────────────────────────
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
				const base64 = ev.target.result;
				await saveGroup({ groupAvatar: base64 });
			};
			reader.readAsDataURL(file);
		};
		input.click();
	}

	// ── Simpan perubahan (nama / avatar) ──────────────────
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

	// ── Keluarkan anggota ─────────────────────────────
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

	// ── Keluar dari grup (member keluar sendiri) ───────
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

<!-- Panel info grup — slide in dari kanan -->
<div class="flex h-full flex-col bg-white">

	<!-- Header panel -->
	<div class="flex shrink-0 items-center gap-3 border-b border-gray-100 px-5 py-4">
		<button on:click={() => dispatch('close')} class="flex h-8 w-8 items-center justify-center rounded-xl text-gray-500 hover:bg-gray-100">
			<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
			</svg>
		</button>
		<p class="text-sm font-semibold text-[#0d0f1e]">Info Grup</p>
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
					<button
						on:click={pickAvatar}
						class="absolute bottom-0 right-0 flex h-7 w-7 items-center justify-center rounded-full bg-[#0d0f1e] text-white shadow hover:opacity-80"
						title="Ganti foto grup"
					>
						<svg class="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
						</svg>
					</button>
				{/if}
			</div>

			<!-- Nama grup -->
			{#if editingName}
				<div class="flex w-full items-center gap-2">
					<input
						bind:value={nameInput}
						on:keydown={(e) => e.key === 'Enter' && saveName()}
						on:keydown={(e) => e.key === 'Escape' && (editingName = false)}
						class="flex-1 rounded-xl border border-gray-200 px-3 py-2 text-sm focus:border-[#0d0f1e] focus:outline-none"
						autofocus
					/>
					<button on:click={saveName} disabled={saving} class="rounded-xl bg-[#0d0f1e] px-3 py-2 text-xs text-white disabled:opacity-50">
						{saving ? '...' : 'Simpan'}
					</button>
					<button on:click={() => (editingName = false)} class="rounded-xl px-2 py-2 text-xs text-gray-400 hover:bg-gray-100">
						Batal
					</button>
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
		<div class="px-4 pb-6">
			<p class="mb-2 px-1 text-xs font-semibold uppercase tracking-wide text-gray-400">
				Anggota
			</p>
			<div class="flex flex-col gap-0.5">
				{#each (conversation?.members ?? []) as member (member.id)}
					<div class="flex items-center gap-3 rounded-xl px-3 py-2.5 hover:bg-gray-50">
						<Avatar name={member.username} src={member.avatar ?? null} size="sm" />
						<div class="flex-1 min-w-0">
							<p class="truncate text-sm font-medium text-[#0d0f1e]">
								{member.username}
								{#if member.id === currentUserId}<span class="text-gray-400"> (kamu)</span>{/if}
							</p>
							{#if member.role === 'admin'}
								<p class="text-[10px] font-semibold text-indigo-500">Admin</p>
							{/if}
						</div>
						<!-- Admin bisa keluarkan member lain, bukan dirinya sendiri -->
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
	</div>

	<!-- Tombol keluar grup (untuk semua member) -->
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
