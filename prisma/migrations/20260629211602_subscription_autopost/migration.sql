-- AlterTable
ALTER TABLE "Subscription" ADD COLUMN     "autoExpense" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "lastPostedAt" TIMESTAMP(3);
