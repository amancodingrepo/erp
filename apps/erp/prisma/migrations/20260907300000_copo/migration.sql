CREATE TYPE "ProgramOutcomeKind" AS ENUM ('PO', 'PSO');
CREATE TYPE "CopoLessonStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'APPROVED', 'REJECTED');
CREATE TABLE "ProgramOutcome" (
    "id" TEXT NOT NULL,
    "campusId" TEXT NOT NULL,
    "programId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "kind" "ProgramOutcomeKind" NOT NULL DEFAULT 'PO',
    CONSTRAINT "ProgramOutcome_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "CourseOutcome" (
    "id" TEXT NOT NULL,
    "campusId" TEXT NOT NULL,
    "subjectId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    CONSTRAINT "CourseOutcome_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "CoPoMapping" (
    "id" TEXT NOT NULL,
    "courseOutcomeId" TEXT NOT NULL,
    "programOutcomeId" TEXT NOT NULL,
    "weight" INTEGER NOT NULL,
    CONSTRAINT "CoPoMapping_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "CoAssessment" (
    "id" TEXT NOT NULL,
    "courseOutcomeId" TEXT NOT NULL,
    "examSubjectId" TEXT NOT NULL,
    CONSTRAINT "CoAssessment_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "IndirectPoScore" (
    "id" TEXT NOT NULL,
    "programOutcomeId" TEXT NOT NULL,
    "percent" DECIMAL(5,2) NOT NULL,
    CONSTRAINT "IndirectPoScore_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "CopoLesson" (
    "id" TEXT NOT NULL,
    "campusId" TEXT NOT NULL,
    "subjectId" TEXT NOT NULL,
    "courseOutcomeId" TEXT,
    "title" TEXT NOT NULL,
    "status" "CopoLessonStatus" NOT NULL DEFAULT 'SUBMITTED',
    CONSTRAINT "CopoLesson_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "ProgramOutcome_programId_code_key" ON "ProgramOutcome"("programId", "code");
CREATE UNIQUE INDEX "CourseOutcome_subjectId_code_key" ON "CourseOutcome"("subjectId", "code");
CREATE UNIQUE INDEX "CoPoMapping_courseOutcomeId_programOutcomeId_key" ON "CoPoMapping"("courseOutcomeId", "programOutcomeId");
CREATE UNIQUE INDEX "CoAssessment_courseOutcomeId_examSubjectId_key" ON "CoAssessment"("courseOutcomeId", "examSubjectId");
CREATE UNIQUE INDEX "IndirectPoScore_programOutcomeId_key" ON "IndirectPoScore"("programOutcomeId");
ALTER TABLE "ProgramOutcome" ADD CONSTRAINT "ProgramOutcome_campusId_fkey" FOREIGN KEY ("campusId") REFERENCES "Campus"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ProgramOutcome" ADD CONSTRAINT "ProgramOutcome_programId_fkey" FOREIGN KEY ("programId") REFERENCES "Program"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "CourseOutcome" ADD CONSTRAINT "CourseOutcome_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "Subject"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "CoPoMapping" ADD CONSTRAINT "CoPoMapping_courseOutcomeId_fkey" FOREIGN KEY ("courseOutcomeId") REFERENCES "CourseOutcome"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "CoPoMapping" ADD CONSTRAINT "CoPoMapping_programOutcomeId_fkey" FOREIGN KEY ("programOutcomeId") REFERENCES "ProgramOutcome"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "CoAssessment" ADD CONSTRAINT "CoAssessment_courseOutcomeId_fkey" FOREIGN KEY ("courseOutcomeId") REFERENCES "CourseOutcome"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "CoAssessment" ADD CONSTRAINT "CoAssessment_examSubjectId_fkey" FOREIGN KEY ("examSubjectId") REFERENCES "ExamSubject"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "IndirectPoScore" ADD CONSTRAINT "IndirectPoScore_programOutcomeId_fkey" FOREIGN KEY ("programOutcomeId") REFERENCES "ProgramOutcome"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "CopoLesson" ADD CONSTRAINT "CopoLesson_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "Subject"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "CopoLesson" ADD CONSTRAINT "CopoLesson_courseOutcomeId_fkey" FOREIGN KEY ("courseOutcomeId") REFERENCES "CourseOutcome"("id") ON DELETE SET NULL ON UPDATE CASCADE;
