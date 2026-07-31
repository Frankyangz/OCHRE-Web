import adapter from '@sveltejs/adapter-vercel';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	kit: {
		// The catalogue is assembled from a dozen upstream OCHRE reads, so pages
		// are served from the edge cache and revalidated in the background rather
		// than rebuilt per request. Per-route ISR is set in each `+page.server.ts`.
		adapter: adapter({ runtime: 'nodejs22.x' })
	}
};

export default config;
