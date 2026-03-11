<script>
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { browser } from '$app/environment';
	import Input from '$lib/components/ui/Input.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import { authApi } from '$lib/api.js';
	import { authStore } from '$lib/stores/auth.js';

	let username = '';
	let password = '';
	let confirmPassword = '';
	let loading = false;
	let errors = { username: '', password: '', confirmPassword: '', general: '' };

	onMount(async () => {
		if (browser && localStorage.getItem('token')) await goto('/chat');
	});

	function validate() {
		errors = { username: '', password: '', confirmPassword: '', general: '' };
		let valid = true;
		if (!username.trim()) {
			errors.username = 'Username wajib diisi.';
			valid = false;
		}
		if (username.length < 3) {
			errors.username = 'Username minimal 3 karakter.';
			valid = false;
		}
		if (!password) {
			errors.password = 'Password wajib diisi.';
			valid = false;
		}
		if (password.length < 6) {
			errors.password = 'Password minimal 6 karakter.';
			valid = false;
		}
		if (password !== confirmPassword) {
			errors.confirmPassword = 'Password tidak sama.';
			valid = false;
		}
		return valid;
	}

	async function handleRegister() {
		if (!validate()) return;
		loading = true;
		try {
			await authApi.register(username.trim(), password);
			const data = await authApi.login(username.trim(), password);
			authStore.login(data.token, data.user);
			await goto('/chat');
		} catch (err) {
			errors.general = err.message ?? 'Registrasi gagal, coba lagi.';
		} finally {
			loading = false;
		}
	}
</script>

<svelte:head><title>Daftar Akun</title></svelte:head>

<main class="flex min-h-screen w-full items-center justify-center bg-white px-4">
	<div class="animate-fade-in w-full max-w-sm">
		<div class="flex flex-col gap-6">
			<div class="text-center">
				<h1 class="text-2xl font-bold tracking-tight text-[#0d0f1e]">Buat Akun</h1>
				<p class="mt-1 text-sm text-gray-400">Bergabung dan mulai ngobrol</p>
			</div>

			<div class="flex flex-col gap-3">
				<Input
					id="username"
					name="username"
					type="text"
					placeholder="Username"
					bind:value={username}
					error={errors.username}
					autocomplete="username"
					required
				/>
				<Input
					id="password"
					name="password"
					type="password"
					placeholder="Password"
					bind:value={password}
					error={errors.password}
					autocomplete="new-password"
					required
				/>
				<Input
					id="confirmPassword"
					name="confirmPassword"
					type="password"
					placeholder="Ulangi password"
					bind:value={confirmPassword}
					error={errors.confirmPassword}
					autocomplete="new-password"
					required
				/>
			</div>

			{#if errors.general}
				<p class="-mt-2 text-center text-xs font-medium text-red-500">{errors.general}</p>
			{/if}

			<Button type="button" variant="primary" fullWidth {loading} on:click={handleRegister}>
				Daftar
			</Button>

			<p class="text-center text-sm text-gray-500">
				Sudah punya akun?
				<button
					type="button"
					on:click={() => goto('/')}
					class="ml-1 font-semibold text-[#0d0f1e] underline underline-offset-2 transition-opacity hover:opacity-70"
				>
					Login
				</button>
			</p>
		</div>
	</div>
</main>

<style>
	@keyframes fade-in {
		from {
			opacity: 0;
			transform: translateY(16px);
		}
		to {
			opacity: 1;
			transform: translateY(0);
		}
	}
	.animate-fade-in {
		animation: fade-in 0.45s ease-out both;
	}
</style>
