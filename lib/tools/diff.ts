/**
 * Pure line-level text diff for the Tools page diff tool. Uses a longest-
 * common-subsequence DP table, then backtracks to emit an ordered list of
 * kept / removed / added lines.
 */

export type DiffType = "eq" | "add" | "del";

export interface DiffLine {
	type: DiffType;
	line: string;
}

export function diffLines(a: string, b: string): DiffLine[] {
	const aLines = a.split("\n");
	const bLines = b.split("\n");
	const n = aLines.length;
	const m = bLines.length;

	// dp[i][j] = LCS length of aLines[i..] and bLines[j..].
	const dp: number[][] = Array.from({ length: n + 1 }, () => new Array(m + 1).fill(0));
	for (let i = n - 1; i >= 0; i--) {
		for (let j = m - 1; j >= 0; j--) {
			dp[i][j] =
				aLines[i] === bLines[j]
					? dp[i + 1][j + 1] + 1
					: Math.max(dp[i + 1][j], dp[i][j + 1]);
		}
	}

	const out: DiffLine[] = [];
	let i = 0;
	let j = 0;
	while (i < n && j < m) {
		if (aLines[i] === bLines[j]) {
			out.push({ type: "eq", line: aLines[i] });
			i++;
			j++;
		} else if (dp[i + 1][j] >= dp[i][j + 1]) {
			out.push({ type: "del", line: aLines[i] });
			i++;
		} else {
			out.push({ type: "add", line: bLines[j] });
			j++;
		}
	}
	while (i < n) {
		out.push({ type: "del", line: aLines[i] });
		i++;
	}
	while (j < m) {
		out.push({ type: "add", line: bLines[j] });
		j++;
	}
	return out;
}
