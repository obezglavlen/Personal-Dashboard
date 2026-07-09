import { prisma } from "@/lib/db";
import { normalizeTags } from "@/lib/tags";

/**
 * Server-side tag catalog. `syncTags` upserts every tag a record uses into the
 * per-user `Tag` table (deduped by the `(userId, name)` unique index), so a tag
 * used in any modal is suggested in all of them. `listTags` returns the catalog
 * for the `/api/tags` autocomplete source.
 */

export async function syncTags(
	userId: string,
	tags: readonly (string | null | undefined)[] | null | undefined,
): Promise<void> {
	const names = normalizeTags(tags);
	if (names.length === 0) return;

	// The (userId, name) unique index is case-sensitive, so an exact-match
	// createMany would still let "Food" and "food" coexist. Drop any name that
	// already matches an existing tag case-insensitively before inserting.
	const existing = await prisma.tag.findMany({
		where: { userId },
		select: { name: true },
	});
	const existingKeys = new Set(existing.map((t) => t.name.toLowerCase()));
	const newNames = names.filter((name) => !existingKeys.has(name.toLowerCase()));
	if (newNames.length === 0) return;

	await prisma.tag.createMany({
		data: newNames.map((name) => ({ userId, name })),
		skipDuplicates: true,
	});
}

export async function listTags(userId: string): Promise<string[]> {
	const rows = await prisma.tag.findMany({
		where: { userId },
		select: { name: true },
		orderBy: { name: "asc" },
	});
	return rows.map((r) => r.name);
}
