<script lang="ts">
	import { MapLibre, GeoJSON, LineLayer, Marker, NavigationControl } from 'svelte-maplibre';
	import type { LayerSpecification, LngLatBoundsLike, Map as MapLibreMap } from 'maplibre-gl';
	import { UGARIT, formatDistance } from '$lib/geo';
	import {
		distanceRings,
		dispersalLines,
		RING_DISTANCES,
		ringLabels,
		spreadOverlaps
	} from '$lib/mapdata';
	import { innerWidth } from 'svelte/reactivity/window';
	import type { CatalogueEntry } from '$lib/catalogue';

	type Props = {
		entries: CatalogueEntry[];
		/** Highlighted from either the map or the table; shared with the parent. */
		hovered?: string | null;
		selected?: string | null;
		onselect?: (uuid: string) => void;
		/** Detail pages reuse this map with a single find and no rings. */
		compact?: boolean;
	};

	let {
		entries,
		hovered = $bindable(null),
		selected = $bindable(null),
		onselect,
		compact = false
	}: Props = $props();

	const located = $derived(entries.filter((entry) => entry.lat !== null && entry.lng !== null));
	const positions = $derived(spreadOverlaps(located));
	const rings = distanceRings();
	const ringMarkers = ringLabels();
	const lines = $derived(dispersalLines(located));

	let map = $state<MapLibreMap | undefined>();
	let styleLoaded = $state(false);

	/**
	 * The basemap is stripped to land, sea, and rivers. Motorways and modern
	 * national borders are anachronisms on a map of the Late Bronze Age, and
	 * removing them leaves the coastline — the thing that actually shaped how
	 * these objects moved — as the only geography on screen.
	 */
	const KEPT_LAYERS = new Set(['background', 'water', 'water_shadow', 'waterway', 'landcover']);

	/** Sources this component owns, as passed to the `GeoJSON` components below. */
	const OWN_SOURCES = new Set(['rings', 'dispersal']);

	// `filterLayers` is applied on every `styledata` event and hides everything it
	// rejects — including layers added by children — so the overlays have to be
	// allowed through explicitly, not just the basemap layers being kept.
	function keepLayer(layer: LayerSpecification): boolean {
		if (KEPT_LAYERS.has(layer.id)) return true;
		return 'source' in layer && OWN_SOURCES.has(layer.source as string);
	}

	// Recolour the survivors into the page's own palette. The sea sits a shade
	// lighter than the land: it was the medium of transmission, not the backdrop.
	$effect(() => {
		if (!map || !styleLoaded) return;
		try {
			map.setPaintProperty('background', 'background-color', '#14120f');
			map.setPaintProperty('landcover', 'fill-color', '#14120f');
			map.setPaintProperty('water', 'fill-color', '#1c2530');
			map.setPaintProperty('waterway', 'line-color', '#243040');
		} catch {
			// A future basemap revision may drop one of these layers; the default
			// styling is an acceptable fallback.
		}
	});

	/** Ugarit is always in frame — the catalogue is defined relative to it. */
	const bounds = $derived.by((): LngLatBoundsLike => {
		const points = [
			[UGARIT.lng, UGARIT.lat] as [number, number],
			...located.map((entry) => [entry.lng!, entry.lat!] as [number, number])
		];

		const lngs = points.map(([lng]) => lng);
		const lats = points.map(([, lat]) => lat);

		return [
			[Math.min(...lngs), Math.min(...lats)],
			[Math.max(...lngs), Math.max(...lats)]
		];
	});

	/**
	 * A phone-width map has no room for a 72px inset: it pushes the fit so far
	 * out that every find collapses into one cluster. Ring labels are dropped at
	 * the same breakpoint, where they would overlap each other and Ugarit.
	 */
	const narrow = $derived((innerWidth.current ?? 1440) < 640);

	const padding = $derived(
		narrow
			? 26
			: compact
				? 64
				: { top: 72, bottom: 88, left: 72, right: 96 }
	);

	const active = $derived(hovered ?? selected);
	const activeEntry = $derived(located.find((entry) => entry.uuid === active) ?? null);

	/** Markers appear in distance order, so the dispersal reads outward. */
	function revealDelay(entry: CatalogueEntry): number {
		const order = [...located]
			.sort((a, b) => (a.distanceKm ?? 0) - (b.distanceKm ?? 0))
			.findIndex((candidate) => candidate.uuid === entry.uuid);
		return 240 + order * 90;
	}
</script>

<div class="relative isolate h-full w-full overflow-hidden bg-abyss">
	<MapLibre
		bind:map
		bind:loaded={styleLoaded}
		class="h-full w-full"
		style="https://basemaps.cartocdn.com/gl/dark-matter-nolabels-gl-style/style.json"
		filterLayers={keepLayer}
		{bounds}
		fitBoundsOptions={{ padding, maxZoom: compact ? 7 : 6.5, animate: false }}
		attributionControl={{ compact: true }}
		cooperativeGestures={!compact}
		dragRotate={false}
		standardControls={false}
	>
		{#if !compact}
			<NavigationControl position="top-right" showCompass={false} />
		{/if}

		{#if !compact}
			<!-- Rings of constant distance from Ugarit. True circles on the sphere,
			     so Mercator renders them as ellipses. -->
			<GeoJSON id="rings" data={rings}>
				<LineLayer
					paint={{
						'line-color': '#c9964a',
						'line-width': 1,
						'line-opacity': 0.5,
						'line-dasharray': [2, 4]
					}}
				/>
			</GeoJSON>
		{/if}

		<GeoJSON id="dispersal" data={lines}>
			<LineLayer
				paint={{
					'line-color': '#8fa8ee',
					'line-width': 1,
					'line-opacity': compact ? 0.6 : 0.42
				}}
			/>
			{#if active}
				<LineLayer
					filter={['==', ['get', 'uuid'], active]}
					paint={{ 'line-color': '#a9beff', 'line-width': 1.75, 'line-opacity': 0.95 }}
				/>
			{/if}
		</GeoJSON>

		{#if !compact && !narrow}
			<!-- Ring distances, set in the page's own mono rather than as basemap
			     labels, so the map's only typography belongs to this catalogue. -->
			{#each ringMarkers.features as ring, index (index)}
				<Marker
					lngLat={ring.geometry.coordinates as [number, number]}
					class="pointer-events-none"
				>
					<span class="ring-label">{ring.properties?.label}</span>
				</Marker>
			{/each}
		{/if}

		<!-- The absent centre: the one place on this map with nothing to show. -->
		<Marker lngLat={[UGARIT.lng, UGARIT.lat]} class="pointer-events-none">
			<div class="ugarit" class:compact class:narrow>
				<span class="ugarit-ring"></span>
				<span class="ugarit-core"></span>
				{#if !compact}
					<span class="ugarit-name">
						Ugarit
						<span class="ugarit-sub">Ras Shamra</span>
					</span>
				{/if}
			</div>
		</Marker>

		{#each located as entry (entry.uuid)}
			{@const isActive = active === entry.uuid}
			<Marker
				lngLat={positions.get(entry.uuid) ?? [entry.lng!, entry.lat!]}
				anchor="bottom"
				asButton
				onclick={() => onselect?.(entry.uuid)}
				onmouseenter={() => (hovered = entry.uuid)}
				onmouseleave={() => (hovered = null)}
				class="find-marker"
			>
				<span
					class="find"
					class:is-active={isActive}
					style="--reveal-delay: {compact ? 0 : revealDelay(entry)}ms"
				>
					<!--
						A cuneiform wedge: the impression a triangular stylus leaves in
						clay, which is the unit every Ugaritic sign is built from. Drawn
						as two facets so it reads as pressed into the surface rather than
						drawn on it. The tail's point marks the findspot.
					-->
					<svg class="find-wedge" viewBox="0 0 12 24" width="13" height="26" aria-hidden="true">
						<path class="facet-lit" d="M0.5 0 H6 V24 Q5.2 8 0.5 0 Z" />
						<path class="facet-shade" d="M6 0 H11.5 Q6.8 8 6 24 Z" />
					</svg>
					<span class="sr-only">
						{entry.label} — {entry.findspot ?? 'unlocated'}
					</span>
				</span>
			</Marker>
		{/each}
	</MapLibre>

	{#if !compact}
		<!-- Readout for the highlighted find, so hovering the table says something
		     on the map without opening a popup. -->
		<div class="readout" aria-live="polite">
			{#if activeEntry}
				<p class="datum readout-distance">
					{activeEntry.distanceKm !== null ? formatDistance(activeEntry.distanceKm) : '—'}
					<span class="readout-compass">{activeEntry.compass ?? ''}</span>
				</p>
				<p class="readout-label">{activeEntry.label}</p>
				<p class="readout-findspot">{activeEntry.findspot ?? ''}</p>
			{:else}
				<p class="readout-hint">
					{located.length} finds · rings at {RING_DISTANCES.map((km) => `${km}`).join(' / ')} km
				</p>
			{/if}
		</div>
	{/if}
</div>

<style>
	/* Ugarit --------------------------------------------------------------- */
	.ugarit {
		position: relative;
		display: grid;
		place-items: center;
		width: 0;
		height: 0;
	}

	.ugarit-ring,
	.ugarit-core {
		position: absolute;
		border-radius: 9999px;
	}

	.ugarit-ring {
		width: 26px;
		height: 26px;
		border: 1px solid oklch(0.72 0.11 71 / 0.75);
	}

	.ugarit-core {
		width: 7px;
		height: 7px;
		border: 1px solid oklch(0.78 0.111 71 / 0.9);
	}

	.ugarit-name {
		position: absolute;
		left: 22px;
		display: flex;
		flex-direction: column;
		font-family: var(--font-mono);
		font-size: 10px;
		font-weight: 500;
		letter-spacing: 0.16em;
		text-transform: uppercase;
		white-space: nowrap;
		color: oklch(0.85 0.09 75);
		text-shadow: 0 1px 3px oklch(0.15 0.015 250 / 0.9);
	}

	.ugarit-sub {
		font-size: 9px;
		letter-spacing: 0.1em;
		text-transform: none;
		opacity: 0.66;
	}

	.ugarit.compact .ugarit-ring {
		width: 18px;
		height: 18px;
	}

	/* Ugarit sits at the eastern edge of the frame, so on a phone the label has
	   to run back into the map rather than off it. */
	.ugarit.narrow .ugarit-name {
		left: auto;
		right: 20px;
		align-items: flex-end;
		text-align: right;
	}

	/* Finds ---------------------------------------------------------------- */
	.find {
		display: block;
		padding: 6px 8px 2px;
		cursor: pointer;
		animation: rise 520ms cubic-bezier(0.16, 1, 0.3, 1) both;
		animation-delay: var(--reveal-delay, 0ms);
	}

	.ring-label {
		display: block;
		padding: 0 0.3rem;
		font-family: var(--font-mono);
		font-size: 9px;
		font-weight: 500;
		letter-spacing: 0.12em;
		white-space: nowrap;
		color: oklch(0.68 0.06 75 / 0.8);
		background: oklch(0.15 0.015 250 / 0.55);
	}

	.find-wedge {
		display: block;
		overflow: visible;
		transform-origin: 50% 100%;
		transition: transform 160ms cubic-bezier(0.16, 1, 0.3, 1);
		filter: drop-shadow(0 1px 2px oklch(0.12 0.02 250 / 0.7));
	}

	/* Two facets, lit from the left, the way a stylus impression catches
	   raking light across a tablet. */
	.facet-lit {
		fill: oklch(0.74 0.13 268);
		transition: fill 160ms ease;
	}

	.facet-shade {
		fill: oklch(0.54 0.16 268);
		transition: fill 160ms ease;
	}

	.find:hover .find-wedge,
	.find.is-active .find-wedge {
		transform: scale(1.28);
	}

	.find:hover .facet-lit,
	.find.is-active .facet-lit {
		fill: oklch(0.92 0.1 90);
	}

	.find:hover .facet-shade,
	.find.is-active .facet-shade {
		fill: oklch(0.68 0.15 70);
	}

	@keyframes rise {
		from {
			opacity: 0;
			transform: translateY(-9px) scale(0.7);
		}
		to {
			opacity: 1;
			transform: none;
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.find {
			animation: none;
		}
	}

	/* Readout -------------------------------------------------------------- */
	.readout {
		position: absolute;
		bottom: 0;
		left: 0;
		z-index: 10;
		min-width: 11rem;
		max-width: min(20rem, 62%);
		padding: 0.6rem 0.85rem 0.7rem;
		background: linear-gradient(
			to top right,
			oklch(0.15 0.015 250 / 0.94),
			oklch(0.15 0.015 250 / 0.72)
		);
		border-top: 1px solid oklch(1 0 0 / 0.09);
		border-right: 1px solid oklch(1 0 0 / 0.09);
		border-top-right-radius: var(--radius);
		pointer-events: none;
	}

	.readout-distance {
		font-size: 1.05rem;
		font-weight: 600;
		color: oklch(0.86 0.1 268);
		letter-spacing: -0.02em;
	}

	.readout-compass {
		margin-left: 0.4rem;
		font-size: 0.7rem;
		letter-spacing: 0.12em;
		color: oklch(0.72 0.05 268);
	}

	.readout-label {
		margin-top: 0.15rem;
		font-size: 0.8rem;
		color: oklch(0.93 0.005 250);
		line-height: 1.3;
	}

	.readout-findspot,
	.readout-hint {
		font-family: var(--font-mono);
		font-size: 0.65rem;
		letter-spacing: 0.1em;
		text-transform: uppercase;
		color: oklch(0.66 0.012 250);
	}

	.readout-findspot {
		margin-top: 0.2rem;
	}
</style>
