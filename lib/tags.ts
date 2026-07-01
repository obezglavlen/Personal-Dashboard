/**
 * Pure tag helpers shared by the server (Tag catalog sync) and any client that
 * needs to clean a tag list. No DB/DOM, so unit-testable.
 */

/**
 * Normalize a raw tag list for storage: trim, drop empties, and dedupe
 * case-insensitively while keeping the first-seen casing. Order preserved.
 */
export function normalizeTags(
	tags: readonly (string | null | undefined)[] | null | undefined,
): string[] {
	if (!tags) return [];
	const seen = new Set<string>();
	const out: string[] = [];
	for (const raw of tags) {
		const t = (raw ?? "").trim();
		if (!t) continue;
		const key = t.toLowerCase();
		if (seen.has(key)) continue;
		seen.add(key);
		out.push(t);
	}
	return out;
}
