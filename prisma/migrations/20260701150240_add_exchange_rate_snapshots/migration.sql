-- CreateTable
CREATE TABLE "ExchangeRateSnapshot" (
    "id" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "base" TEXT NOT NULL,
    "rates" JSONB NOT NULL,
    "source" TEXT NOT NULL DEFAULT 'frankfurter',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ExchangeRateSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ExchangeRateSnapshot_date_idx" ON "ExchangeRateSnapshot"("date");

-- CreateIndex
CREATE UNIQUE INDEX "ExchangeRateSnapshot_base_date_key" ON "ExchangeRateSnapshot"("base", "date");
