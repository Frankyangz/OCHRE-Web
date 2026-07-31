import { fetchItem, type Property, type SpatialUnit } from 'ochre-sdk';
import { bearingDegrees, compassPoint, haversineKm, UGARIT } from '$lib/geo';
import {
	FACET_LABELS,
	type Catalogue,
	type CatalogueEntry,
	type Citation,
	type Facet,
	type Note,
	type NoteSegment,
	type ObjectImage,
	type ProvenanceEvent
} from '$lib/catalogue';
import { withRetries } from './retry';
import { sanitizeHtml, toPlainText } from './sanitize';

/** "Objects discovered outside the kingdom of Ugarit", in the RSTI project. */
export const SET_UUID = '240e6e06-9d05-4210-aa83-f4190639886d';

type Fetch = typeof globalThis.fetch;

/**
 * The set endpoint returns a thin projection: no images, descriptions, or
 * context paths. Those only exist on the individual item records, so the
 * catalogue is assembled from 11 parallel item reads and memoised — the pages
 * are prerendered, so this runs at build time, not per request.
 */
const CACHE_TTL_MS = 10 * 60 * 1000;

let cache: { value: Catalogue; expires: number } | null = null;

export async function loadCatalogue(fetch: Fetch): Promise<Catalogue> {
	if (cache && cache.expires > Date.now()) {
		return cache.value;
	}

	const catalogue = await buildCatalogue(withRetries(fetch));
	cache = { value: catalogue, expires: Date.now() + CACHE_TTL_MS };
	return catalogue;
}

async function buildCatalogue(fetch: Fetch): Promise<Catalogue> {
	const { error, item: set } = await fetchItem(SET_UUID, 'set', ['spatialUnit'], { fetch });

	if (error !== null) {
		throw new Error(`OCHRE set ${SET_UUID} could not be read: ${error}`);
	}

	const summaries = set.items as SpatialUnit[];

	// Enrich in parallel. A single item failing upstream degrades that one row
	// rather than taking down the whole catalogue.
	const records = await Promise.all(
		summaries.map(async (summary) => ({
			summary,
			detail: await fetchSpatialUnit(summary.uuid, fetch)
		}))
	);

	const entries = records.map(({ summary, detail }) => toEntry(summary, detail));
	const project = records.find(({ detail }) => detail?.metadata?.project)?.detail?.metadata
		?.project;

	return {
		uuid: set.uuid,
		title: set.identification.label,
		description: set.description || null,
		projectLabel: project?.identification.label ?? null,
		projectUrl: project?.identification.website ?? null,
		entries,
		facets: buildFacets(entries),
		fetchedAt: new Date().toISOString()
	};
}

/**
 * The SDK still emits image links against `/ochre/v2/ochre.php`, which now
 * 404s; the live endpoint is `/ochre` and needs the `preview` flag to return a
 * JPEG rather than the item's XML.
 */
export function imageUrlFor(uuid: string): string {
	return `https://ochre.lib.uchicago.edu/ochre?uuid=${uuid}&preview`;
}

/** Rebuilds an SDK image link from its uuid so the fix survives path changes. */
export function normaliseImageUrl(url: string | null | undefined): string | null {
	if (!url) return null;

	try {
		const uuid = new URL(url).searchParams.get('uuid');
		return uuid ? imageUrlFor(uuid) : url;
	} catch {
		return url;
	}
}

const URL_PATTERN = /(https?:\/\/[^\s<>()[\]]+[^\s<>()[\].,;:!?'"])/g;

/**
 * Splits note prose into paragraphs of plain segments.
 *
 * Observers type these by hand, so the content arrives with `\r\n`, ragged
 * blank lines, and bare URLs. Resolving it to segments here lets the component
 * render prose and links without ever touching `{@html}`.
 */
export function toParagraphs(content: string): NoteSegment[][] {
	return content
		.replace(/\r\n/g, '\n')
		.split(/\n{2,}/)
		.map((paragraph) => paragraph.replace(/\n/g, ' ').trim())
		.filter(Boolean)
		.map((paragraph) =>
			paragraph
				.split(URL_PATTERN)
				.filter(Boolean)
				// `split` with a capturing group hands back the URLs as their own
				// entries, so a stateless prefix check is enough — and `.test()` on
				// a /g regex would carry `lastIndex` between calls.
				.map((value) => ({
					kind: /^https?:\/\//.test(value) ? ('link' as const) : ('text' as const),
					value
				}))
		)
		.filter((segments) => segments.length > 0);
}

/** Notes hang off observations, not off the unit itself. */
function toNotes(unit: SpatialUnit | null): Note[] {
	if (!unit) return [];

	return unit.observations
		.flatMap((observation) => observation.notes ?? [])
		.map((note) => ({
			title: note.title || null,
			date: note.date || null,
			author: note.authors?.[0]?.identification?.label ?? null,
			paragraphs: toParagraphs(String(note.content ?? ''))
		}))
		.filter((note) => note.paragraphs.length > 0);
}

/** Zotero records, arriving as CSL-formatted HTML that has to be sanitised. */
function toCitations(unit: SpatialUnit | null): Citation[] {
	if (!unit) return [];

	return unit.bibliographies
		.map((bibliography) => ({
			short: toPlainText(bibliography.citation?.short),
			long: sanitizeHtml(bibliography.citation?.long),
			zoteroId: bibliography.zoteroId || null
		}))
		.filter((citation) => citation.long || citation.short);
}

function toEvents(unit: SpatialUnit | null): ProvenanceEvent[] {
	if (!unit) return [];

	return unit.events
		.filter((event) => event.label)
		.map((event) => ({ date: event.dateTime || null, label: event.label }));
}

/**
 * An object can carry both a photograph and a scribal hand copy of its
 * inscription; the second only appears on the observation's links, which is why
 * the site showed one image per object before.
 */
function toImages(unit: SpatialUnit | null, summary: SpatialUnit): ObjectImage[] {
	const images: ObjectImage[] = [];
	const seen = new Set<string>();

	const add = (url: string | null, label: string | null) => {
		if (!url || seen.has(url)) return;
		seen.add(url);
		images.push({
			url,
			label,
			kind: /hand\s*copy/i.test(label ?? '') ? 'hand copy' : 'photograph'
		});
	};

	const lead = unit?.image ?? summary.image;
	add(normaliseImageUrl(lead?.url), lead?.identification?.label || null);

	for (const link of unit?.observations.flatMap((observation) => observation.links ?? []) ?? []) {
		if (!link.uuid || !link.fileFormat?.startsWith('image/')) continue;
		add(imageUrlFor(link.uuid), link.identification?.label || null);
	}

	return images;
}

/** Fetches one spatial unit, returning `null` instead of throwing. */
export async function fetchSpatialUnit(
	uuid: string,
	fetch: Fetch
): Promise<SpatialUnit | null> {
	try {
		const { error, item } = await fetchItem(uuid, 'spatialUnit', undefined, { fetch });
		return error === null ? item : null;
	} catch {
		return null;
	}
}

/**
 * Flattens an OCHRE spatial unit into the row the UI renders.
 *
 * The two upstream records are complementary, not redundant: the set summary
 * carries coordinates plus the Script/Language properties, while the item
 * record carries the image, description, and context path. Neither is a
 * superset, so both are merged — summary first, so its properties win.
 */
export function toEntry(summary: SpatialUnit, detail: SpatialUnit | null): CatalogueEntry {
	const unit = detail ?? summary;
	const properties = [...collectProperties(summary), ...collectProperties(detail)];
	const fields: Record<string, string> = {};
	const uncertain: string[] = [];

	for (const property of properties) {
		const values = property.values.filter((value) => value.content != null);
		if (values.length === 0) continue;

		const text = values.map((value) => String(value.content)).join(', ');

		// Some records carry a bare "?" or dash where a value is unknown. Those
		// are placeholders, not data, and a lone "?" reads as this site's own
		// uncertainty marker — so drop them and let the cell show as empty.
		if (!text || /^[?\-–—.\s]+$/.test(text)) continue;

		// Later observations shouldn't clobber the set-level value.
		fields[property.label] ??= text;

		if (values.some((value) => value.isUncertain) && !uncertain.includes(property.label)) {
			uncertain.push(property.label);
		}
	}

	const coordinates = [...(detail?.coordinates ?? []), ...summary.coordinates];
	const point = coordinates.find((coordinate) => coordinate.type === 'point') ?? null;
	const position = point ? { lat: point.latitude, lng: point.longitude } : null;
	const bearing = position ? bearingDegrees(UGARIT, position) : null;
	const displayPath = unit.context?.displayPath ?? summary.context?.displayPath ?? null;
	const images = toImages(detail, summary);

	return {
		uuid: summary.uuid,
		label: unit.identification.label || summary.identification.label,
		description: unit.description || summary.description || null,
		imageUrl: images[0]?.url ?? null,
		persistentUrl: unit.persistentUrl ?? summary.persistentUrl,
		findspot: displayPath ? (displayPath.split('/').pop() ?? null) : null,
		displayPath,
		lat: position?.lat ?? null,
		lng: position?.lng ?? null,
		distanceKm: position ? haversineKm(UGARIT, position) : null,
		bearing,
		compass: bearing === null ? null : compassPoint(bearing),
		fields,
		uncertain,
		notes: toNotes(detail),
		citations: toCitations(detail),
		events: toEvents(detail),
		images
	};
}

/**
 * Properties live in two places: directly on the unit, and on each observation.
 * Nested child properties are hoisted so qualifiers are searchable too.
 */
function collectProperties(unit: SpatialUnit | null): Property[] {
	if (!unit) return [];
	const observed = unit.observations.flatMap((observation) => observation.properties ?? []);
	return flatten([...unit.properties, ...observed]);
}

function flatten(properties: Property[]): Property[] {
	return properties.flatMap((property) =>
		property.properties?.length ? [property, ...flatten(property.properties)] : [property]
	);
}

/** Counts each facet's values, commonest first, so the sidebar is self-describing. */
function buildFacets(entries: CatalogueEntry[]): Facet[] {
	return FACET_LABELS.map((label) => {
		const counts = new Map<string, number>();

		for (const entry of entries) {
			const value = entry.fields[label];
			if (!value) continue;
			counts.set(value, (counts.get(value) ?? 0) + 1);
		}

		const values = [...counts.entries()]
			.map(([value, count]) => ({ value, count }))
			.sort((a, b) => b.count - a.count || a.value.localeCompare(b.value));

		return { label, values };
	}).filter((facet) => facet.values.length > 1);
}
