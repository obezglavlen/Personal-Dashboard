"use client";

import useSWR from "swr";
import { fetcher } from "@/lib/api-client";

type RatesData = { base: string; rates: Record<string, number> };

/**
 * Exchange rates with `base` as the target currency, fetched from the cached
 * `/api/rates` proxy. `rates[X]` = units of X per 1 base. Shared via SWR's
 * cache so the chart and tables dedupe onto one request per base.
 */
export function useRates(base: string) {
	const { data } = useSWR<RatesData>(
		base ? `/api/rates?base=${base}` : null,
		fetcher,
		{ revalidateOnFocus: false, dedupingInterval: 3_600_000 },
	);
	return { base: data?.base ?? base, rates: data?.rates ?? {} };
}
