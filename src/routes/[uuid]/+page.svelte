<script lang="ts">
	import DispersalMap from '$lib/components/DispersalMap.svelte';
	import Seo from '$lib/components/Seo.svelte';
	import { DETAIL_GROUPS, EMPTY } from '$lib/catalogue';
	import { formatCoordinate, formatDistance, UGARIT } from '$lib/geo';

	let { data } = $props();

	const entry = $derived(data.entry);

	// Archive photographs occasionally disappear upstream; drop the figure
	// rather than leaving a broken image in the aside.
	let imageFailed = $state(false);
	$effect(() => {
		entry.uuid;
		imageFailed = false;
	});

	/** Only groups with something in them are rendered. */
	const groups = $derived(
		DETAIL_GROUPS.map((group) => ({
			heading: group.heading,
			rows: group.labels
				.filter((label) => entry.fields[label])
				.map((label) => ({
					label,
					value: entry.fields[label]!,
					uncertain: entry.uncertain.includes(label)
				}))
		})).filter((group) => group.rows.length > 0)
	);

	/** Anything OCHRE returned that no group claims still gets shown. */
	const ungrouped = $derived.by(() => {
		const claimed = new Set(DETAIL_GROUPS.flatMap((group) => group.labels));
		return Object.entries(entry.fields)
			.filter(([label]) => !claimed.has(label))
			.map(([label, value]) => ({ label, value, uncertain: entry.uncertain.includes(label) }));
	});

	/** The trail without the leading "Projects/" segment, which is plumbing. */
	const trail = $derived(
		(entry.displayPath ?? '')
			.split('/')
			.filter(Boolean)
			.filter((segment) => segment !== 'Projects')
	);

	const summary = $derived(
		[entry.fields['Object type'], entry.fields['Material'], entry.findspot]
			.filter(Boolean)
			.join(' · ')
	);
</script>

<Seo
	type="article"
	title="{entry.label} — {entry.findspot ?? 'Beyond Ugarit'}"
	description={[
		entry.description ?? summary,
		entry.distanceKm !== null
			? `Found ${formatDistance(entry.distanceKm)} ${entry.compass ?? ''} of Ugarit.`
			: ''
	]
		.filter(Boolean)
		.join(' ')}
/>

<article class="shell pt-10 pb-4">
	<!-- Trail ------------------------------------------------------------- -->
	<nav aria-label="Breadcrumb" class="mb-8 flex flex-wrap items-center gap-x-2 gap-y-1">
		<a href="/" class="label transition-colors hover:text-lapis!">Catalogue</a>
		{#each trail as segment, index (index)}
			<span class="label text-rule-strong!" aria-hidden="true">/</span>
			<span class="label" class:trail-here={index === trail.length - 1}>{segment}</span>
		{/each}
	</nav>

	<header class="grid gap-x-16 gap-y-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
		<div>
			<p class="label mb-4">
				Find {String(data.position).padStart(2, '0')} of {data.total} · by distance
			</p>
			<h1 class="display-md text-balance">{entry.label}</h1>
			{#if entry.description}
				<p class="prose-note mt-4 max-w-xl text-base!">{entry.description}</p>
			{/if}
		</div>

		<!-- The distance is the fact this catalogue is built on, so it gets the
		     largest type on the page after the object's own name. -->
		<div class="flex flex-col justify-end">
			<div class="flex items-baseline gap-4 border-b border-rule pb-3">
				<p class="display-md text-lapis!">
					{entry.distanceKm !== null ? formatDistance(entry.distanceKm) : EMPTY}
				</p>
				<p class="datum text-ink-muted!">{entry.compass ?? ''}</p>
			</div>
			<p class="label mt-2">
				from Ugarit · {entry.lat !== null && entry.lng !== null
					? formatCoordinate(entry.lat, entry.lng)
					: 'position unrecorded'}
			</p>
		</div>
	</header>
</article>

<div class="shell grid gap-x-16 gap-y-12 pt-10 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
	<!-- Properties ---------------------------------------------------------- -->
	<div class="flex flex-col gap-9">
		{#each groups as group (group.heading)}
			<section>
				<h2 class="label mb-3 border-b border-rule pb-2">{group.heading}</h2>
				<dl class="flex flex-col">
					{#each group.rows as row (row.label)}
						<div class="row">
							<dt class="row-key">{row.label}</dt>
							<dd class="row-value">
								{row.value}{#if row.uncertain}<abbr
										class="uncertain"
										title="Recorded as uncertain">?</abbr
									>{/if}
							</dd>
						</div>
					{/each}
				</dl>
			</section>
		{/each}

		{#if ungrouped.length}
			<section>
				<h2 class="label mb-3 border-b border-rule pb-2">Other recorded fields</h2>
				<dl class="flex flex-col">
					{#each ungrouped as row (row.label)}
						<div class="row">
							<dt class="row-key">{row.label}</dt>
							<dd class="row-value">{row.value}</dd>
						</div>
					{/each}
				</dl>
			</section>
		{/if}

		{#if entry.persistentUrl}
			<section>
				<h2 class="label mb-3 border-b border-rule pb-2">Cite this record</h2>
				<p class="prose-note text-[0.82rem]!">
					{data.projectLabel ?? 'OCHRE'}, “{entry.label}”, in <em>{data.setTitle}</em>.
				</p>
				<a
					href={entry.persistentUrl}
					rel="noreferrer"
					target="_blank"
					class="datum mt-2 inline-block break-all text-lapis! hover:underline"
				>
					{entry.persistentUrl}
				</a>
			</section>
		{/if}
	</div>

	<!-- Aside ---------------------------------------------------------------- -->
	<aside class="flex flex-col gap-8 lg:sticky lg:top-20 lg:self-start">
		{#if entry.imageUrl && !imageFailed}
			<figure>
				<img
					src={entry.imageUrl}
					alt="{entry.label}, photographed for the {data.projectLabel ?? 'OCHRE'} archive"
					class="w-full rounded-sm border border-rule bg-surface"
					loading="lazy"
					decoding="async"
					onerror={() => (imageFailed = true)}
				/>
				<figcaption class="label mt-2">Archive photograph · OCHRE</figcaption>
			</figure>
		{/if}

		{#if entry.lat !== null && entry.lng !== null}
			<figure>
				<div class="h-64 overflow-hidden rounded-sm border border-rule-strong">
					<DispersalMap entries={[entry]} compact />
				</div>
				<figcaption class="label mt-2">
					{entry.findspot ?? 'Findspot'} — {entry.compass ?? ''} of Ugarit ({UGARIT.modernName})
				</figcaption>
			</figure>
		{/if}
	</aside>
</div>

<!-- Neighbours ------------------------------------------------------------- -->
<nav class="shell mt-20" aria-label="Nearby finds">
	<div class="grid gap-px border-t border-rule sm:grid-cols-2">
		{#if data.previous}
			<a href="/{data.previous.uuid}" class="step">
				<span class="label">← Closer to Ugarit</span>
				<span class="step-name">{data.previous.label}</span>
				<span class="datum text-ink-muted!">
					{data.previous.distanceKm !== null
						? formatDistance(data.previous.distanceKm)
						: EMPTY}
				</span>
			</a>
		{:else}
			<div class="step step-empty">
				<span class="label">Closest find in the set</span>
			</div>
		{/if}

		{#if data.next}
			<a href="/{data.next.uuid}" class="step sm:text-right">
				<span class="label">Further out →</span>
				<span class="step-name">{data.next.label}</span>
				<span class="datum text-ink-muted!">
					{data.next.distanceKm !== null ? formatDistance(data.next.distanceKm) : EMPTY}
				</span>
			</a>
		{:else}
			<div class="step step-empty sm:text-right">
				<span class="label">Furthest find in the set</span>
			</div>
		{/if}
	</div>
</nav>

<style>
	/* The last crumb is where you are, so it stops being a muted label. */
	.trail-here {
		color: var(--ink);
	}

	.row {
		display: grid;
		grid-template-columns: minmax(8rem, 12rem) 1fr;
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
		font-size: 0.925rem;
		line-height: 1.5;
		text-wrap: pretty;
	}

	.uncertain {
		margin-left: 0.15rem;
		color: var(--ochre);
		font-size: 0.7rem;
		vertical-align: super;
		text-decoration: none;
		cursor: help;
	}

	.step {
		display: flex;
		flex-direction: column;
		gap: 0.3rem;
		padding: 1.4rem 0.25rem;
		transition: background 140ms ease;
	}

	a.step:hover {
		background: var(--lapis-wash);
	}

	.step-name {
		font-family: var(--font-display);
		font-variation-settings:
			'SOFT' 0,
			'WONK' 1,
			'opsz' 60;
		font-size: 1.15rem;
		letter-spacing: -0.015em;
	}

	.step-empty {
		opacity: 0.5;
	}

	@media (min-width: 640px) {
		.step + .step,
		.step + a.step {
			border-left: 1px solid var(--rule);
			padding-left: 1.4rem;
		}
	}
</style>
