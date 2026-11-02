CREATE TYPE "ExamFormKind" AS ENUM ('ATKT', 'REVAL');
CREATE TABLE "ExamFormWindow" (
    "id" TEXT NOT NULL,
    "campusId" TEXT NOT NULL,
    "kind" "ExamFormKind" NOT NULL,
    "examGroupId" TEXT NOT NULL,
    "opensAt" TIMESTAMP(3) NOT NULL,
    "closesAt" TIMESTAMP(3) NOT NULL,
    "feeAmount" DECIMAL(12,2) NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    CONSTRAINT "ExamFormWindow_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "ExamForm" (
    "id" TEXT NOT NULL,
    "campusId" TEXT NOT NULL,
    "windowId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "examGroupId" TEXT NOT NULL,
    "kind" "ExamFormKind" NOT NULL,
    "subjectIds" JSONB NOT NULL,
    "feeInvoiceId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ExamForm_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "ExamFormWindow_campusId_kind_idx" ON "ExamFormWindow"("campusId", "kind");
CREATE UNIQUE INDEX "ExamForm_studentId_examGroupId_kind_key" ON "ExamForm"("studentId", "examGroupId", "kind");
ALTER TABLE "ExamFormWindow" ADD CONSTRAINT "ExamFormWindow_campusId_fkey" FOREIGN KEY ("campusId") REFERENCES "Campus"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ExamFormWindow" ADD CONSTRAINT "ExamFormWindow_examGroupId_fkey" FOREIGN KEY ("examGroupId") REFERENCES "ExamGroup"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ExamForm" ADD CONSTRAINT "ExamForm_windowId_fkey" FOREIGN KEY ("windowId") REFERENCES "ExamFormWindow"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ExamForm" ADD CONSTRAINT "ExamForm_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ExamForm" ADD CONSTRAINT "ExamForm_examGroupId_fkey" FOREIGN KEY ("examGroupId") REFERENCES "ExamGroup"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
