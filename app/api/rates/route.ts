import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getRates } from "@/lib/rates";

/**
 * Currency exchange rates proxy. `base` is the target currency; the response
 * `{ base, rates }` maps `rates[X]` = units of X per 1 base, so converting
 * X→base is `amount / rates[X]`.
 *
 * Proxied server-side (not the browser) so the response is cached and shared.
 * The fetch/cache lives in `lib/rates` so the notification digest reuses it.
 */
export async function GET(req: Request) {
	const session = await getServerSession(authOptions);
	if (!session) {
		return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
	}

	const url = new URL(req.url);
	const base = (url.searchParams.get("base") || "USD").toUpperCase();
	const rates = await getRates(base);
	return NextResponse.json({ base, rates });
}
