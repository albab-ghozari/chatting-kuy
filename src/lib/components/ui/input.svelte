<script>
	export let type = 'text';
	export let placeholder = '';
	export let value = '';
	export let label = '';
	export let id = '';
	export let name = '';
	export let error = '';
	export let disabled = false;
	export let required = false;
	export let autocomplete = '';

	// Toggle password 
	let showPassword = false;
	$: inputType = type === 'password' ? (showPassword ? 'text' : 'password') : type;
</script>

<div class="flex w-full flex-col gap-1">
	{#if label}
		<label for={id} class="text-sm font-medium text-gray-700">
			{label}
			{#if required}<span class="ml-0.5 text-red-500">*</span>{/if}
		</label>
	{/if}

	<div class="relative">
		<input
			{id}
			{name}
			{placeholder}
			{disabled}
			{required}
			{autocomplete}
			type={inputType}
			bind:value
			on:input
			on:blur
			on:focus
			class="
        w-full rounded-xl border px-4
        py-3 {error ? 'border-red-400 bg-red-50' : 'border-gray-200 bg-white'}
        text-sm text-[#0d0f1e] transition-all
        duration-200 placeholder:text-gray-400
        focus:ring-2 focus:outline-none {error
				? 'focus:ring-red-300'
				: 'focus:ring-[#0d0f1e]/20'} focus:border-[#0d0f1e]
        disabled:cursor-not-allowed disabled:opacity-50
        {type === 'password' ? 'pr-11' : ''}
      "
			{...$$restProps}
		/>

		{#if type === 'password'}
			<button
				type="button"
				tabindex="-1"
				class="absolute top-1/2 right-3 -translate-y-1/2 text-gray-400 transition-colors hover:text-gray-600 focus:outline-none"
				on:click={() => (showPassword = !showPassword)}
				aria-label={showPassword ? 'Hide password' : 'Show password'}
			>
				{#if showPassword}
					<!-- Eye Off -->
					<svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="1.8"
							d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7
                 a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243
                 M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29
                 M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7
                 a10.025 10.025 0 01-4.132 5.411m0 0L21 21"
						/>
					</svg>
				{:else}
					<!-- Eye -->
					<svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="1.8"
							d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
						/>
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="1.8"
							d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7
                 -1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
						/>
					</svg>
				{/if}
			</button>
		{/if}
	</div>

	{#if error}
		<p class="mt-0.5 flex items-center gap-1 text-xs text-red-500">
			<svg class="h-3.5 w-3.5 shrink-0" fill="currentColor" viewBox="0 0 20 20">
				<path
					fill-rule="evenodd"
					d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
					clip-rule="evenodd"
				/>
			</svg>
			{error}
		</p>
	{/if}
</div>
