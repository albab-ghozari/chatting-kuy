<script>
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { browser } from '$app/environment';
	import { page } from '$app/stores';
	import LoginForm from '$lib/components/LoginForm.svelte';

	onMount(async () => {
		if (!browser) return;

		// Kalau ada ?force=1 → jangan redirect meski sudah login
		// Berguna untuk test multi-akun di browser yang sama
		const force = $page.url.searchParams.get('force');
		if (force === '1') return;

		if (localStorage.getItem('token')) {
			await goto('/chat');
		}
	});
</script>

<svelte:head>
	<title>Login Chatting Kuy</title>
</svelte:head>

<main class="flex min-h-screen w-full items-center justify-center bg-white px-4">
	<div class="animate-fade-in w-full max-w-sm">
		<LoginForm />
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
