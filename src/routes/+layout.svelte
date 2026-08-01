<script lang="ts">
	import './layout.css';
	import 'maplibre-gl/dist/maplibre-gl.css';
	import ThemeToggle from '$lib/components/ThemeToggle.svelte';
	import { AUTHOR } from '$lib/site';

	let { children } = $props();
</script>

<a href="#main" class="skip-link">Skip to content</a>

<div class="flex min-h-screen flex-col">
	<header
		class="border-rule bg-ground/85 supports-[backdrop-filter]:bg-ground/70 sticky top-0 z-50 border-b backdrop-blur-md"
	>
		<div class="mx-auto flex h-13 max-w-[92rem] items-center gap-4 px-5 sm:px-8">
			<a href="/" class="group flex items-center gap-2.5 no-underline">
				<span
					class="wedge bg-lapis h-4.5 w-1.5 origin-bottom transition-transform group-hover:scale-110"
				></span>
				<span class="label text-ink!">Ras Shamra Tablet Inventory</span>
			</a>

			<span class="ml-auto flex items-center gap-4">
				<a
					href="https://ochre.lib.uchicago.edu/RSTI/"
					class="label hover:text-lapis! hidden transition-colors sm:inline"
					rel="noreferrer"
					target="_blank"
				>
					Project ↗
				</a>
				<ThemeToggle />
			</span>
		</div>
	</header>

	<!-- The skip link's target has to exist on every page, so it points at the
	     main landmark rather than at any one page's section. -->
	<main id="main" tabindex="-1" class="flex-1 focus:outline-none">
		{@render children()}
	</main>

	<footer class="border-rule mt-24 border-t">
		<div
			class="mx-auto flex max-w-[92rem] flex-col gap-4 px-5 py-8 sm:flex-row sm:items-baseline sm:justify-between sm:px-8"
		>
			<div class="max-w-md">
				<p class="prose-note text-[0.8rem]!">
					Built by <a href="/colophon" class="underlined">{AUTHOR.name}</a>. Data from
					<a href="https://ochre.lib.uchicago.edu/" class="underlined" rel="noreferrer">OCHRE</a>,
					the Online Cultural and Historical Research Environment at the University of Chicago, read
					through the
					<a
						href="https://github.com/uchicago-digitalculture-webdev/ochre-sdk"
						class="underlined"
						rel="noreferrer">ochre-sdk</a
					>.
				</p>
			</div>
			<p class="label flex gap-5">
				<a href="/colophon" class="hover:text-lapis! transition-colors">Colophon</a>
				<a
					href={AUTHOR.repository}
					class="hover:text-lapis! transition-colors"
					rel="noreferrer"
					target="_blank">Source ↗</a
				>
			</p>
		</div>
	</footer>
</div>

<style>
	.skip-link {
		position: absolute;
		left: 0.5rem;
		top: 0.5rem;
		z-index: 100;
		translate: 0 -150%;
		padding: 0.5rem 0.9rem;
		background: var(--lapis);
		color: var(--raised);
		font-size: 0.8rem;
		border-radius: var(--radius);
	}

	.skip-link:focus {
		translate: 0 0;
	}

	.underlined {
		color: var(--ink);
		text-decoration: underline;
		text-decoration-color: var(--rule-strong);
		text-underline-offset: 3px;
		transition: text-decoration-color 150ms ease;
	}

	.underlined:hover {
		text-decoration-color: var(--lapis);
	}
</style>
