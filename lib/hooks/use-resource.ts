"use client";

import useSWR from "swr";
import { apiDelete, apiPatch, apiPost, apiPut, fetcher } from "@/lib/api-client";

interface UseResourceOptions {
  /** HTTP method for updates. Notes/bookmarks use PUT; others use PATCH. */
  updateMethod?: "PUT" | "PATCH";
}

/**
 * Client-side mirror of the server CRUD layer: load a user-scoped collection
 * with SWR and mutate it through the typed API client, revalidating after each
 * write. Mutations throw `ApiClientError` on failure so callers can toast.
 */
export function useResource<T>(path: string, options: UseResourceOptions = {}) {
  const { data, error, isLoading, mutate } = useSWR<T[]>(path, fetcher);
  const update = options.updateMethod === "PUT" ? apiPut : apiPatch;

  return {
    items: data ?? [],
    isLoading,
    error,
    mutate,
    async create(body: unknown): Promise<T> {
      const created = await apiPost<T>(path, body);
      await mutate();
      return created;
    },
    async update(id: string, body: unknown): Promise<T> {
      const updated = await update<T>(`${path}/${id}`, body);
      await mutate();
      return updated;
    },
    async remove(id: string): Promise<void> {
      await apiDelete(`${path}/${id}`);
      await mutate();
    },
  };
}
