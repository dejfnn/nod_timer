-- AlterTable
ALTER TABLE "Project" ADD COLUMN     "estimateHours" DOUBLE PRECISION;

-- AlterTable
ALTER TABLE "TimeEntry" ADD COLUMN     "invoicedAt" BIGINT;

-- CreateTable
CREATE TABLE "SavedReport" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "params" JSONB NOT NULL,
    "shareToken" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SavedReport_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SavedReport_shareToken_key" ON "SavedReport"("shareToken");

-- CreateIndex
CREATE INDEX "SavedReport_userId_idx" ON "SavedReport"("userId");

-- AddForeignKey
ALTER TABLE "SavedReport" ADD CONSTRAINT "SavedReport_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

