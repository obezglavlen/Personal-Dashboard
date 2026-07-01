"use client";

import { useCallback, useMemo } from "react";
import useSWR from "swr";
import { fetcher } from "@/lib/api-client";
import {
	pickRatesForDate,
	type RatesByDate,
	type RatesMap,
} from "@/lib/rates-history";
import { useRates } from "./use-rates";

type HistoryData = { base: string; snapshots: RatesByDate };

const EMPTY: RatesByDate = {};

/**
 * Point-in-time exchange rates for `base`. Returns `ratesForDate(iso)` which
 * picks the snapshot for a row's own day (see `pickRatesForDate`), falling back
 * to today's live rates when no snapshot covers that day or none exist yet.
 * This is what makes historical report figures convert at then-current rates.
 */
export function useHistoricalRates(base: string) {
	const { data } = useSWR<HistoryData>(
		base ? `/api/rates/history?base=${base}` : null,
		fetcher,
		{ revalidateOnFocus: false, dedupingInterval: 3_600_000 },
	);
	const { rates: liveRates } = useRates(base);
	const snapshots = data?.snapshots ?? EMPTY;
	// Sort snapshot day-keys once per data change, not once per row.
	const sortedKeys = useMemo(() => Object.keys(snapshots).sort(), [snapshots]);
	const hasSnapshots = sortedKeys.length > 0;

	const ratesForDate = useCallback(
		(isoDate: string): RatesMap => {
			if (!hasSnapshots) return liveRates;
			const r = pickRatesForDate(snapshots, isoDate, sortedKeys);
			return Object.keys(r).length ? r : liveRates;
		},
		[snapshots, sortedKeys, liveRates, hasSnapshots],
	);

	return { base, ratesForDate, hasSnapshots };
}
