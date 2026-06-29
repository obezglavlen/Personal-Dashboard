import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";

/**
 * Currency exchange rates from frankfurter.dev v2. `base` is the target
 * currency; the response maps `rates[X]` = units of X per 1 base, so
 * converting X→base is `amount / rates[X]`.
 *
 * Proxied server-side (not the browser) so the response can be cached and
 * shared. The v2 `/rates` endpoint returns an array of
 * `{date, base, quote, rate}` rows; we fold it into a `{ base, rates }` map.
 */
type RateRow = { date: string; base: string; quote: string; rate: number };

export async function GET(req: Request) {
	const session = await getServerSession(authOptions);
	if (!session) {
		return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
	}

	const url = new URL(req.url);
	const base = (url.searchParams.get("base") || "USD").toUpperCase();

	try {
		const res = await fetch(
			`https://api.frankfurter.dev/v2/rates?base=${encodeURIComponent(base)}`,
			// Cache for an hour; rates publish roughly once per working day.
			{ next: { revalidate: 3600 } },
		);
		if (!res.ok) {
			return NextResponse.json({ base, rates: {} });
		}
		const rows = (await res.json()) as RateRow[];
		const rates: Record<string, number> = {};
		for (const r of rows) rates[r.quote] = r.rate;
		return NextResponse.json({ base, rates });
	} catch {
		return NextResponse.json({ base, rates: {} });
	}
}
