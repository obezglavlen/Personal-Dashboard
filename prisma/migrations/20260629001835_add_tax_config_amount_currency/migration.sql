-- AlterTable
ALTER TABLE "TaxConfig" ADD COLUMN     "currency" TEXT NOT NULL DEFAULT 'USD',
ADD COLUMN     "staticAmount" DECIMAL(10,2);
