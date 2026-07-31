import assert from 'node:assert/strict';
import test from 'node:test';
import { sanitizeHtml, toPlainText } from './sanitize.ts';

test('keeps the markup a citation actually uses', () => {
	const html = sanitizeHtml('<div><span>Fossé, C. </span><i>Antiquity</i> <b>98</b></div>');
	assert.equal(html, '<div><span>Fossé, C. </span><i>Antiquity</i> <b>98</b></div>');
});

test('drops attributes but keeps the element', () => {
	const html = sanitizeHtml(
		'<div xmlns="http://www.w3.org/1999/xhtml" class="csl-bib-body" style="line-height:2">x</div>'
	);
	assert.equal(html, '<div>x</div>');
});

test('rebuilds http links with rel and target', () => {
	const html = sanitizeHtml('<a href="https://doi.org/10.1000/xyz" class="x">DOI</a>');
	assert.equal(html, '<a href="https://doi.org/10.1000/xyz" rel="noreferrer" target="_blank">DOI</a>');
});

test('strips a javascript: href but keeps the text, balanced', () => {
	const html = sanitizeHtml('<a href="javascript:alert(1)">click</a>');
	assert.equal(html, '<a>click</a>');
	assert.ok(!html.includes('javascript'));
});

test('strips other non-web schemes', () => {
	for (const href of ['data:text/html,<b>x</b>', 'vbscript:x', 'file:///etc/passwd', '//evil.test']) {
		const html = sanitizeHtml(`<a href="${href}">t</a>`);
		assert.equal(html, '<a>t</a>', `should reject ${href}`);
	}
});

test('removes script elements and their contents entirely', () => {
	const html = sanitizeHtml('<div>before<script>alert(1)</script>after</div>');
	assert.equal(html, '<div>beforeafter</div>');
	assert.ok(!html.includes('alert'));
});

test('removes style, iframe and object with their contents', () => {
	assert.equal(sanitizeHtml('<style>body{}</style>keep'), 'keep');
	assert.equal(sanitizeHtml('<iframe src="https://evil.test">x</iframe>keep'), 'keep');
	assert.equal(sanitizeHtml('<object data="x">y</object>keep'), 'keep');
});

test('drops an unclosed script tag rather than trusting it', () => {
	assert.equal(sanitizeHtml('<script src="https://evil.test">ok'), 'ok');
});

test('unwraps unknown tags but keeps their text', () => {
	assert.equal(sanitizeHtml('<p>one</p><section>two</section>'), 'onetwo');
	assert.equal(sanitizeHtml('<img src="x" onerror="alert(1)">text'), 'text');
});

test('drops inline event handlers along with the tag they sit on', () => {
	const html = sanitizeHtml('<div onclick="alert(1)" onmouseover="alert(2)">safe</div>');
	assert.equal(html, '<div>safe</div>');
	assert.ok(!html.includes('onclick'));
	assert.ok(!html.includes('alert'));
});

test('neutralises a quote that would break out of the href attribute', () => {
	const html = sanitizeHtml('<a href=\'https://a.test/" onmouseover="alert(1)\'>t</a>');

	// `[^"]*` stops at the first raw quote, so this captures the whole attribute
	// only if nothing inside it terminated the value early.
	const value = html.match(/href="([^"]*)"/)?.[1];
	assert.ok(value, `href should survive: ${html}`);
	assert.ok(!value.includes('"'), 'no raw quote may remain inside the value');
	assert.ok(value.includes('&#34;'), 'the injected quote should be entity-encoded');

	// The payload is inert text within the href, not an attribute of its own.
	assert.equal(html.slice(html.indexOf('>')), '>t</a>');
});

test('normalises self-closing breaks', () => {
	assert.equal(sanitizeHtml('a<br />b'), 'a<br>b');
});

test('handles empty and nullish input', () => {
	assert.equal(sanitizeHtml(''), '');
	assert.equal(sanitizeHtml(null), '');
	assert.equal(sanitizeHtml(undefined), '');
});

test('toPlainText flattens a short citation', () => {
	assert.equal(
		toPlainText('<span xmlns="http://www.w3.org/1999/xhtml">(Fossé et al., 2024)</span>'),
		'(Fossé et al., 2024)'
	);
	assert.equal(toPlainText('<div>a\n\n  b</div>'), 'a b');
	assert.equal(toPlainText(null), '');
});
