"use client";

import useSWR from "swr";
import { fetcher } from "@/lib/api-client";

/**
 * The signed-in user's shared tag catalog (`/api/tags`), used as the
 * autocomplete source in every tag-bearing modal so a tag used anywhere is
 * suggested everywhere. Returns a sorted list; empty until loaded.
 */
export function useAllTags(): string[] {
	const { data } = useSWR<string[]>("/api/tags", fetcher, {
		revalidateOnFocus: false,
	});
	return data ?? [];
}
