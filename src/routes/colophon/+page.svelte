<script lang="ts">
	import Seo from '$lib/components/Seo.svelte';
	import { AUTHOR } from '$lib/site';
</script>

<Seo
	title="Colophon — What left Ugarit"
	description="How this catalogue was built: what the OCHRE data turned out to be like, why the map has no modern borders, and the decisions behind the typography."
/>

<article class="shell pt-10 pb-4">
	<nav aria-label="Breadcrumb" class="mb-8 flex flex-wrap items-center gap-x-2 gap-y-1">
		<a href="/" class="label transition-colors hover:text-lapis!">Catalogue</a>
		<span class="label text-rule-strong!" aria-hidden="true">/</span>
		<span class="label text-ink!">Colophon</span>
	</nav>

	<header class="mb-14 max-w-2xl">
		<p class="label mb-4">Colophon</p>
		<h1 class="display-md text-balance">Notes on building this</h1>
		<p class="prose-note mt-5 text-base!">
			I'm {AUTHOR.name}. I built this to see what it takes to make an archaeological data set
			readable — not just queryable. The records come from OCHRE at the University of Chicago and
			are read live; nothing here is transcribed or checked in. What follows is what I ran into.
		</p>
	</header>

	<div class="grid gap-x-16 gap-y-12 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)]">
		<div class="flex flex-col gap-10">
			<section>
				<h2 class="display-sm mb-3">The two records are not the same record</h2>
				<p class="prose">
					OCHRE will give you a set, and it will give you the items in that set individually. I
					assumed the set endpoint was a summary of the item endpoint. It isn't. The set records
					carry coordinates and the Script and Language properties; the item records carry the
					image, the description, the context path, the notes and the bibliography — and drop the
					coordinates for most objects.
				</p>
				<p class="prose">
					Neither is a superset of the other. Read only the set and you get a map with no
					scholarship attached; read only the items and half the pins disappear. The catalogue
					merges both, which is also why it makes twelve upstream requests instead of one.
				</p>
			</section>

			<section>
				<h2 class="display-sm mb-3">The notes were the point</h2>
				<p class="prose">
					The first version of this site rendered a table of property values and nothing else. But
					four of these eleven records carry notes written by people — an accession number from
					the Israel Museum, a remark signed by Miller C. Prosser in June 2014 pointing at other
					tablets found at Tell Nebi Mend and never read.
				</p>
				<p class="prose">
					That is the most interesting material in the data set and it was being thrown away
					because it lives on <code>observations[].notes</code> rather than on the object. Object
					pages now show it in reading type, with whoever wrote it and when.
				</p>
			</section>

			<section>
				<h2 class="display-sm mb-3">Modern borders are an anachronism here</h2>
				<p class="prose">
					The basemap is stripped to land, sea and rivers. Motorways and national boundaries are
					noise on a map of the Late Bronze Age — worse than noise, they imply a political
					geography that did not exist. What's left is the coastline, which is the thing that
					actually shaped how these objects moved.
				</p>
				<p class="prose">
					Ugarit is drawn as an empty ring. The set is defined by exclusion — every object in it
					was found somewhere that is not Ugarit — so distance from the capital is the default
					sort and a column in its own right, and the one place with nothing to show is the centre
					of the map.
				</p>
			</section>

			<section>
				<h2 class="display-sm mb-3">A filter that filters nothing is not a filter</h2>
				<p class="prose">
					Script is “Alphabetic” and Language is “Ugaritic” for almost every object here. Offering
					those as filter chips would be offering controls that cannot change the result, so
					they're stated once in the header as context instead. Only properties with more than one
					distinct value become facets, and each chip shows how many results it would actually
					leave.
				</p>
				<p class="prose">
					Where an excavator recorded an identification as uncertain, OCHRE flags it on the value.
					That flag is carried through rather than flattened away — the small ochre marks on the
					object pages are theirs, not mine.
				</p>
			</section>
		</div>

		<aside class="flex flex-col gap-10">
			<section>
				<h2 class="label mb-3 border-b border-rule pb-2">Type</h2>
				<dl class="flex flex-col">
					<div class="row">
						<dt class="row-key">Display</dt>
						<dd class="row-value">Fraunces, with its wonk and soft axes set for incised terminals</dd>
					</div>
					<div class="row">
						<dt class="row-key">Text</dt>
						<dd class="row-value">Instrument Sans</dd>
					</div>
					<div class="row">
						<dt class="row-key">Data</dt>
						<dd class="row-value">JetBrains Mono, for anything read down a column</dd>
					</div>
				</dl>
			</section>

			<section>
				<h2 class="label mb-3 border-b border-rule pb-2">The mark</h2>
				<p class="prose-note">
					The wedge used for the map markers, the filter bullets and the logo is
					<i>gamla</i>, a letter of the Ugaritic alphabet — one impression of a triangular stylus
					in clay. I drew it after rendering the Unicode block to look at the real letterforms;
					the first two attempts were triangles pretending to be wedges, and the giveaway was the
					proportion. Real Ugaritic wedges are slivers, about one to five.
				</p>
			</section>

			<section>
				<h2 class="label mb-3 border-b border-rule pb-2">Built with</h2>
				<dl class="flex flex-col">
					<div class="row">
						<dt class="row-key">Framework</dt>
						<dd class="row-value">SvelteKit, Svelte 5</dd>
					</div>
					<div class="row">
						<dt class="row-key">Map</dt>
						<dd class="row-value">MapLibre GL over a CARTO basemap</dd>
					</div>
					<div class="row">
						<dt class="row-key">Data</dt>
						<dd class="row-value">ochre-sdk against the public OCHRE API</dd>
					</div>
					<div class="row">
						<dt class="row-key">Rendering</dt>
						<dd class="row-value">Prerendered at build; every page is a file on a CDN</dd>
					</div>
				</dl>
				<p class="prose-note mt-4">
					<a href={AUTHOR.repository} rel="noreferrer" target="_blank" class="link">
						Source on GitHub →
					</a>
				</p>
			</section>
		</aside>
	</div>
</article>

<style>
	.prose {
		font-size: 0.95rem;
		line-height: 1.7;
		text-wrap: pretty;
		max-width: 34rem;
	}

	.prose + .prose {
		margin-top: 0.9rem;
	}

	.prose code {
		font-family: var(--font-mono);
		font-size: 0.85em;
		padding: 0.1em 0.3em;
		background: var(--surface);
		border: 1px solid var(--rule);
		border-radius: 2px;
	}

	.row {
		display: grid;
		grid-template-columns: minmax(5rem, 7rem) 1fr;
		gap: 1rem;
		padding: 0.55rem 0;
		border-bottom: 1px solid var(--rule);
		align-items: baseline;
	}

	.row:last-child {
		border-bottom: none;
	}

	.row-key {
		font-family: var(--font-mono);
		font-size: 0.72rem;
		letter-spacing: 0.06em;
		color: var(--ink-muted);
	}

	.row-value {
		font-size: 0.9rem;
		line-height: 1.5;
		text-wrap: pretty;
	}

	.link {
		color: var(--lapis);
		text-decoration: underline;
		text-underline-offset: 3px;
	}
</style>
