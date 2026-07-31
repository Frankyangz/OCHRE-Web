<script lang="ts">
	import { page } from '$app/state';

	const isNotFound = $derived(page.status === 404);
</script>

<svelte:head>
	<title>{page.status} — {isNotFound ? 'Not found' : 'Something went wrong'}</title>
	<meta name="robots" content="noindex" />
</svelte:head>

<section class="mx-auto flex min-h-[60vh] max-w-2xl flex-col justify-center px-5 py-20 sm:px-8">
	<p class="label mb-5">Error {page.status}</p>

	<h1 class="display-md mb-4">
		{#if isNotFound}
			Nothing catalogued here
		{:else}
			The catalogue could not be read
		{/if}
	</h1>

	<p class="prose-note mb-8 max-w-lg text-base!">
		{#if isNotFound}
			{page.error?.message ??
				'That identifier is not in this set. It may belong to another OCHRE project, or the link may be mistyped.'}
		{:else}
			This site reads live from OCHRE at the University of Chicago. The upstream request failed,
			so there is nothing to show. Reloading in a minute usually resolves it.
		{/if}
	</p>

	<div class="flex flex-wrap items-center gap-6 border-t border-rule pt-6">
		<a href="/" class="back">
			<span class="wedge back-wedge"></span>
			Back to the catalogue
		</a>
		{#if !isNotFound}
			<button type="button" onclick={() => location.reload()} class="label text-lapis! hover:underline">
				Try again
			</button>
		{/if}
	</div>
</section>

<style>
	.back {
		display: inline-flex;
		align-items: center;
		gap: 0.55rem;
		font-size: 0.95rem;
		font-weight: 500;
	}

	.back-wedge {
		width: 9px;
		height: 11px;
		background: var(--lapis);
		rotate: -90deg;
		transition: translate 160ms cubic-bezier(0.16, 1, 0.3, 1);
	}

	.back:hover .back-wedge {
		translate: -3px 0;
	}
</style>
