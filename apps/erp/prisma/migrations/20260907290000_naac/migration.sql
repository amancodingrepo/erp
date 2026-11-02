CREATE TYPE "NaacAssignmentStatus" AS ENUM ('OPEN', 'DONE');
CREATE TABLE "NaacCriterion" (
    "id" TEXT NOT NULL,
    "campusId" TEXT NOT NULL,
    "number" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    CONSTRAINT "NaacCriterion_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "NaacTask" (
    "id" TEXT NOT NULL,
    "campusId" TEXT NOT NULL,
    "criterionId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "keyIndicator" TEXT,
    "dueOn" DATE,
    "evidenceRequired" BOOLEAN NOT NULL DEFAULT true,
    CONSTRAINT "NaacTask_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "NaacAssignment" (
    "id" TEXT NOT NULL,
    "taskId" TEXT NOT NULL,
    "staffId" TEXT NOT NULL,
    "status" "NaacAssignmentStatus" NOT NULL DEFAULT 'OPEN',
    CONSTRAINT "NaacAssignment_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "NaacEvidence" (
    "id" TEXT NOT NULL,
    "taskId" TEXT NOT NULL,
    "note" TEXT,
    "fileUrl" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "NaacEvidence_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "NaacCriterion_campusId_number_key" ON "NaacCriterion"("campusId", "number");
CREATE INDEX "NaacTask_campusId_criterionId_idx" ON "NaacTask"("campusId", "criterionId");
CREATE UNIQUE INDEX "NaacAssignment_taskId_staffId_key" ON "NaacAssignment"("taskId", "staffId");
ALTER TABLE "NaacCriterion" ADD CONSTRAINT "NaacCriterion_campusId_fkey" FOREIGN KEY ("campusId") REFERENCES "Campus"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "NaacTask" ADD CONSTRAINT "NaacTask_criterionId_fkey" FOREIGN KEY ("criterionId") REFERENCES "NaacCriterion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "NaacAssignment" ADD CONSTRAINT "NaacAssignment_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "NaacTask"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "NaacAssignment" ADD CONSTRAINT "NaacAssignment_staffId_fkey" FOREIGN KEY ("staffId") REFERENCES "Staff"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "NaacEvidence" ADD CONSTRAINT "NaacEvidence_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "NaacTask"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
