-- CreateEnum
CREATE TYPE "ApplicationStatus" AS ENUM ('APPLIED', 'FEE_PAID', 'ENROLLED', 'REJECTED');

-- CreateTable
CREATE TABLE "Application" (
    "id" TEXT NOT NULL,
    "campusId" TEXT NOT NULL,
    "applicationNo" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT,
    "email" TEXT,
    "mobile" TEXT,
    "dob" DATE,
    "gender" "Gender",
    "fatherName" TEXT,
    "programId" TEXT,
    "feeAmount" DECIMAL(12,2) NOT NULL,
    "feePaid" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "paymentStatus" TEXT NOT NULL DEFAULT 'UNPAID',
    "paymentMethod" TEXT,
    "status" "ApplicationStatus" NOT NULL DEFAULT 'APPLIED',
    "studentId" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Application_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Application_studentId_key" ON "Application"("studentId");

-- CreateIndex
CREATE UNIQUE INDEX "Application_campusId_applicationNo_key" ON "Application"("campusId", "applicationNo");

-- CreateIndex
CREATE INDEX "Application_campusId_status_idx" ON "Application"("campusId", "status");

-- AddForeignKey
ALTER TABLE "Application" ADD CONSTRAINT "Application_campusId_fkey" FOREIGN KEY ("campusId") REFERENCES "Campus"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Application" ADD CONSTRAINT "Application_programId_fkey" FOREIGN KEY ("programId") REFERENCES "Program"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Application" ADD CONSTRAINT "Application_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE SET NULL ON UPDATE CASCADE;
