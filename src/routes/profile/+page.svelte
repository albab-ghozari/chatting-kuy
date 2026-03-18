<script>
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { authApi } from '$lib/api.js';
	import { authStore } from '$lib/stores/auth.js';
	import Avatar from '$lib/components/ui/Avatar.svelte';

	let currentUser = null;
	let username = '';
	let avatarPreview = null; // base64 preview
	let avatarBase64 = null; // yang akan dikirim ke backend
	let currentPassword = '';
	let newPassword = '';
	let confirmPassword = '';

	let loading = false;
	let successMsg = '';
	let errorMsg = '';
	let activeTab = 'profile'; // 'profile' | 'password'

	onMount(() => {
		const token = localStorage.getItem('token');
		const user = JSON.parse(localStorage.getItem('user') ?? 'null');
		if (!token || !user) {
			goto('/');
			return;
		}
		currentUser = user;
		username = user.username;
		avatarPreview = user.avatar ?? null;
	});

	// Handle pilih foto
	function handleFileChange(e) {
		const file = e.target.files[0];
		if (!file) return;

		if (file.size > 2_000_000) {
			errorMsg = 'Ukuran foto maksimal 2MB';
			return;
		}

		if (!file.type.startsWith('image/')) {
			errorMsg = 'File harus berupa gambar';
			return;
		}

		const reader = new FileReader();
		reader.onload = (ev) => {
			avatarPreview = ev.target.result;
			avatarBase64 = ev.target.result;
		};
		reader.readAsDataURL(file);
		errorMsg = '';
	}

	function removeAvatar() {
		avatarPreview = null;
		avatarBase64 = ''; // string kosong = hapus avatar
	}

	async function handleSaveProfile() {
		errorMsg = '';
		successMsg = '';

		if (!username.trim()) {
			errorMsg = 'Username tidak boleh kosong';
			return;
		}

		loading = true;
		try {
			const payload = {};

			if (username.trim() !== currentUser.username) payload.username = username.trim();

			if (avatarBase64 !== null) payload.avatar = avatarBase64;

			if (Object.keys(payload).length === 0) {
				errorMsg = 'Tidak ada perubahan';
				return;
			}

			const updated = await authApi.updateProfile(payload);
			authStore.updateUser(updated);
			currentUser = updated;
			avatarBase64 = null; // reset flag
			successMsg = 'Profil berhasil diperbarui!';
		} catch (e) {
			errorMsg = e.message;
		} finally {
			loading = false;
		}
	}

	async function handleSavePassword() {
		errorMsg = '';
		successMsg = '';

		if (!currentPassword) {
			errorMsg = 'Masukkan password lama';
			return;
		}
		if (!newPassword) {
			errorMsg = 'Masukkan password baru';
			return;
		}
		if (newPassword.length < 6) {
			errorMsg = 'Password minimal 6 karakter';
			return;
		}
		if (newPassword !== confirmPassword) {
			errorMsg = 'Konfirmasi password tidak cocok';
			return;
		}

		loading = true;
		try {
			await authApi.updateProfile({ currentPassword, newPassword });
			currentPassword = '';
			newPassword = '';
			confirmPassword = '';
			successMsg = 'Password berhasil diubah!';
		} catch (e) {
			errorMsg = e.message;
		} finally {
			loading = false;
		}
	}
</script>

<svelte:head><title>Profil</title></svelte:head>

<div class="flex min-h-screen flex-col bg-gray-50">
	<!-- Header -->
	<div
		class="sticky top-0 z-10 flex items-center gap-3 border-b border-gray-100 bg-white px-4 py-4"
	>
		<button
			on:click={() => goto('/chat')}
			aria-label="Kembali ke Chat"
			class="flex h-8 w-8 items-center justify-center rounded-xl text-gray-500 transition-colors hover:bg-gray-100"
		>
			<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
			</svg>
		</button>
		<h1 class="text-base font-bold text-[#0d0f1e]">Profil</h1>
	</div>

	<div class="mx-auto flex w-full max-w-md flex-1 flex-col gap-4 px-4 py-6">
		<!-- Avatar section -->
		<div class="flex flex-col items-center gap-4 rounded-2xl bg-white p-6 shadow-sm">
			<div class="relative">
				<Avatar name={currentUser?.username ?? ''} src={avatarPreview} size="xl" />
				<!-- Tombol edit foto -->
				<label
					class="absolute right-0 bottom-0 flex h-7 w-7 cursor-pointer
                       items-center justify-center rounded-full bg-[#0d0f1e]
                       shadow-md transition-colors hover:bg-gray-700"
				>
					<svg class="h-3.5 w-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"
						/>
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"
						/>
					</svg>
					<input type="file" accept="image/*" class="hidden" on:change={handleFileChange} />
				</label>
			</div>

			<div class="text-center">
				<p class="text-lg font-bold text-[#0d0f1e]">{currentUser?.username ?? ''}</p>
				<p class="text-xs text-gray-400">Klik ikon kamera untuk ganti foto</p>
			</div>

			{#if avatarPreview && avatarPreview !== currentUser?.avatar}
				<button
					on:click={removeAvatar}
					class="text-xs text-red-500 transition-colors hover:underline"
				>
					Hapus foto
				</button>
			{/if}
		</div>

		<!-- Tab -->
		<div class="overflow-hidden rounded-2xl bg-white shadow-sm">
			<div class="flex border-b border-gray-100">
				<button
					on:click={() => {
						activeTab = 'profile';
						errorMsg = '';
						successMsg = '';
					}}
					class="flex-1 py-3 text-sm font-semibold transition-colors
                 {activeTab === 'profile'
						? 'border-b-2 border-[#0d0f1e] text-[#0d0f1e]'
						: 'text-gray-400'}"
				>
					Info Profil
				</button>
				<button
					on:click={() => {
						activeTab = 'password';
						errorMsg = '';
						successMsg = '';
					}}
					class="flex-1 py-3 text-sm font-semibold transition-colors
                 {activeTab === 'password'
						? 'border-b-2 border-[#0d0f1e] text-[#0d0f1e]'
						: 'text-gray-400'}"
				>
					Ubah Password
				</button>
			</div>

			<div class="flex flex-col gap-4 p-5">
				<!-- Pesan sukses / error -->
				{#if successMsg}
					<div
						class="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700"
					>
						✓ {successMsg}
					</div>
				{/if}
				{#if errorMsg}
					<div class="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
						{errorMsg}
					</div>
				{/if}

				{#if activeTab === 'profile'}
					<!-- Form profil -->
					<div class="flex flex-col gap-1.5">
						<label class="text-xs font-semibold text-gray-500">Username</label>
						<input
							type="text"
							bind:value={username}
							placeholder="Username baru"
							class="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm
                     text-[#0d0f1e] transition-all placeholder:text-gray-400 focus:border-[#0d0f1e]
                     focus:ring-2 focus:ring-[#0d0f1e]/20 focus:outline-none"
						/>
					</div>

					<button
						on:click={handleSaveProfile}
						disabled={loading}
						class="w-full rounded-xl bg-[#0d0f1e] py-3 text-sm font-semibold text-white
                   transition-colors hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-50"
					>
						{loading ? 'Menyimpan...' : 'Simpan Perubahan'}
					</button>
				{:else}
					<!-- Form password -->
					<div class="flex flex-col gap-3">
						<div class="flex flex-col gap-1.5">
							<label class="text-xs font-semibold text-gray-500">Password Lama</label>
							<input
								type="password"
								bind:value={currentPassword}
								placeholder="••••••••"
								class="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm
                       transition-all placeholder:text-gray-400 focus:border-[#0d0f1e] focus:ring-2
                       focus:ring-[#0d0f1e]/20 focus:outline-none"
							/>
						</div>
						<div class="flex flex-col gap-1.5">
							<label class="text-xs font-semibold text-gray-500">Password Baru</label>
							<input
								type="password"
								bind:value={newPassword}
								placeholder="••••••••"
								class="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm
                       transition-all placeholder:text-gray-400 focus:border-[#0d0f1e] focus:ring-2
                       focus:ring-[#0d0f1e]/20 focus:outline-none"
							/>
						</div>
						<div class="flex flex-col gap-1.5">
							<label class="text-xs font-semibold text-gray-500">Konfirmasi Password Baru</label>
							<input
								type="password"
								bind:value={confirmPassword}
								placeholder="••••••••"
								class="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm
                       transition-all placeholder:text-gray-400 focus:border-[#0d0f1e] focus:ring-2
                       focus:ring-[#0d0f1e]/20 focus:outline-none"
							/>
						</div>
					</div>

					<button
						on:click={handleSavePassword}
						disabled={loading}
						class="w-full rounded-xl bg-[#0d0f1e] py-3 text-sm font-semibold text-white
                   transition-colors hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-50"
					>
						{loading ? 'Menyimpan...' : 'Ubah Password'}
					</button>
				{/if}
			</div>
		</div>

		<!-- Logout -->
		<button
			on:click={() => {
				authStore.logout();
				goto('/');
			}}
			class="w-full rounded-2xl border border-gray-200 bg-white py-3 text-sm font-semibold
             text-red-500 shadow-sm transition-colors hover:bg-red-50"
		>
			Logout
		</button>
	</div>
</div>
