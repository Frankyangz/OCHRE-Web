/**
 * A small allowlist sanitiser for the one piece of upstream HTML this site
 * renders: the CSL-formatted bibliography entries OCHRE returns in
 * `bibliography.citation.long`.
 *
 * Everything else on the site is rendered as text through Svelte, which escapes
 * for us. This exists because a citation is genuinely marked up — italic titles,
 * a DOI anchor — and flattening it to plain text would lose real typography.
 *
 * It runs at build time against a university API, so the threat model is thin.
 * It is still an allowlist rather than a blocklist: unknown tags are unwrapped
 * to their text, and only http(s) links survive.
 */

/** Tags kept. Everything else is unwrapped — the tag goes, its text stays. */
const ALLOWED_TAGS = new Set(['div', 'span', 'i', 'b', 'em', 'strong', 'br']);

/** Tags whose *content* is dropped too, not just their markup. */
const STRIPPED_ELEMENTS = /<(script|style|iframe|object|embed|template)\b[\s\S]*?<\/\1\s*>/gi;
const STRIPPED_TAGS = /<\/?(script|style|iframe|object|embed|template)\b[^>]*>/gi;

const TAG = /<(\/)?([a-zA-Z][a-zA-Z0-9-]*)((?:"[^"]*"|'[^']*'|[^>])*)>/g;
const HREF = /\bhref\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/i;

/** Only absolute web links survive; `javascript:` and friends are dropped. */
function safeHref(attributes: string): string | null {
	const match = HREF.exec(attributes);
	if (!match) return null;

	const raw = (match[1] ?? match[2] ?? match[3] ?? '').trim();
	if (!/^https?:\/\//i.test(raw)) return null;

	// The value is going straight back into an attribute, so neutralise anything
	// that could close it early.
	return raw.replace(/[<>"'`]/g, (character) => `&#${character.charCodeAt(0)};`);
}

export function sanitizeHtml(input: string | null | undefined): string {
	if (!input) return '';

	const withoutDangerousElements = input.replace(STRIPPED_ELEMENTS, '').replace(STRIPPED_TAGS, '');

	return withoutDangerousElements.replace(TAG, (_match, closing, rawName, attributes) => {
		const name = String(rawName).toLowerCase();

		// Anchors are allowed, but only ever rebuilt from a vetted href — never
		// passed through with whatever attributes came down the wire. A rejected
		// href leaves a bare <a>, which keeps the tree balanced without linking
		// anywhere.
		if (name === 'a') {
			if (closing) return '</a>';
			const href = safeHref(String(attributes));
			return href ? `<a href="${href}" rel="noreferrer" target="_blank">` : '<a>';
		}

		if (!ALLOWED_TAGS.has(name)) return '';
		if (name === 'br') return '<br>';

		return closing ? `</${name}>` : `<${name}>`;
	});
}

/**
 * A citation rendered inline (`citation.short`, e.g. "(Fossé et al., 2024)")
 * needs no markup at all, so it is reduced to text.
 */
export function toPlainText(input: string | null | undefined): string {
	if (!input) return '';
	return input
		.replace(STRIPPED_ELEMENTS, '')
		.replace(/<[^>]*>/g, '')
		.replace(/\s+/g, ' ')
		.trim();
}
