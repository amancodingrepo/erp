CREATE TABLE "FrontOfficeType" (
    "id" TEXT NOT NULL,
    "campusId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    CONSTRAINT "FrontOfficeType_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "Enquiry" (
    "id" TEXT NOT NULL,
    "campusId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT,
    "email" TEXT,
    "source" TEXT,
    "classInterested" TEXT,
    "followUpOn" DATE,
    "remarks" TEXT,
    "status" TEXT NOT NULL DEFAULT 'UNASSIGNED',
    "assignedTo" TEXT,
    "applicationId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Enquiry_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "Visitor" (
    "id" TEXT NOT NULL,
    "campusId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT,
    "purpose" TEXT,
    "toMeet" TEXT,
    "inAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "outAt" TIMESTAMP(3),
    "note" TEXT,
    CONSTRAINT "Visitor_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "FrontOfficeType_campusId_kind_name_key" ON "FrontOfficeType"("campusId", "kind", "name");
CREATE INDEX "Enquiry_campusId_status_idx" ON "Enquiry"("campusId", "status");
CREATE INDEX "Visitor_campusId_inAt_idx" ON "Visitor"("campusId", "inAt");
ALTER TABLE "FrontOfficeType" ADD CONSTRAINT "FrontOfficeType_campusId_fkey" FOREIGN KEY ("campusId") REFERENCES "Campus"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Enquiry" ADD CONSTRAINT "Enquiry_campusId_fkey" FOREIGN KEY ("campusId") REFERENCES "Campus"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Visitor" ADD CONSTRAINT "Visitor_campusId_fkey" FOREIGN KEY ("campusId") REFERENCES "Campus"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
