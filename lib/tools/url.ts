/**
 * Pure URL helpers for the Tools page URL / query tool: component
 * encode/decode and query-string parsing into key/value pairs.
 */

export interface QueryParam {
	key: string;
	value: string;
}

/** Encode a string for safe use inside a URL component. */
export function encodeComponent(input: string): string {
	return encodeURIComponent(input);
}

/** Decode a URL component, surfacing malformed input rather than throwing. */
export function decodeComponent(input: string): { value?: string; error?: string } {
	try {
		return { value: decodeURIComponent(input) };
	} catch {
		return { error: "Malformed URI sequence" };
	}
}

/**
 * Parse a query string into decoded key/value pairs. Accepts a full URL, a
 * bare query string, or one with a leading `?`; any `#fragment` is dropped.
 * Repeated keys are preserved as separate entries.
 */
export function parseQuery(input: string): QueryParam[] {
	const trimmed = input.trim();
	if (!trimmed) return [];
	const afterQuestion = trimmed.includes("?")
		? trimmed.slice(trimmed.indexOf("?") + 1)
		: trimmed;
	const query = afterQuestion.split("#")[0];
	const out: QueryParam[] = [];
	for (const [key, value] of new URLSearchParams(query)) {
		out.push({ key, value });
	}
	return out;
}
