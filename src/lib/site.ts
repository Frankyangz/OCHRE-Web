import { env } from '$env/dynamic/public';

/**
 * The canonical origin for this site.
 *
 * Pages are served from ISR, so the HTML is generated once and reused. Deriving
 * the origin from the incoming request would bake whichever hostname happened to
 * trigger the build — a preview URL, say — into the canonical and Open Graph
 * tags for everyone. A fixed value is the only stable answer.
 *
 * Set PUBLIC_SITE_URL to override; the literal is the deployed default.
 */
export const SITE_URL = (env.PUBLIC_SITE_URL || 'https://ochre-web.vercel.app').replace(
	/\/$/,
	''
);
