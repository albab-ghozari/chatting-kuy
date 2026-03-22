<script>
	// Komponen avatar khusus grup — tampilkan grid mini avatar anggota
	export let members = [];
	export let groupAvatar = null;
	export let size = 'sm';

	const sizes = {
		sm: 'w-8 h-8',
		md: 'w-9 h-9',
		lg: 'w-12 h-12',
	};

	const colors = [
		'bg-rose-400', 'bg-pink-400', 'bg-violet-400', 'bg-indigo-400',
		'bg-blue-400', 'bg-cyan-400', 'bg-teal-400', 'bg-emerald-400',
		'bg-green-400', 'bg-amber-400'
	];

	function colorFor(name) {
		if (!name) return colors[0];
		const idx = name.split('').reduce((a, c) => a + c.charCodeAt(0), 0) % colors.length;
		return colors[idx];
	}

	// Ambil maks 4 anggota untuk ditampilkan di grid
	$: preview = members.slice(0, 4);
</script>

<div class="relative shrink-0 {sizes[size] ?? sizes.sm}">
	{#if groupAvatar}
		<img src={groupAvatar} alt="grup" class="rounded-full object-cover w-full h-full" />
	{:else if preview.length <= 1}
		<!-- Satu anggota atau kosong — tampilkan inisial grup -->
		<div class="flex items-center justify-center rounded-full bg-indigo-400 w-full h-full">
			<svg class="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
					d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"
				/>
			</svg>
		</div>
	{:else}
		<!-- Grid 2x2 mini avatar -->
		<div class="grid grid-cols-2 gap-px rounded-full overflow-hidden w-full h-full">
			{#each preview as m}
				{#if m.avatar}
					<img src={m.avatar} alt={m.username} class="w-full h-full object-cover" />
				{:else}
					<div class="flex items-center justify-center {colorFor(m.username)}">
						<span class="text-white font-semibold" style="font-size:7px">
							{(m.username ?? '?').charAt(0).toUpperCase()}
						</span>
					</div>
				{/if}
			{/each}
		</div>
	{/if}
</div>
