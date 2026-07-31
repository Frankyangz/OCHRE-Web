import adapter from '@sveltejs/adapter-vercel';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	kit: {
		// Every page is prerendered at build time — see `prerender = true` in each
		// route — so the dozen upstream OCHRE reads happen once in CI and visitors
		// are served static files. A catchall function is still emitted, which is
		// what lets an unknown identifier reach the custom 404.
		adapter: adapter({ runtime: 'nodejs22.x' })
	}
};

export default config;
