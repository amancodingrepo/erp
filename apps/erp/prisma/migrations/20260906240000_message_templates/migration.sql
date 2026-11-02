CREATE TABLE "MessageTemplate" (
    "id" TEXT NOT NULL,
    "campusId" TEXT NOT NULL,
    "channel" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "subject" TEXT,
    "body" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "MessageTemplate_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "MessageLog" (
    "id" TEXT NOT NULL,
    "campusId" TEXT NOT NULL,
    "channel" TEXT NOT NULL,
    "templateId" TEXT,
    "studentId" TEXT,
    "toAddress" TEXT NOT NULL,
    "subject" TEXT,
    "body" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "MessageLog_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "MessageTemplate_campusId_channel_name_key" ON "MessageTemplate"("campusId", "channel", "name");
CREATE INDEX "MessageLog_campusId_createdAt_idx" ON "MessageLog"("campusId", "createdAt");
ALTER TABLE "MessageTemplate" ADD CONSTRAINT "MessageTemplate_campusId_fkey" FOREIGN KEY ("campusId") REFERENCES "Campus"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "MessageLog" ADD CONSTRAINT "MessageLog_campusId_fkey" FOREIGN KEY ("campusId") REFERENCES "Campus"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
