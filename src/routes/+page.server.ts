import { loadCatalogue } from '$lib/server/ochre';
import type { PageServerLoad } from './$types';

/**
 * Upstream OCHRE data changes on the order of months, so serve from cache and
 * revalidate hourly in the background.
 */
export const config = {
	isr: { expiration: 3600 }
};

export const load: PageServerLoad = async ({ fetch, setHeaders }) => {
	const catalogue = await loadCatalogue(fetch);

	setHeaders({
		'cache-control': 'public, max-age=0, s-maxage=3600, stale-while-revalidate=86400'
	});

	return { catalogue };
};
