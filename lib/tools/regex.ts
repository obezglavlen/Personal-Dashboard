/**
 * Pure regex evaluation for the Tools page regex tester. Builds a RegExp from
 * user input and collects matches, guarding against the zero-width-match
 * infinite loop and surfacing invalid-pattern errors instead of throwing.
 */

export interface RegexMatch {
	/** Offset of the match within the input text. */
	index: number;
	/** The full matched substring. */
	match: string;
	/** Capture groups (an entry is undefined when that group did not participate). */
	groups: (string | undefined)[];
}

export interface RegexResult {
	/** Human-readable error when the pattern is invalid; absent on success. */
	error?: string;
	count: number;
	matches: RegexMatch[];
}

/** Hard cap so a pathological global pattern can never hang the UI. */
const MAX_MATCHES = 10_000;

export function runRegex(pattern: string, flags: string, text: string): RegexResult {
	if (!pattern) return { count: 0, matches: [] };

	let re: RegExp;
	try {
		re = new RegExp(pattern, flags);
	} catch (e) {
		return {
			error: e instanceof Error ? e.message : "Invalid regular expression",
			count: 0,
			matches: [],
		};
	}

	const matches: RegexMatch[] = [];

	if (!re.global) {
		const m = re.exec(text);
		if (m) matches.push({ index: m.index, match: m[0], groups: m.slice(1) });
		return { count: matches.length, matches };
	}

	let m = re.exec(text);
	while (m !== null && matches.length < MAX_MATCHES) {
		matches.push({ index: m.index, match: m[0], groups: m.slice(1) });
		// Zero-width match: bump lastIndex so exec advances instead of looping.
		if (m.index === re.lastIndex) re.lastIndex++;
		m = re.exec(text);
	}
	return { count: matches.length, matches };
}
