CREATE TABLE "House" (
    "id" TEXT NOT NULL,
    "campusId" TEXT NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "House_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "House_campusId_name_key" ON "House"("campusId", "name");

ALTER TABLE "House" ADD CONSTRAINT "House_campusId_fkey" FOREIGN KEY ("campusId") REFERENCES "Campus"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "Student" ADD COLUMN "janAadhaar" TEXT;
ALTER TABLE "Student" ADD COLUMN "scholarNo" TEXT;
ALTER TABLE "Student" ADD COLUMN "sssmId" TEXT;
ALTER TABLE "Student" ADD COLUMN "pen" TEXT;
ALTER TABLE "Student" ADD COLUMN "apaarId" TEXT;
ALTER TABLE "Student" ADD COLUMN "grn" TEXT;
ALTER TABLE "Student" ADD COLUMN "saralId" TEXT;
ALTER TABLE "Student" ADD COLUMN "bloodGroup" TEXT;
ALTER TABLE "Student" ADD COLUMN "isRte" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Student" ADD COLUMN "isOnlyChild" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Student" ADD COLUMN "admittedClass" TEXT;
ALTER TABLE "Student" ADD COLUMN "annualIncome" TEXT;
ALTER TABLE "Student" ADD COLUMN "lunchFromSchool" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Student" ADD COLUMN "houseId" TEXT;
ALTER TABLE "Student" ADD COLUMN "isDefaulter" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Student" ADD COLUMN "rfid" TEXT;
ALTER TABLE "Student" ADD COLUMN "parentLoginEnabled" BOOLEAN NOT NULL DEFAULT true;

ALTER TABLE "Student" ADD CONSTRAINT "Student_houseId_fkey" FOREIGN KEY ("houseId") REFERENCES "House"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Notice" ADD COLUMN "channelKind" TEXT NOT NULL DEFAULT 'school';
ALTER TABLE "Notice" ADD COLUMN "type" TEXT NOT NULL DEFAULT 'news';
ALTER TABLE "Notice" ADD COLUMN "allowReply" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Notice" ADD COLUMN "hashTag" TEXT;
ALTER TABLE "Notice" ADD COLUMN "routeId" TEXT;

ALTER TABLE "ParentRequest" ADD COLUMN "threadId" TEXT;

ALTER TABLE "StudentDaycare" ADD COLUMN "lastCheckInAt" TIMESTAMP(3);
ALTER TABLE "StudentDaycare" ADD COLUMN "lastCheckOutAt" TIMESTAMP(3);

CREATE TABLE "DaycareVisit" (
    "id" TEXT NOT NULL,
    "daycareId" TEXT NOT NULL,
    "checkedInAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "checkedOutAt" TIMESTAMP(3),

    CONSTRAINT "DaycareVisit_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "DaycareVisit" ADD CONSTRAINT "DaycareVisit_daycareId_fkey" FOREIGN KEY ("daycareId") REFERENCES "StudentDaycare"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "CampusEvent" (
    "id" TEXT NOT NULL,
    "campusId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT,
    "classId" TEXT,
    "startsAt" TIMESTAMP(3) NOT NULL,
    "endsAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CampusEvent_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "CampusEvent_campusId_startsAt_idx" ON "CampusEvent"("campusId", "startsAt");

ALTER TABLE "CampusEvent" ADD CONSTRAINT "CampusEvent_campusId_fkey" FOREIGN KEY ("campusId") REFERENCES "Campus"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
