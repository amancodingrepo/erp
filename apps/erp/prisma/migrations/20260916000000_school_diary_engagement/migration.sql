ALTER TABLE "StudentTransport" ADD COLUMN "outRouteId" TEXT;
ALTER TABLE "StudentTransport" ADD COLUMN "outPickupPointId" TEXT;

CREATE TABLE "StudentDaycare" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "enrolled" BOOLEAN NOT NULL DEFAULT false,
    "checkIn" TEXT,
    "checkOut" TEXT,
    "allowCctv" BOOLEAN NOT NULL DEFAULT false,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StudentDaycare_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "StudentDaycare_studentId_key" ON "StudentDaycare"("studentId");

CREATE TABLE "ImmunizationRecord" (
    "id" TEXT NOT NULL,
    "campusId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "vaccineName" TEXT NOT NULL,
    "scheduleDate" DATE,
    "administeredDate" DATE,
    "remarks" TEXT,
    "status" TEXT NOT NULL DEFAULT 'SCHEDULED',
    "imageUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ImmunizationRecord_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ImmunizationRecord_campusId_studentId_idx" ON "ImmunizationRecord"("campusId", "studentId");

CREATE TABLE "ParentRequest" (
    "id" TEXT NOT NULL,
    "campusId" TEXT NOT NULL,
    "authorUserId" TEXT NOT NULL,
    "studentId" TEXT,
    "recipientUserId" TEXT,
    "classId" TEXT,
    "body" TEXT NOT NULL,
    "attachmentUrl" TEXT,
    "hashTag" TEXT,
    "category" TEXT NOT NULL DEFAULT 'Others',
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "scheduledAt" TIMESTAMP(3),
    "deliveredAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ParentRequest_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ParentRequest_campusId_createdAt_idx" ON "ParentRequest"("campusId", "createdAt");
CREATE INDEX "ParentRequest_campusId_status_idx" ON "ParentRequest"("campusId", "status");

CREATE TABLE "ParentRequestRead" (
    "requestId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "readAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ParentRequestRead_pkey" PRIMARY KEY ("requestId","userId")
);

CREATE TABLE "NoticeRead" (
    "noticeId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "studentId" TEXT,
    "readAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "NoticeRead_pkey" PRIMARY KEY ("noticeId","userId")
);

CREATE INDEX "NoticeRead_noticeId_idx" ON "NoticeRead"("noticeId");

ALTER TABLE "StudentTransport" ADD CONSTRAINT "StudentTransport_outRouteId_fkey" FOREIGN KEY ("outRouteId") REFERENCES "TransportRoute"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "StudentTransport" ADD CONSTRAINT "StudentTransport_outPickupPointId_fkey" FOREIGN KEY ("outPickupPointId") REFERENCES "PickupPoint"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "StudentDaycare" ADD CONSTRAINT "StudentDaycare_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "ImmunizationRecord" ADD CONSTRAINT "ImmunizationRecord_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "ParentRequest" ADD CONSTRAINT "ParentRequest_campusId_fkey" FOREIGN KEY ("campusId") REFERENCES "Campus"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ParentRequest" ADD CONSTRAINT "ParentRequest_authorUserId_fkey" FOREIGN KEY ("authorUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ParentRequest" ADD CONSTRAINT "ParentRequest_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ParentRequest" ADD CONSTRAINT "ParentRequest_recipientUserId_fkey" FOREIGN KEY ("recipientUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "ParentRequestRead" ADD CONSTRAINT "ParentRequestRead_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "ParentRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ParentRequestRead" ADD CONSTRAINT "ParentRequestRead_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "NoticeRead" ADD CONSTRAINT "NoticeRead_noticeId_fkey" FOREIGN KEY ("noticeId") REFERENCES "Notice"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "FeeInvoiceLine" ADD CONSTRAINT "FeeInvoiceLine_feeTypeId_fkey" FOREIGN KEY ("feeTypeId") REFERENCES "FeeType"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
