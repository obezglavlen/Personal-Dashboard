-- CreateTable
CREATE TABLE "Income" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "taxConfigId" TEXT,
    "date" TIMESTAMP(3) NOT NULL,
    "amount" DECIMAL(10,2),
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Income_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Income_userId_idx" ON "Income"("userId");

-- CreateIndex
CREATE INDEX "Income_date_idx" ON "Income"("date");

-- AddForeignKey
ALTER TABLE "Income" ADD CONSTRAINT "Income_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Income" ADD CONSTRAINT "Income_taxConfigId_fkey" FOREIGN KEY ("taxConfigId") REFERENCES "TaxConfig"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Migrate existing income rows out of TaxRecord into the new Income table,
-- preserving ids and timestamps, then drop them from TaxRecord.
INSERT INTO "Income" ("id", "userId", "taxConfigId", "date", "amount", "currency", "description", "createdAt", "updatedAt")
SELECT "id", "userId", "taxConfigId", "date", "amount", "currency", "description", "createdAt", "updatedAt"
FROM "TaxRecord"
WHERE "type" = 'income';

DELETE FROM "TaxRecord" WHERE "type" = 'income';
