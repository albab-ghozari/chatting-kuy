<script>
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { browser } from '$app/environment';
	import { page } from '$app/stores';
	import LoginForm from '$lib/components/LoginForm.svelte';

	let deferredPrompt = null;
	let showInstallBanner = false;
	let isStandalone = false;

	onMount(async () => {
		if (!browser) return;

		// Cek apakah sudah running sebagai PWA (standalone)
		isStandalone =
			window.matchMedia('(display-mode: standalone)').matches ||
			window.navigator.standalone === true;

		// Kalau ada ?force=1 → jangan redirect
		const force = $page.url.searchParams.get('force');
		if (force === '1') return;

		if (localStorage.getItem('token')) {
			await goto('/chat');
			return;
		}

		// Tangkap prompt install PWA
		window.addEventListener('beforeinstallprompt', (e) => {
			e.preventDefault();
			deferredPrompt = e;
			// Tampilkan banner hanya kalau belum install
			if (!isStandalone) showInstallBanner = true;
		});
	});

	async function handleInstall() {
		if (!deferredPrompt) return;
		deferredPrompt.prompt();
		const { outcome } = await deferredPrompt.userChoice;
		if (outcome === 'accepted') showInstallBanner = false;
		deferredPrompt = null;
	}

	function dismissBanner() {
		showInstallBanner = false;
	}
</script>

<svelte:head>
	<title>Login Chatting Kuy</title>
</svelte:head>

<main class="flex min-h-screen w-full flex-col items-center justify-center bg-white px-4">

	<!-- Banner Install PWA -->
	{#if showInstallBanner}
		<div class="animate-fade-in mb-6 w-full max-w-sm">
			<div class="flex items-center gap-3 rounded-2xl border border-gray-100 bg-white p-4 shadow-lg">
				<img src="/apple-touch-icon.png" alt="icon" class="h-12 w-12 rounded-xl" />
				<div class="flex-1 min-w-0">
					<p class="text-sm font-bold text-[#0d0f1e]">Install Chatting Kuy</p>
					<p class="text-xs text-gray-400">Pasang di layar utama untuk pengalaman terbaik</p>
				</div>
				<div class="flex flex-col gap-1.5 shrink-0">
					<button
						onclick={handleInstall}
						class="rounded-xl bg-[#0d0f1e] px-4 py-1.5 text-xs font-semibold text-white transition hover:opacity-80"
					>
						Install
					</button>
					<button
						onclick={dismissBanner}
						class="rounded-xl px-4 py-1.5 text-xs text-gray-400 hover:text-gray-600"
					>
						Nanti
					</button>
				</div>
			</div>
		</div>
	{/if}

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