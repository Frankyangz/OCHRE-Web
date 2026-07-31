import { error } from '@sveltejs/kit';
import { sortEntries } from '$lib/catalogue';
import { loadCatalogue } from '$lib/server/ochre';
import type { PageServerLoad } from './$types';

export const config = {
	isr: { expiration: 3600 }
};

export const load: PageServerLoad = async ({ params, fetch, setHeaders }) => {
	const catalogue = await loadCatalogue(fetch);

	// Neighbours follow the catalogue's default order, so paging through objects
	// walks outward from Ugarit rather than jumping around alphabetically.
	const ordered = sortEntries(catalogue.entries, 'distance');
	const index = ordered.findIndex((candidate) => candidate.uuid === params.uuid);

	if (index === -1) {
		error(404, 'No object with that identifier is in this set.');
	}

	setHeaders({
		'cache-control': 'public, max-age=0, s-maxage=3600, stale-while-revalidate=86400'
	});

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
