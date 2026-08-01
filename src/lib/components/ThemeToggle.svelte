<script lang="ts">
	import { onMount } from 'svelte';

	type Theme = 'light' | 'dark';

	let theme = $state<Theme>('light');

	// The pre-paint script in app.html has already set the class; read it back
	// rather than deciding again, so the button never disagrees with the page.
	onMount(() => {
		theme = document.documentElement.classList.contains('dark') ? 'dark' : 'light';
	});

	function toggle() {
		theme = theme === 'dark' ? 'light' : 'dark';
		document.documentElement.classList.toggle('dark', theme === 'dark');
		try {
			localStorage.setItem('theme', theme);
		} catch {
			/* private mode — the choice just won't persist */
		}
	}
</script>

<button
	type="button"
	onclick={toggle}
	class="border-rule text-ink-muted hover:border-rule-strong hover:text-ink grid size-8 place-items-center rounded-sm border transition-colors"
	aria-label="Switch to {theme === 'dark' ? 'light' : 'dark'} theme"
>
	{#if theme === 'dark'}
		<svg viewBox="0 0 24 24" class="size-4" fill="none" stroke="currentColor" stroke-width="1.6">
			<circle cx="12" cy="12" r="4.2" />
			<path
				d="M12 2.6v2.2M12 19.2v2.2M2.6 12h2.2M19.2 12h2.2M5.4 5.4l1.6 1.6M17 17l1.6 1.6M18.6 5.4L17 7M7 17l-1.6 1.6"
				stroke-linecap="round"
			/>
		</svg>
	{:else}
		<svg viewBox="0 0 24 24" class="size-4" fill="none" stroke="currentColor" stroke-width="1.6">
			<path d="M20 14.2A8.2 8.2 0 1 1 9.8 4a6.6 6.6 0 0 0 10.2 10.2Z" stroke-linejoin="round" />
		</svg>
	{/if}
</button>
