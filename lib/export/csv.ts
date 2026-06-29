/**
 * Minimal RFC-4180-ish CSV serializer for a flat array of records. Used by the
 * data-export route for per-resource CSV downloads. Array/object cell values
 * are JSON-encoded; null/undefined become empty cells.
 */

function cell(value: unknown): string {
	if (value == null) return "";
	const str = typeof value === "object" ? JSON.stringify(value) : String(value);
	// Quote when the value contains a delimiter, quote, or newline.
	if (/[",\n\r]/.test(str)) {
		return `"${str.replace(/"/g, '""')}"`;
	}
	return str;
}

export function toCsv(rows: Array<Record<string, unknown>>): string {
	if (rows.length === 0) return "";
	// Union of keys across all rows, preserving first-seen order.
	const headers: string[] = [];
	const seen = new Set<string>();
	for (const row of rows) {
		for (const key of Object.keys(row)) {
			if (!seen.has(key)) {
				seen.add(key);
				headers.push(key);
			}
		}
	}
	const lines = [headers.map(cell).join(",")];
	for (const row of rows) {
		lines.push(headers.map((h) => cell(row[h])).join(","));
	}
	return lines.join("\r\n");
}
