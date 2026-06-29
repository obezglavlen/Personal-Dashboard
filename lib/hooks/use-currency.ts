"use client";

import useSWR from "swr";
import { apiPut, fetcher } from "@/lib/api-client";

type SettingsData = { currency?: string };

/**
 * Global currency preference. Backed by `/api/settings` and shared through
 * SWR's cache, so every consumer (chart, forms, profile menu) dedupes onto a
 * single request. `setCurrency` persists and revalidates.
 */
export function useCurrency() {
	const { data, mutate } = useSWR<SettingsData>("/api/settings", fetcher);
	const currency = data?.currency ?? "USD";

	return {
		currency,
		async setCurrency(next: string) {
			await apiPut("/api/settings", { currency: next });
			await mutate();
		},
	};
}
