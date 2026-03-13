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
</script>

<div class="flex items-end gap-3 rounded-2xl border border-gray-200 bg-white px-4 py-3 shadow-sm">
	<textarea
		bind:value
		{disabled}
		{placeholder}
		rows="1"
		on:keydown={handleKeydown}
		on:input={handleInput}
		class="max-h-[120px] min-h-[24px] flex-1 resize-none bg-transparent
           text-sm leading-relaxed text-[#0d0f1e]
           placeholder:text-gray-400 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
	></textarea>

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
		<svg class="h-4 w-4 translate-x-[1px]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
			<path
				stroke-linecap="round"
				stroke-linejoin="round"
				stroke-width="2"
				d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
			/>
		</svg>
	</button>
</div>
