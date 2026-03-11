<script>
	export let type = 'button';
	export let variant = 'primary'; // primary | secondary | ghost
	export let size = 'md'; // sm | md | lg
	export let disabled = false;
	export let loading = false;
	export let fullWidth = false;

	const variants = {
		primary: 'bg-[#0d0f1e] text-white hover:bg-[#1a1d33] active:scale-[0.98]',
		secondary:
			'bg-white text-[#0d0f1e] border border-[#0d0f1e] hover:bg-gray-50 active:scale-[0.98]',
		ghost: 'bg-transparent text-[#0d0f1e] hover:bg-gray-100 active:scale-[0.98]'
	};

	const sizes = {
		sm: 'px-4 py-2 text-sm',
		md: 'px-6 py-3 text-base',
		lg: 'px-8 py-4 text-lg'
	};
</script>

<button
	{type}
	{disabled}
	class="
    {variants[variant]}
    {sizes[size]}
    {fullWidth ? 'w-full' : ''}
    cursor-pointer rounded-full font-semibold
    tracking-wide transition-all duration-200
    ease-out select-none focus:ring-2
    focus:ring-[#0d0f1e] focus:ring-offset-2 focus:outline-none disabled:cursor-not-allowed
    disabled:opacity-50 disabled:active:scale-100
  "
	on:click
	{...$$restProps}
>
	{#if loading}
		<span class="inline-flex items-center gap-2">
			<svg class="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
				<circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
				<path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
			</svg>
			Loading...
		</span>
	{:else}
		<slot />
	{/if}
</button>
