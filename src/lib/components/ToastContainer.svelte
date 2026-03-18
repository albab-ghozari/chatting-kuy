<script>
	import { toasts, dismissToast } from '$lib/notification.js';
	import Avatar from '$lib/components/ui/Avatar.svelte';
</script>

<!-- Toast container — pojok kanan bawah -->
<div class="pointer-events-none fixed right-4 bottom-4 z-50 flex flex-col gap-2">
	{#each $toasts as toast (toast.id)}
		<div
			class="animate-slide-in pointer-events-auto flex max-w-[320px] min-w-260px cursor-pointer items-center
             gap-3 rounded-2xl border border-gray-100 bg-white px-4
             py-3 shadow-xl transition-shadow hover:shadow-2xl"
			on:click={() => {
				toast.onClick?.();
				dismissToast(toast.id);
			}}
			role="button"
			tabindex="0"
			on:keydown={(e) => e.key === 'Enter' && toast.onClick?.()}
		>
			<!-- Avatar -->
			<div class="shrink-0">
				<Avatar name={toast.title} src={toast.avatar} size="sm" />
			</div>

			<!-- Konten -->
			<div class="min-w-0 flex-1">
				<p class="truncate text-xs font-bold text-[#0d0f1e]">{toast.title}</p>
				<p class="truncate text-xs text-gray-500">{toast.message}</p>
			</div>

			<!-- Tombol tutup -->
			<button

				class="shrink-0 text-gray-300 transition-colors hover:text-gray-500"
				on:click|stopPropagation={() => dismissToast(toast.id)}
				aria-label="Close notification"
			>
				<svg class="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						stroke-width="2"
						d="M6 18L18 6M6 6l12 12"
					/>
				</svg>
			</button>
		</div>
	{/each}
</div>

<style>
	@keyframes slide-in {
		from {
			opacity: 0;
			transform: translateY(12px);
		}
		to {
			opacity: 1;
			transform: translateY(0);
		}
	}
	.animate-slide-in {
		animation: slide-in 0.25s ease-out both;
	}
</style>
