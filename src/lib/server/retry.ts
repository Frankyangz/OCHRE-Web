type Fetch = typeof globalThis.fetch;

export const MAX_ATTEMPTS = 4;
export const REQUEST_TIMEOUT_MS = 20_000;

/**
 * Wraps a fetch so transient upstream failures are retried.
 *
 * Building the catalogue takes a dozen upstream reads, so without this a single
 * dropped connection anywhere in that fan-out fails the whole build — which is
 * exactly how a brief OCHRE blip once broke CI while the same commit deployed
 * fine minutes later.
 *
 * Network errors, timeouts, 5xx, and 429 are retried. A 404 or any other 4xx is
 * a real answer from a healthy server and is passed straight back.
 */
export function withRetries(
	fetch: Fetch,
	{
		attempts = MAX_ATTEMPTS,
		timeoutMs = REQUEST_TIMEOUT_MS,
		/** Injectable so tests do not have to wait out real backoff. */
		sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))
	} = {}
): Fetch {
	return async (input, init) => {
		let lastResponse: Response | null = null;
		let lastError: unknown = null;

		for (let attempt = 1; attempt <= attempts; attempt++) {
			try {
				const response = await fetch(input, {
					...init,
					signal: init?.signal ?? AbortSignal.timeout(timeoutMs)
				});

				if (response.status < 500 && response.status !== 429) return response;
				lastResponse = response;
			} catch (error) {
				lastError = error;
			}

			if (attempt < attempts) {
				// Exponential backoff, jittered so parallel item reads recovering
				// from the same blip do not all retry on the same beat.
				await sleep(500 * 2 ** (attempt - 1) + Math.random() * 250);
			}
		}

		// Prefer handing back the server's own last word over a synthetic error.
		if (lastResponse) return lastResponse;
		throw lastError;
	};
}
