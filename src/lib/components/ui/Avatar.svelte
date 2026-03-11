<script>
	export let name = '';
	export let size = 'md';
	export let online = false;
	export let src = null; // URL atau base64 foto

	const sizes = {
		xs: 'w-6 h-6 text-[9px]',
		sm: 'w-8 h-8 text-xs',
		md: 'w-9 h-9 text-sm',
		lg: 'w-12 h-12 text-base',
		xl: 'w-20 h-20 text-2xl'
	};

	const dotSizes = {
		xs: 'w-1.5 h-1.5',
		sm: 'w-2 h-2',
		md: 'w-2.5 h-2.5',
		lg: 'w-3 h-3',
		xl: 'w-4 h-4'
	};

	const colors = [
		'bg-rose-400',
		'bg-pink-400',
		'bg-fuchsia-400',
		'bg-violet-400',
		'bg-indigo-400',
		'bg-blue-400',
		'bg-cyan-400',
		'bg-teal-400',
		'bg-emerald-400',
		'bg-green-400',
		'bg-lime-400',
		'bg-amber-400'
	];

	$: initial = name ? name.charAt(0).toUpperCase() : '?';
	$: colorIndex = name
		? name.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0) % colors.length
		: 0;
	$: bgColor = colors[colorIndex];
</script>

<div class="relative inline-block shrink-0">
	{#if src}
		<img {src} alt={name} class="rounded-full object-cover {sizes[size] ?? sizes.md}" />
	{:else}
		<div
			class="flex items-center justify-center rounded-full font-semibold text-white
                {sizes[size] ?? sizes.md} {bgColor}"
		>
			{initial}
		</div>
	{/if}

	{#if online}
		<span
			class="absolute right-0 bottom-0 {dotSizes[size] ?? dotSizes.md}
                 rounded-full bg-emerald-400 ring-2 ring-white"
		></span>
	{/if}
</div>
