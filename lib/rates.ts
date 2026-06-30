/**
 * Currency exchange rates from frankfurter.dev v2, fetched server-side and
 * cached for an hour (rates publish roughly once per working day). `rates[X]` =
 * units of X per 1 `base`, so converting X→base is `amount / rates[X]` — see
 * {@link import("@/lib/format").convertToBase}.
 *
 * Shared by the `/api/rates` proxy (browser) and the notification digest (cron).
 * Returns an empty map on any failure; callers then leave amounts unconverted
 * rather than throwing.
 */
type RateRow = { date: string; base: string; quote: string; rate: number };

export async function getRates(base: string): Promise<Record<string, number>> {
	const b = base.toUpperCase();
	try {
		const res = await fetch(
			`https://api.frankfurter.dev/v2/rates?base=${encodeURIComponent(b)}`,
			{ next: { revalidate: 3600 } },
		);
		if (!res.ok) return {};
		const rows = (await res.json()) as RateRow[];
		const rates: Record<string, number> = {};
		for (const r of rows) rates[r.quote] = r.rate;
		return rates;
	} catch {
		return {};
	}
}
