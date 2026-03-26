<script>
	import { createEventDispatcher } from 'svelte';
	import { emitTyping, emitStopTyping } from '$lib/socket.js';

	export let value = '';
	export let disabled = false;
	export let placeholder = 'Tulis pesan...';
	export let conversationId = null;
	export let currentUserId = null;

	const dispatch = createEventDispatcher();
	let typingTimeout;
	let fileInput;
	let uploading = false;

	function handleKeydown(e) {
		if (e.key === 'Enter' && !e.shiftKey) {
			e.preventDefault();
			handleSend();
		}
	}

	function handleInput(e) {
		e.target.style.height = 'auto';
		e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px';
		if (conversationId && currentUserId) {
			emitTyping(conversationId, currentUserId);
			clearTimeout(typingTimeout);
			typingTimeout = setTimeout(() => emitStopTyping(conversationId, currentUserId), 1500);
		}
	}

	function handleSend() {
		const text = value.trim();
		if (!text) return;
		clearTimeout(typingTimeout);
		if (conversationId && currentUserId) emitStopTyping(conversationId, currentUserId);
		dispatch('send', { content: text });
		value = '';
	}

	// ── Kirim foto ────────────────────────────────
	function pickImage() {
		if (disabled || uploading) return;
		fileInput.click();
	}

	async function handleFileChange(e) {
		const file = e.target.files[0];
		if (!file) return;
		// Reset input agar file yang sama bisa dipilih lagi
		e.target.value = '';

		if (!file.type.startsWith('image/')) {
			alert('Hanya file gambar yang didukung');
			return;
		}
		if (file.size > 4 * 1024 * 1024) {
			alert('Ukuran foto maksimal 4MB');
			return;
		}

		uploading = true;
		try {
			const base64 = await new Promise((resolve, reject) => {
				const reader = new FileReader();
				reader.onload = (ev) => resolve(ev.target.result);
				reader.onerror = reject;
				reader.readAsDataURL(file);
			});
			// Kirim dengan prefix [image] agar bisa dibedakan dari teks
			dispatch('send', { content: `[image]${base64}` });
		} catch (err) {
			console.error('Gagal membaca foto:', err);
		} finally {
			uploading = false;
		}
	}
</script>

<!-- Input tersembunyi untuk pilih file -->
<input
	bind:this={fileInput}
	type="file"
	accept="image/*"
	class="hidden"
	on:change={handleFileChange}
/>

<div class="flex items-end gap-2 rounded-2xl border border-gray-200 bg-white px-3 py-3 shadow-sm">
	<!-- Tombol foto -->
	<button
		type="button"
		on:click={pickImage}
		disabled={disabled || uploading}
		class="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600 disabled:cursor-not-allowed disabled:opacity-40"
		aria-label="Kirim foto"
		title="Kirim foto"
	>
		{#if uploading}
			<!-- Loading spinner -->
			<svg class="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
				<circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"
				></circle>
				<path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
				></path>
			</svg>
		{:else}
			<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
				<path
					stroke-linecap="round"
					stroke-linejoin="round"
					stroke-width="2"
					d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
				/>
			</svg>
		{/if}
	</button>

	<!-- Text area -->
	<textarea
		bind:value
		{disabled}
		{placeholder}
		rows="1"
		on:keydown={handleKeydown}
		on:input={handleInput}
		class="max-h-120px min-h-24px flex-1 resize-none bg-transparent py-1
			text-sm leading-relaxed text-[#0d0f1e]
			placeholder:text-gray-400 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
	></textarea>

	<!-- Tombol kirim -->
	<button
		type="button"
		{disabled}
		on:click={handleSend}
		class="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl transition-all duration-200
			{value.trim()
			? 'bg-[#0d0f1e] text-white hover:bg-[#1a1d33] active:scale-95'
			: 'cursor-not-allowed bg-gray-100 text-gray-400'}"
		aria-label="Kirim pesan"
	>
		<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
			<path
				stroke-linecap="round"
				stroke-linejoin="round"
				stroke-width="2"
				d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
			/>
		</svg>
	</button>
</div>
