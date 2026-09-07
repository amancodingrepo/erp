CREATE TYPE "FeedbackFieldKind" AS ENUM ('RATING', 'TEXT', 'MCQ');
CREATE TYPE "FeedbackAudience" AS ENUM ('STUDENT', 'STAFF', 'ALL');
CREATE TABLE "FeedbackForm" (
    "id" TEXT NOT NULL,
    "campusId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    CONSTRAINT "FeedbackForm_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "FeedbackField" (
    "id" TEXT NOT NULL,
    "formId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "kind" "FeedbackFieldKind" NOT NULL,
    "options" JSONB,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "FeedbackField_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "FeedbackAssignment" (
    "id" TEXT NOT NULL,
    "formId" TEXT NOT NULL,
    "classId" TEXT,
    "audience" "FeedbackAudience" NOT NULL DEFAULT 'STUDENT',
    "opensAt" TIMESTAMP(3) NOT NULL,
    "closesAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "FeedbackAssignment_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "FeedbackResponse" (
    "id" TEXT NOT NULL,
    "assignmentId" TEXT NOT NULL,
    "formId" TEXT NOT NULL,
    "respondentId" TEXT NOT NULL,
    "answers" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "FeedbackResponse_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "FeedbackResponse_assignmentId_respondentId_key" ON "FeedbackResponse"("assignmentId", "respondentId");
ALTER TABLE "FeedbackForm" ADD CONSTRAINT "FeedbackForm_campusId_fkey" FOREIGN KEY ("campusId") REFERENCES "Campus"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "FeedbackField" ADD CONSTRAINT "FeedbackField_formId_fkey" FOREIGN KEY ("formId") REFERENCES "FeedbackForm"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "FeedbackAssignment" ADD CONSTRAINT "FeedbackAssignment_formId_fkey" FOREIGN KEY ("formId") REFERENCES "FeedbackForm"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "FeedbackAssignment" ADD CONSTRAINT "FeedbackAssignment_classId_fkey" FOREIGN KEY ("classId") REFERENCES "Class"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "FeedbackResponse" ADD CONSTRAINT "FeedbackResponse_assignmentId_fkey" FOREIGN KEY ("assignmentId") REFERENCES "FeedbackAssignment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "FeedbackResponse" ADD CONSTRAINT "FeedbackResponse_formId_fkey" FOREIGN KEY ("formId") REFERENCES "FeedbackForm"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
