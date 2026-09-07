-- AlterTable
ALTER TABLE "Application" ADD COLUMN "score" DECIMAL(8,2);
ALTER TABLE "Application" ADD COLUMN "categoryCode" TEXT;
ALTER TABLE "Application" ADD COLUMN "meritRank" INTEGER;
ALTER TABLE "Application" ADD COLUMN "cutoffRound" INTEGER;
ALTER TABLE "Application" ADD COLUMN "selectionStatus" TEXT NOT NULL DEFAULT 'PENDING';

-- CreateTable
CREATE TABLE "CutoffRule" (
    "id" TEXT NOT NULL,
    "campusId" TEXT NOT NULL,
    "programId" TEXT NOT NULL,
    "roundNo" INTEGER NOT NULL,
    "categoryCode" TEXT NOT NULL,
    "minScore" DECIMAL(8,2) NOT NULL,

    CONSTRAINT "CutoffRule_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CutoffRule_campusId_programId_roundNo_categoryCode_key" ON "CutoffRule"("campusId", "programId", "roundNo", "categoryCode");

-- AddForeignKey
ALTER TABLE "CutoffRule" ADD CONSTRAINT "CutoffRule_campusId_fkey" FOREIGN KEY ("campusId") REFERENCES "Campus"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CutoffRule" ADD CONSTRAINT "CutoffRule_programId_fkey" FOREIGN KEY ("programId") REFERENCES "Program"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
