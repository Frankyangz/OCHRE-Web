/**
 * The shape the UI works in.
 *
 * OCHRE's own model is deep and generic; this is the flat projection this
 * catalogue actually needs, resolved once on the server so no component has to
 * reach through `observations[0].properties` to render a table cell.
 */

/** Property labels promoted to filters, in the order they appear in the sidebar. */
export const FACET_LABELS = ['Object type', 'Material', 'Script', 'Language'] as const;

export type FacetLabel = (typeof FACET_LABELS)[number];

/**
 * A note's body, resolved server-side into paragraphs of plain segments.
 *
 * Note content arrives as text with newlines and bare URLs. Turning it into
 * segments here means the component renders it with ordinary Svelte markup —
 * no `{@html}`, so there is no injection surface at all.
 */
export type NoteSegment = { kind: 'text' | 'link'; value: string };

/** A remark left on the record by a named scholar. */
export type Note = {
	title: string | null;
	/** ISO date, where the observer recorded one. */
	date: string | null;
	author: string | null;
	paragraphs: NoteSegment[][];
};

/** A bibliography entry. Both fields are already sanitised HTML. */
export type Citation = {
	short: string;
	long: string;
	zoteroId: string | null;
};

/** An excavation or curation event — "Photographed", "Analyzed". */
export type ProvenanceEvent = {
	date: string | null;
	label: string;
};

export type ObjectImage = {
	url: string;
	label: string | null;
	/** A photograph of the object, or a scribal hand copy of its inscription. */
	kind: 'photograph' | 'hand copy';
};

export type CatalogueEntry = {
	uuid: string;
	label: string;
	description: string | null;
	imageUrl: string | null;
	persistentUrl: string | null;
	/** Leaf of the OCHRE context path — the site name. */
	findspot: string | null;
	/** Full OCHRE hierarchy, e.g. `Projects/Ras Shamra Tablet Inventory/…`. */
	displayPath: string | null;
	lat: number | null;
	lng: number | null;
	/** Great-circle distance from Ugarit. */
	distanceKm: number | null;
	bearing: number | null;
	compass: string | null;
	/** Every property, flattened to `label -> display value`. */
	fields: Record<string, string>;
	/** Labels whose value the excavator recorded as uncertain. */
	uncertain: string[];
	/** Remarks left by named scholars on the record. */
	notes: Note[];
	citations: Citation[];
	events: ProvenanceEvent[];
	/** Photographs and hand copies; the first is the lead image. */
	images: ObjectImage[];
};

export type Facet = {
	label: FacetLabel;
	values: Array<{ value: string; count: number }>;
};

export type Catalogue = {
	uuid: string;
	title: string;
	description: string | null;
	projectLabel: string | null;
	projectUrl: string | null;
	entries: CatalogueEntry[];
	facets: Facet[];
	/** ISO timestamp of the upstream read, surfaced in the footer. */
	fetchedAt: string;
};

/**
 * How the detail page organises an object's properties. OCHRE returns a flat
 * bag of labels; these groups are the reading order an object record actually
 * has — what it is, where it came from, how it is referenced.
 */
export const DETAIL_GROUPS: Array<{ heading: string; labels: string[] }> = [
	{
		heading: 'Description',
		labels: ['Object type', 'Material', 'Part', 'Script', 'Language']
	},
	{
		heading: 'Dimensions',
		labels: ['Size', 'Length', 'Width', 'Thickness']
	},
	{
		heading: 'Findspot',
		labels: ['Full TEO Findspot']
	},
	{
		heading: 'References',
		labels: ['Museum Number', 'KTU', 'Associated text', 'Publication', 'Classification']
	}
];

export type SortKey = 'distance' | 'label' | 'findspot' | 'type';

export const SORT_OPTIONS: Array<{ key: SortKey; label: string }> = [
	{ key: 'distance', label: 'Distance from Ugarit' },
	{ key: 'label', label: 'Name' },
	{ key: 'findspot', label: 'Findspot' },
	{ key: 'type', label: 'Object type' }
];

/** Missing values print as an em dash rather than an empty cell. */
export const EMPTY = '—';

const NUMBER_WORDS = [
	'zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten',
	'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen',
	'nineteen', 'twenty'
];

/** Small numbers are spelled out in prose and left as digits in tables. */
export function spellOut(value: number): string {
	return NUMBER_WORDS[value] ?? value.toLocaleString('en-US');
}

export function displayField(entry: CatalogueEntry, label: string): string {
	return entry.fields[label] || EMPTY;
}

export function isUncertain(entry: CatalogueEntry, label: string): boolean {
	return entry.uncertain.includes(label);
}

/** Case- and diacritic-insensitive haystack for the search box. */
export function searchHaystack(entry: CatalogueEntry): string {
	return [
		entry.label,
		entry.description ?? '',
		entry.findspot ?? '',
		...Object.values(entry.fields)
	]
		.join(' ')
		.normalize('NFD')
		.replace(/\p{Diacritic}/gu, '')
		.toLowerCase();
}

export function sortEntries(entries: CatalogueEntry[], key: SortKey): CatalogueEntry[] {
	const collator = new Intl.Collator('en', { numeric: true, sensitivity: 'base' });
	const byLabel = (a: CatalogueEntry, b: CatalogueEntry) => collator.compare(a.label, b.label);

	return [...entries].sort((a, b) => {
		switch (key) {
			case 'distance': {
				// Unlocated finds sort last rather than to zero.
				const av = a.distanceKm ?? Infinity;
				const bv = b.distanceKm ?? Infinity;
				return av === bv ? byLabel(a, b) : av - bv;
			}
			case 'findspot':
				return collator.compare(a.findspot ?? '', b.findspot ?? '') || byLabel(a, b);
			case 'type':
				return (
					collator.compare(a.fields['Object type'] ?? '', b.fields['Object type'] ?? '') ||
					byLabel(a, b)
				);
			case 'label':
			default:
				return byLabel(a, b);
		}
	});
}
