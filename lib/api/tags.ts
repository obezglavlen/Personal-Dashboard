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
	await prisma.tag.createMany({
		data: names.map((name) => ({ userId, name })),
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
