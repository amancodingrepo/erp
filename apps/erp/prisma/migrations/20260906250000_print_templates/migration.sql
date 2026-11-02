CREATE TABLE "PrintTemplate" (
    "id" TEXT NOT NULL,
    "campusId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PrintTemplate_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CertificateIssue" (
    "id" TEXT NOT NULL,
    "campusId" TEXT NOT NULL,
    "templateId" TEXT,
    "studentId" TEXT,
    "staffId" TEXT,
    "title" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CertificateIssue_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "PrintTemplate_campusId_kind_name_key" ON "PrintTemplate"("campusId", "kind", "name");
CREATE INDEX "CertificateIssue_campusId_createdAt_idx" ON "CertificateIssue"("campusId", "createdAt");
ALTER TABLE "PrintTemplate" ADD CONSTRAINT "PrintTemplate_campusId_fkey" FOREIGN KEY ("campusId") REFERENCES "Campus"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "CertificateIssue" ADD CONSTRAINT "CertificateIssue_campusId_fkey" FOREIGN KEY ("campusId") REFERENCES "Campus"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
