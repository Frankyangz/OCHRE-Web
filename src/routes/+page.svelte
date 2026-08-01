<script lang="ts">
	import DispersalMap from '$lib/components/DispersalMap.svelte';
	import Seo from '$lib/components/Seo.svelte';
	import {
		EMPTY,
		SORT_OPTIONS,
		displayField,
		isUncertain,
		searchHaystack,
		sortEntries,
		spellOut,
		type CatalogueEntry,
		type SortKey
	} from '$lib/catalogue';
	import { formatDistance } from '$lib/geo';

	let { data } = $props();

	const catalogue = $derived(data.catalogue);
	const entries = $derived(catalogue.entries);

	let search = $state('');
	let sortKey = $state<SortKey>('distance');
	let activeFacets = $state<Record<string, string[]>>({});
	let hovered = $state<string | null>(null);
	let selected = $state<string | null>(null);

	/* ---------------------------------------------------------------- framing */

	// Script and Language are near-constant across the set, so they are stated
	// once as context rather than offered as filters that would do nothing.
	const constants = $derived.by(() => {
		const result: Array<{ label: string; value: string; of: number }> = [];
		for (const label of ['Script', 'Language']) {
			const values = new Set(entries.map((e) => e.fields[label]).filter(Boolean));
			if (values.size === 1) {
				const value = [...values][0]!;
				result.push({
					label,
					value,
					of: entries.filter((e) => e.fields[label] === value).length
				});
			}
		}
		return result;
	});

	const findspotCount = $derived(new Set(entries.map((e) => e.findspot).filter(Boolean)).size);

	const range = $derived.by(() => {
		const distances = entries
			.map((e) => e.distanceKm)
			.filter((d): d is number => d !== null)
			.sort((a, b) => a - b);
		return distances.length
			? { nearest: distances[0]!, furthest: distances[distances.length - 1]! }
			: null;
	});

	const furthest = $derived(
		range ? (entries.find((e) => e.distanceKm === range.furthest) ?? null) : null
	);

	/* --------------------------------------------------------------- filtering */

	const needle = $derived(search.trim().toLowerCase());

	/**
	 * Whether an entry survives the current filters.
	 *
	 * `ignore` lets the facet counts ask "how many would this chip leave?"
	 * without the chip's own facet filtering the answer down to itself.
	 */
	function matches(entry: CatalogueEntry, ignore?: string): boolean {
		for (const [label, values] of Object.entries(activeFacets)) {
			if (label === ignore) continue;
			if (values.length && !values.includes(entry.fields[label] ?? '')) return false;
		}
		return needle === '' || searchHaystack(entry).includes(needle);
	}

	const filtered = $derived(
		sortEntries(
			entries.filter((entry) => matches(entry)),
			sortKey
		)
	);

	const activeCount = $derived(Object.values(activeFacets).flat().length);
	const isFiltered = $derived(activeCount > 0 || needle !== '');

	function toggleFacet(label: string, value: string) {
		const current = activeFacets[label] ?? [];
		const next = current.includes(value) ? current.filter((v) => v !== value) : [...current, value];
		activeFacets = { ...activeFacets, [label]: next };
	}

	function facetActive(label: string, value: string) {
		return (activeFacets[label] ?? []).includes(value);
	}

	function clearAll() {
		activeFacets = {};
		search = '';
	}

	/** How many results a facet value would leave, given the other filters. */
	function facetYield(label: string, value: string): number {
		return entries.filter((entry) => entry.fields[label] === value && matches(entry, label)).length;
	}

	/* ------------------------------------------------------------ map ↔ table */

	function selectFromMap(uuid: string) {
		selected = uuid;
		document.getElementById(`row-${uuid}`)?.scrollIntoView({ block: 'center', behavior: 'smooth' });
	}

	function describe(entry: CatalogueEntry): string {
		return [entry.fields['Object type'], entry.fields['Material']].filter(Boolean).join(', ');
	}
</script>

<Seo
	title="What left Ugarit — {entries.length} finds beyond the kingdom"
	description={range
		? `${entries.length} objects inscribed in the Ugaritic alphabet, excavated outside the kingdom — from ${formatDistance(range.nearest)} to ${formatDistance(range.furthest)} from the capital. Mapped and catalogued from OCHRE.`
		: `${entries.length} objects inscribed in the Ugaritic alphabet, excavated outside the kingdom of Ugarit.`}
/>

<!-- Hero ------------------------------------------------------------------ -->
<section class="shell pt-14 pb-10 sm:pt-20">
	<p class="label mb-5">Ras Shamra Tablet Inventory · Set {catalogue.uuid.slice(0, 8)}</p>

	<div class="grid gap-x-16 gap-y-8 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]">
		<h1 class="display-lg text-balance">
			What left<br />Ugarit
		</h1>

		<div class="flex flex-col justify-end gap-6">
			<p class="prose-note max-w-lg text-base!">
				Scribes at Ugarit wrote with a thirty-sign cuneiform alphabet, among the earliest known.
				This set collects what turned up elsewhere: {spellOut(entries.length)} inscribed objects,
				<em class="text-ink not-italic">none of them found in the kingdom</em>.
				{#if furthest && range}
					The furthest is {formatDistance(range.furthest)} west — an ivory rod in a palace workshop on
					the lower citadel at {furthest.findspot}.
				{/if}
			</p>

			<dl class="border-rule flex flex-wrap gap-x-10 gap-y-4 border-t pt-5">
				<div>
					<dt class="label mb-1">Finds</dt>
					<dd class="datum text-lg!">{catalogue.entries.length}</dd>
				</div>
				<div>
					<dt class="label mb-1">Findspots</dt>
					<dd class="datum text-lg!">{findspotCount}</dd>
				</div>
				{#each constants as constant (constant.label)}
					<div>
						<dt class="label mb-1">{constant.label}</dt>
						<dd class="datum text-lg!">
							{constant.value}
							<span class="text-ink-muted text-xs!">·{constant.of}/{entries.length}</span>
						</dd>
					</div>
				{/each}
			</dl>
		</div>
	</div>
</section>

<!-- Map ------------------------------------------------------------------- -->
<section class="shell">
	<div class="border-rule-strong overflow-hidden rounded-lg border">
		<div class="h-[22rem] w-full sm:h-[clamp(26rem,58vh,40rem)]">
			<DispersalMap {entries} bind:hovered bind:selected onselect={selectFromMap} />
		</div>
	</div>
	<p class="prose-note mt-3 text-[0.78rem]!">
		Ugarit is marked but empty: every object here was found somewhere else. Rings show great-circle
		distance from the capital.
	</p>
</section>

<!-- The outlier ----------------------------------------------------------- -->
{#if furthest}
	<!--
		Eleven objects rendered identically say nothing about which of them
		matters. This one is three times further out than anything else, so it
		is the single place the grid is allowed to break.
	-->
	<section class="shell pt-20">
		<a href="/{furthest.uuid}" class="feature">
			{#if furthest.imageUrl}
				<img
					src={furthest.imageUrl}
					alt="Archive photograph of {furthest.label}"
					class="feature-image"
					loading="lazy"
					decoding="async"
				/>
			{/if}
			<div class="feature-body">
				<p class="label">The furthest find</p>
				<p class="feature-distance">{formatDistance(furthest.distanceKm ?? 0)}</p>
				<p class="feature-name">{furthest.label}</p>
				{#if furthest.description}
					<p class="prose-note max-w-md">{furthest.description}</p>
				{/if}
				<p class="label">
					{furthest.findspot} · {furthest.compass} of Ugarit · read the record →
				</p>
			</div>
		</a>
	</section>
{/if}

<!-- Controls -------------------------------------------------------------- -->
<section id="catalogue" class="shell scroll-mt-16 pt-16">
	<div class="mb-6 flex flex-wrap items-end justify-between gap-x-8 gap-y-4">
		<h2 class="display-md">Outward from Ugarit</h2>

		<div class="flex flex-wrap items-center gap-3">
			<label class="relative">
				<span class="sr-only">Search the catalogue</span>
				<input
					type="search"
					bind:value={search}
					placeholder="Search names, findspots, publications…"
					class="border-rule bg-surface placeholder:text-ink-muted focus:border-lapis h-9 w-64 rounded-sm border pr-3 pl-8 text-sm focus:outline-none"
				/>
				<svg
					class="text-ink-muted pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					stroke-width="2"
				>
					<circle cx="11" cy="11" r="7" />
					<path d="m20 20-3.5-3.5" stroke-linecap="round" />
				</svg>
			</label>

			<label class="flex items-center gap-2">
				<span class="label">Sort</span>
				<select
					bind:value={sortKey}
					class="border-rule bg-surface focus:border-lapis h-9 rounded-sm border px-2 text-sm focus:outline-none"
				>
					{#each SORT_OPTIONS as option (option.key)}
						<option value={option.key}>{option.label}</option>
					{/each}
				</select>
			</label>
		</div>
	</div>

	<!-- Facets -->
	<div class="border-rule mb-5 flex flex-col gap-3 border-y py-4">
		{#each catalogue.facets as facet (facet.label)}
			<div class="flex flex-wrap items-baseline gap-x-3 gap-y-2">
				<span class="label w-24 shrink-0">{facet.label}</span>
				{#each facet.values as option (option.value)}
					{@const count = facetYield(facet.label, option.value)}
					{@const on = facetActive(facet.label, option.value)}
					<button
						type="button"
						onclick={() => toggleFacet(facet.label, option.value)}
						aria-pressed={on}
						disabled={count === 0 && !on}
						class="chip"
						class:chip-on={on}
					>
						{#if on}<span class="wedge chip-wedge"></span>{/if}
						{option.value}
						<span class="chip-count">{count}</span>
					</button>
				{/each}
			</div>
		{/each}

		<div class="flex items-center gap-4">
			<p class="label tracking-normal! normal-case!">
				Showing {filtered.length} of {entries.length}
			</p>
			{#if isFiltered}
				<button type="button" onclick={clearAll} class="label text-lapis! hover:underline">
					Clear
				</button>
			{/if}
		</div>
	</div>
</section>

<!-- Catalogue ------------------------------------------------------------- -->
<section class="shell">
	{#if filtered.length === 0}
		<div class="border-rule-strong border border-dashed px-6 py-16 text-center">
			<p class="display-sm mb-2">No finds match those filters</p>
			<p class="prose-note mx-auto max-w-sm">
				Try removing a filter, or search for a site name such as Sarepta or Tiryns.
			</p>
			<button type="button" onclick={clearAll} class="label text-lapis! mt-5 hover:underline">
				Clear all filters
			</button>
		</div>
	{:else}
		<!-- Desktop: a table, because these rows are meant to be compared. -->
		<table class="hidden w-full border-collapse md:table">
			<thead>
				<tr class="border-rule-strong border-b text-left">
					<th class="label py-2.5 pr-4 font-normal">Find</th>
					<th class="label py-2.5 pr-4 font-normal">Object</th>
					<th class="label py-2.5 pr-4 font-normal">Findspot</th>
					<th class="label py-2.5 pr-4 font-normal">KTU</th>
					<th class="label py-2.5 pr-4 text-right font-normal">From Ugarit</th>
				</tr>
			</thead>
			<tbody>
				{#each filtered as entry (entry.uuid)}
					<tr
						id="row-{entry.uuid}"
						class="row"
						class:row-on={hovered === entry.uuid || selected === entry.uuid}
						onmouseenter={() => (hovered = entry.uuid)}
						onmouseleave={() => (hovered = null)}
					>
						<td class="py-3 pr-4 align-top">
							<a href="/{entry.uuid}" class="row-link">
								<span class="wedge row-wedge"></span>
								<span>
									<span class="row-name">
										{entry.label}
										<!-- Notes are the most interesting thing on an object page, so
										     say from the index which records have one. -->
										{#if entry.notes.length}
											<span class="annotated">
												{entry.notes.length}
												{entry.notes.length === 1 ? 'note' : 'notes'}
											</span>
										{/if}
									</span>
									{#if entry.description}
										<span class="row-desc">{entry.description}</span>
									{/if}
								</span>
							</a>
						</td>
						<td class="py-3 pr-4 align-top text-sm">
							{displayField(entry, 'Object type')}{#if isUncertain(entry, 'Object type')}<abbr
									class="uncertain"
									title="Identification recorded as uncertain">?</abbr
								>{/if}
							{#if entry.fields['Material']}
								<span class="text-ink-muted">· {entry.fields['Material']}</span>
							{/if}
						</td>
						<td class="py-3 pr-4 align-top text-sm">{entry.findspot ?? EMPTY}</td>
						<td class="datum text-ink-muted! py-3 pr-4 align-top">
							{displayField(entry, 'KTU')}
						</td>
						<td class="datum py-3 text-right align-top whitespace-nowrap">
							{entry.distanceKm !== null ? formatDistance(entry.distanceKm) : EMPTY}
							<span class="text-ink-muted ml-1.5 text-[0.65rem] tracking-widest">
								{entry.compass ?? ''}
							</span>
						</td>
					</tr>
				{/each}
			</tbody>
		</table>

		<!-- Mobile: the same rows as cards. -->
		<ul class="bg-rule flex flex-col gap-px md:hidden">
			{#each filtered as entry (entry.uuid)}
				<li>
					<a href="/{entry.uuid}" class="card">
						<span class="flex items-baseline justify-between gap-3">
							<span class="row-name">{entry.label}</span>
							<span class="datum text-ink-muted shrink-0">
								{entry.distanceKm !== null ? formatDistance(entry.distanceKm) : EMPTY}
							</span>
						</span>
						<span class="text-ink-muted mt-1 block text-sm">
							{describe(entry) || EMPTY} · {entry.findspot ?? EMPTY}
						</span>
					</a>
				</li>
			{/each}
		</ul>
	{/if}

	<p class="label mt-8">
		Read from OCHRE {new Date(catalogue.fetchedAt).toLocaleString('en-GB', {
			dateStyle: 'medium',
			timeStyle: 'short',
			timeZone: 'UTC'
		})} UTC
	</p>
</section>

<style>
	/* Facet chips ---------------------------------------------------------- */
	.chip {
		display: inline-flex;
		align-items: center;
		gap: 0.4rem;
		padding: 0.2rem 0.6rem;
		border: 1px solid var(--rule);
		border-radius: 9999px;
		background: var(--surface);
		font-size: 0.8125rem;
		line-height: 1.4;
		transition:
			border-color 140ms ease,
			background 140ms ease,
			color 140ms ease;
	}

	.chip:hover:not(:disabled) {
		border-color: var(--rule-strong);
	}

	.chip:disabled {
		opacity: 0.4;
		cursor: not-allowed;
	}

	.chip-on {
		border-color: var(--lapis);
		background: var(--lapis-wash);
		color: var(--lapis);
	}

	.chip-wedge {
		width: 5px;
		height: 15px;
		background: var(--lapis);
	}

	.chip-count {
		font-family: var(--font-mono);
		font-size: 0.65rem;
		color: var(--ink-muted);
		font-variant-numeric: tabular-nums;
	}

	.chip-on .chip-count {
		color: var(--lapis);
	}

	/* Table ---------------------------------------------------------------- */
	.row {
		border-bottom: 1px solid var(--rule);
		transition: background 130ms ease;
	}

	.row-on {
		background: var(--lapis-wash);
	}

	.row-link {
		display: flex;
		align-items: baseline;
		gap: 0.6rem;
	}

	.row-wedge {
		flex-shrink: 0;
		width: 5px;
		height: 16px;
		translate: 0 3px;
		background: var(--rule-strong);
		transition: background 130ms ease;
	}

	.row-on .row-wedge,
	.row-link:hover .row-wedge {
		background: var(--lapis);
	}

	.row-name {
		display: block;
		font-size: 0.95rem;
		font-weight: 500;
		text-decoration: underline;
		text-decoration-color: transparent;
		text-underline-offset: 3px;
		transition: text-decoration-color 140ms ease;
	}

	.row-link:hover .row-name {
		text-decoration-color: var(--lapis);
	}

	.row-desc {
		display: block;
		margin-top: 0.15rem;
		max-width: 42ch;
		font-size: 0.78rem;
		line-height: 1.45;
		color: var(--ink-muted);
	}

	/* Featured find --------------------------------------------------------- */
	.feature {
		display: grid;
		gap: 2rem;
		align-items: center;
		padding: 1.75rem 0;
		border-top: 1px solid var(--rule-strong);
		border-bottom: 1px solid var(--rule-strong);
		transition: background 160ms ease;
	}

	@media (min-width: 900px) {
		.feature {
			/* Deliberately lopsided: the image takes the larger share and the
			   text hangs off it, so this block cannot be mistaken for a row. */
			grid-template-columns: minmax(0, 1.35fr) minmax(0, 1fr);
			gap: 3.5rem;
		}
	}

	.feature:hover {
		background: var(--lapis-wash);
	}

	.feature-image {
		width: 100%;
		/* OCHRE only publishes a ~430 px preview of each plate, so the display
		   size is capped at roughly its native width. Scaling it up to fill the
		   column just renders the softness larger. */
		max-width: 27rem;
		max-height: 24rem;
		object-fit: contain;
		object-position: left center;
		border: 1px solid var(--rule);
		background: white;
	}

	.feature-body {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.feature-distance {
		font-family: var(--font-display);
		font-variation-settings:
			'SOFT' 0,
			'WONK' 1,
			'opsz' 144;
		font-weight: 600;
		font-size: clamp(2.6rem, 6vw, 4.25rem);
		line-height: 0.95;
		letter-spacing: -0.03em;
		color: var(--lapis);
	}

	.feature-name {
		font-size: 1.05rem;
		font-weight: 500;
	}

	/* Row annotation -------------------------------------------------------- */
	.annotated {
		margin-left: 0.5rem;
		padding: 0.05rem 0.35rem;
		border: 1px solid var(--rule-strong);
		border-radius: 2px;
		font-family: var(--font-mono);
		font-size: 0.6rem;
		font-weight: 500;
		letter-spacing: 0.08em;
		text-transform: uppercase;
		color: var(--ink-muted);
		white-space: nowrap;
		vertical-align: 1px;
	}

	.row-on .annotated,
	.row-link:hover .annotated {
		border-color: var(--lapis);
		color: var(--lapis);
	}

	/* Cards ---------------------------------------------------------------- */
	.card {
		display: block;
		padding: 0.9rem 0.25rem;
		background: var(--ground);
	}

	.card:hover {
		background: var(--lapis-wash);
	}
</style>
