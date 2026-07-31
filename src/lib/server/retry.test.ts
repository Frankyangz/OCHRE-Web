import assert from 'node:assert/strict';
import test from 'node:test';
import { withRetries } from './retry.ts';

/** No real backoff, so the suite runs instantly. */
const options = { sleep: async () => {} };

const ok = () => new Response('ok', { status: 200 });
const status = (code: number) => () => new Response('', { status: code });

/** Returns the given responses in order; throws if called more times. */
function scripted(steps: Array<() => Response | never>) {
	let calls = 0;
	const fetch = async () => {
		const step = steps[calls++];
		if (!step) throw new Error(`unexpected call ${calls}`);
		return step();
	};
	return { fetch: fetch as unknown as typeof globalThis.fetch, calls: () => calls };
}

test('returns a successful response without retrying', async () => {
	const s = scripted([ok]);
	const response = await withRetries(s.fetch, options)('https://example.test');
	assert.equal(response.status, 200);
	assert.equal(s.calls(), 1);
});

test('recovers from a dropped connection', async () => {
	const boom = () => {
		throw new TypeError('fetch failed');
	};
	const s = scripted([boom, boom, ok]);
	const response = await withRetries(s.fetch, options)('https://example.test');
	assert.equal(response.status, 200);
	assert.equal(s.calls(), 3, 'should retry until it succeeds');
});

test('recovers from a 503', async () => {
	const s = scripted([status(503), ok]);
	const response = await withRetries(s.fetch, options)('https://example.test');
	assert.equal(response.status, 200);
	assert.equal(s.calls(), 2);
});

test('retries 429 as well as 5xx', async () => {
	const s = scripted([status(429), ok]);
	const response = await withRetries(s.fetch, options)('https://example.test');
	assert.equal(response.status, 200);
	assert.equal(s.calls(), 2);
});

test('does not retry a 404 — it is a real answer', async () => {
	const s = scripted([status(404)]);
	const response = await withRetries(s.fetch, options)('https://example.test');
	assert.equal(response.status, 404);
	assert.equal(s.calls(), 1, 'a 4xx must not be retried');
});

test('gives up after the attempt limit and surfaces the last error', async () => {
	const boom = () => {
		throw new TypeError('fetch failed');
	};
	const s = scripted([boom, boom, boom, boom]);
	await assert.rejects(
		() => withRetries(s.fetch, { ...options, attempts: 4 })('https://example.test'),
		/fetch failed/
	);
	assert.equal(s.calls(), 4);
});

test("hands back the server's own last response rather than a synthetic error", async () => {
	const s = scripted([status(500), status(500), status(500), status(500)]);
	const response = await withRetries(s.fetch, { ...options, attempts: 4 })(
		'https://example.test'
	);
	assert.equal(response.status, 500);
});
