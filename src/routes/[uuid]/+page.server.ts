import { error } from '@sveltejs/kit';
import { sortEntries } from '$lib/catalogue';
import { loadCatalogue } from '$lib/server/ochre';
import type { EntryGenerator, PageServerLoad } from './$types';

export const prerender = true;

/**
 * The set is closed and small, so every object page is known at build time.
 * `loadCatalogue` memoises, so this read is shared with the twelve page loads
 * that follow rather than repeated for each.
 */
export const entries: EntryGenerator = async () => {
	const catalogue = await loadCatalogue(fetch);
	return catalogue.entries.map((entry) => ({ uuid: entry.uuid }));
};

export const load: PageServerLoad = async ({ params, fetch }) => {
	const catalogue = await loadCatalogue(fetch);

	// Neighbours follow the catalogue's default order, so paging through objects
	// walks outward from Ugarit rather than jumping around alphabetically.
	const ordered = sortEntries(catalogue.entries, 'distance');
	const index = ordered.findIndex((candidate) => candidate.uuid === params.uuid);

	if (index === -1) {
		error(404, 'No object with that identifier is in this set.');
	}

	return {
		entry: ordered[index]!,
		position: index + 1,
		total: ordered.length,
		previous: ordered[index - 1] ?? null,
		next: ordered[index + 1] ?? null,
		projectLabel: catalogue.projectLabel,
		setTitle: catalogue.title
	};
};
