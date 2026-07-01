-- CreateTable: per-user tag catalog
CREATE TABLE "Tag" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Tag_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Tag_userId_idx" ON "Tag"("userId");
CREATE UNIQUE INDEX "Tag_userId_name_key" ON "Tag"("userId", "name");

-- AddForeignKey
ALTER TABLE "Tag" ADD CONSTRAINT "Tag_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Subscription: category -> tags (preserve the existing single category as a tag)
ALTER TABLE "Subscription" ADD COLUMN "tags" TEXT[];
UPDATE "Subscription" SET "tags" = ARRAY["category"] WHERE "category" IS NOT NULL AND btrim("category") <> '';
UPDATE "Subscription" SET "tags" = ARRAY[]::TEXT[] WHERE "tags" IS NULL;
ALTER TABLE "Subscription" DROP COLUMN "category";

-- RecurringTransaction: fold category into tags, then drop category
UPDATE "RecurringTransaction" SET "tags" = "tags" || ARRAY["category"] WHERE "category" IS NOT NULL AND btrim("category") <> '';
ALTER TABLE "RecurringTransaction" DROP COLUMN "category";

-- Backfill the Tag catalog from every tag-bearing table (deduped per user)
INSERT INTO "Tag" ("id", "userId", "name")
SELECT gen_random_uuid()::text, "userId", tag
FROM (
    SELECT "userId", unnest("tags") AS tag FROM "Expense"
    UNION SELECT "userId", unnest("tags") FROM "Budget"
    UNION SELECT "userId", unnest("tags") FROM "Subscription"
    UNION SELECT "userId", unnest("tags") FROM "RecurringTransaction"
    UNION SELECT "userId", unnest("tags") FROM "Note"
) src
WHERE tag IS NOT NULL AND btrim(tag) <> ''
ON CONFLICT ("userId", "name") DO NOTHING;
