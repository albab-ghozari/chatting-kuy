<script>
	import Input from '$lib/components/ui/Input.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import { authApi } from '$lib/api.js';
	import { authStore } from '$lib/stores/auth.js';
	import { goto } from '$app/navigation';
	  import { resolve } from '$app/paths';

	let username = '';
	let password = '';
	let loading = false;
	let errors = { username: '', password: '', general: '' };

	function validate() {
		errors = { username: '', password: '', general: '' };
		let valid = true;
		if (!username.trim()) {
			errors.username = 'Username wajib diisi.';
			valid = false;
		}
		if (!password) {
			errors.password = 'Password wajib diisi.';
			valid = false;
		}
		return valid;
	}

	async function handleLogin() {
		if (!validate()) return;
		loading = true;
		try {
			const data = await authApi.login(username.trim(), password);
			authStore.login(data.token, data.user);
			await goto(resolve('/chat'));
		} catch (err) {
			errors.general = err.message ?? 'Login gagal, coba lagi.';
		} finally {
			loading = false;
		}
	}
</script>

<div class="mx-auto flex w-full max-w-sm flex-col gap-6">
	<div class="text-center">
		<h1 class="text-2xl font-bold tracking-tight text-[#0d0f1e]">Welcome Back</h1>
	</div>

	<div class="flex flex-col gap-3">
		<Input
			id="username"
			name="username"
			type="text"
			placeholder="Enter username"
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
			autocomplete="current-password"
			required
		/>
	</div>

	{#if errors.general}
		<p class="-mt-2 text-center text-xs font-medium text-red-500">{errors.general}</p>
	{/if}

	<Button type="button" variant="primary" fullWidth {loading} on:click={handleLogin}>Login</Button>

	<p class="text-center text-xs leading-relaxed text-gray-500">
		By continuing, you agree to our
		<span class="cursor-pointer underline underline-offset-2 transition-colors hover:text-[#0d0f1e]"
			>Term</span
		>
		and
		<span class="cursor-pointer underline underline-offset-2 transition-colors hover:text-[#0d0f1e]"
			>Privacy Policy</span
		>
	</p>

	<p class="text-center text-sm text-gray-500">
		Don't have an account?
		<button
			type="button"
			on:click={() => goto(resolve('/register'))}
			class="ml-1 font-semibold text-[#0d0f1e] underline underline-offset-2 transition-opacity hover:opacity-70"
		>
			Sign up
		</button>
	</p>
</div>
