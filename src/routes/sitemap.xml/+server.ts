import { loadCatalogue } from '$lib/server/ochre';
import { SITE_URL } from '$lib/site';

export const config = {
	isr: { expiration: 86400 }
};

export async function GET({ fetch, setHeaders }) {
	const catalogue = await loadCatalogue(fetch);
	const lastmod = catalogue.fetchedAt.slice(0, 10);

	const urls = [
		{ loc: SITE_URL, priority: '1.0' },
		...catalogue.entries.map((entry) => ({
			loc: `${SITE_URL}/${entry.uuid}`,
			priority: '0.7'
		}))
	];

	const body = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls
	.map(
		({ loc, priority }) =>
			`\t<url>\n\t\t<loc>${loc}</loc>\n\t\t<lastmod>${lastmod}</lastmod>\n\t\t<priority>${priority}</priority>\n\t</url>`
	)
	.join('\n')}
</urlset>
`;

	setHeaders({
		'content-type': 'application/xml',
		'cache-control': 'public, max-age=0, s-maxage=86400'
	});

	return new Response(body);
}
