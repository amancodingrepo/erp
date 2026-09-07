CREATE TYPE "LiveClassProvider" AS ENUM ('GMEET', 'ZOOM');
CREATE TABLE "LiveClass" (
    "id" TEXT NOT NULL,
    "campusId" TEXT NOT NULL,
    "provider" "LiveClassProvider" NOT NULL,
    "title" TEXT NOT NULL,
    "meetingUrl" TEXT NOT NULL,
    "recordingUrl" TEXT,
    "startsAt" TIMESTAMP(3) NOT NULL,
    "classId" TEXT,
    "subjectId" TEXT,
    "staffId" TEXT,
    CONSTRAINT "LiveClass_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "LiveClass_campusId_startsAt_idx" ON "LiveClass"("campusId", "startsAt");
ALTER TABLE "LiveClass" ADD CONSTRAINT "LiveClass_campusId_fkey" FOREIGN KEY ("campusId") REFERENCES "Campus"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "LiveClass" ADD CONSTRAINT "LiveClass_classId_fkey" FOREIGN KEY ("classId") REFERENCES "Class"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "LiveClass" ADD CONSTRAINT "LiveClass_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "Subject"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "LiveClass" ADD CONSTRAINT "LiveClass_staffId_fkey" FOREIGN KEY ("staffId") REFERENCES "Staff"("id") ON DELETE SET NULL ON UPDATE CASCADE;
