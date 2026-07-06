-- AlterTable
ALTER TABLE "UserSettings" ADD COLUMN     "notifyEvents" BOOLEAN NOT NULL DEFAULT true;

-- CreateTable
CREATE TABLE "CalendarEvent" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "location" TEXT,
    "startAt" TIMESTAMP(3) NOT NULL,
    "endAt" TIMESTAMP(3),
    "allDay" BOOLEAN NOT NULL DEFAULT false,
    "recurrence" TEXT NOT NULL DEFAULT 'none',
    "recurrenceEnd" TIMESTAMP(3),
    "reminderMinutes" INTEGER,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "seriesId" TEXT,
    "overrideDate" TIMESTAMP(3),
    "canceled" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CalendarEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CalendarEvent_userId_idx" ON "CalendarEvent"("userId");

-- CreateIndex
CREATE INDEX "CalendarEvent_userId_startAt_idx" ON "CalendarEvent"("userId", "startAt");

-- CreateIndex
CREATE INDEX "CalendarEvent_seriesId_idx" ON "CalendarEvent"("seriesId");

-- AddForeignKey
ALTER TABLE "CalendarEvent" ADD CONSTRAINT "CalendarEvent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
