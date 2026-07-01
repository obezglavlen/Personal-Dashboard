/**
 * Pure text matcher/ranker for the command palette. Case-insensitive substring
 * match, ranked so the most relevant items sort first: a prefix match beats a
 * word-boundary match, which beats a mid-word match (earlier position wins
 * within that). Returns at most `limit` items. Empty query → no matches (the
 * palette shows navigation instead). No React/DOM so it is unit-testable.
 */

function escapeRegex(s: string): string {
	return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function matchAndRank<T>(
	query: string,
	items: T[],
	text: (item: T) => string,
	limit = 5,
): T[] {
	const q = query.trim().toLowerCase();
	if (!q) return [];
	const wordBoundary = new RegExp(`\\b${escapeRegex(q)}`);

	const scored: { item: T; score: number }[] = [];
	for (const item of items) {
		const t = text(item).toLowerCase();
		const idx = t.indexOf(q);
		if (idx === -1) continue;
		let score: number;
		if (t.startsWith(q)) score = 0;
		else if (wordBoundary.test(t)) score = 1;
		else score = 2 + idx / 10_000;
		scored.push({ item, score });
	}
	// Stable within equal scores: Array.prototype.sort is stable in modern JS,
	// so ties keep the input order.
	scored.sort((a, b) => a.score - b.score);
	return scored.slice(0, limit).map((s) => s.item);
}
