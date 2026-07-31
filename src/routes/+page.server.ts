import { loadCatalogue } from '$lib/server/ochre';
import type { PageServerLoad } from './$types';

/**
 * Built once at deploy time rather than served from ISR.
 *
 * Twelve pages of archival data that changes on the order of months does not
 * need per-request rendering, and ISR made the first visitor after every
 * deployment wait out a dozen cold OCHRE round-trips. Prerendering moves that
 * cost to the build, where only CI pays it.
 */
export const prerender = true;

export const load: PageServerLoad = async ({ fetch }) => {
	const catalogue = await loadCatalogue(fetch);
	return { catalogue };
};
