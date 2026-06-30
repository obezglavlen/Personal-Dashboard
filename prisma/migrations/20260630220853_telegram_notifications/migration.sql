-- AlterTable
ALTER TABLE "UserSettings" ADD COLUMN     "notifyBudgets" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "notifyRenewals" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "notifyTasks" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "telegramChatId" TEXT;
