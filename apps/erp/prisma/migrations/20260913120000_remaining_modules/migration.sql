-- Remaining campus-scoped modules.

CREATE TABLE "CanteenOutlet" (
    "id" TEXT NOT NULL,
    "campusId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT,
    CONSTRAINT "CanteenOutlet_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "CanteenOutlet_campusId_name_key" ON "CanteenOutlet"("campusId", "name");
ALTER TABLE "CanteenOutlet" ADD CONSTRAINT "CanteenOutlet_campusId_fkey" FOREIGN KEY ("campusId") REFERENCES "Campus"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "CanteenMenuType" (
    "id" TEXT NOT NULL,
    "campusId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    CONSTRAINT "CanteenMenuType_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "CanteenMenuType_campusId_name_key" ON "CanteenMenuType"("campusId", "name");
ALTER TABLE "CanteenMenuType" ADD CONSTRAINT "CanteenMenuType_campusId_fkey" FOREIGN KEY ("campusId") REFERENCES "Campus"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "CanteenFoodItem" (
    "id" TEXT NOT NULL,
    "campusId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "price" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    CONSTRAINT "CanteenFoodItem_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "CanteenFoodItem_campusId_name_idx" ON "CanteenFoodItem"("campusId", "name");
ALTER TABLE "CanteenFoodItem" ADD CONSTRAINT "CanteenFoodItem_campusId_fkey" FOREIGN KEY ("campusId") REFERENCES "Campus"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "CanteenMenu" (
    "id" TEXT NOT NULL,
    "campusId" TEXT NOT NULL,
    "outletId" TEXT NOT NULL,
    "menuTypeId" TEXT,
    "name" TEXT NOT NULL,
    "servedOn" DATE,
    "itemIds" JSONB NOT NULL,
    CONSTRAINT "CanteenMenu_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "CanteenMenu_campusId_servedOn_idx" ON "CanteenMenu"("campusId", "servedOn");
ALTER TABLE "CanteenMenu" ADD CONSTRAINT "CanteenMenu_campusId_fkey" FOREIGN KEY ("campusId") REFERENCES "Campus"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "CanteenMenu" ADD CONSTRAINT "CanteenMenu_outletId_fkey" FOREIGN KEY ("outletId") REFERENCES "CanteenOutlet"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "CanteenMenu" ADD CONSTRAINT "CanteenMenu_menuTypeId_fkey" FOREIGN KEY ("menuTypeId") REFERENCES "CanteenMenuType"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "CanteenCoupon" (
    "id" TEXT NOT NULL,
    "campusId" TEXT NOT NULL,
    "outletId" TEXT,
    "studentId" TEXT,
    "code" TEXT NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "redeemedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CanteenCoupon_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "CanteenCoupon_campusId_code_key" ON "CanteenCoupon"("campusId", "code");
ALTER TABLE "CanteenCoupon" ADD CONSTRAINT "CanteenCoupon_campusId_fkey" FOREIGN KEY ("campusId") REFERENCES "Campus"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "CanteenCoupon" ADD CONSTRAINT "CanteenCoupon_outletId_fkey" FOREIGN KEY ("outletId") REFERENCES "CanteenOutlet"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "RailwayConcession" (
    "id" TEXT NOT NULL,
    "campusId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "fromStation" TEXT NOT NULL,
    "toStation" TEXT NOT NULL,
    "className" TEXT NOT NULL DEFAULT 'SECOND',
    "periodFrom" DATE,
    "periodTo" DATE,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "RailwayConcession_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "RailwayConcession_campusId_status_idx" ON "RailwayConcession"("campusId", "status");
ALTER TABLE "RailwayConcession" ADD CONSTRAINT "RailwayConcession_campusId_fkey" FOREIGN KEY ("campusId") REFERENCES "Campus"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "LmsCategory" (
    "id" TEXT NOT NULL,
    "campusId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    CONSTRAINT "LmsCategory_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "LmsCategory_campusId_name_key" ON "LmsCategory"("campusId", "name");
ALTER TABLE "LmsCategory" ADD CONSTRAINT "LmsCategory_campusId_fkey" FOREIGN KEY ("campusId") REFERENCES "Campus"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "LmsCourse" (
    "id" TEXT NOT NULL,
    "campusId" TEXT NOT NULL,
    "categoryId" TEXT,
    "title" TEXT NOT NULL,
    "price" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "published" BOOLEAN NOT NULL DEFAULT true,
    CONSTRAINT "LmsCourse_pkey" PRIMARY KEY ("id")
);
ALTER TABLE "LmsCourse" ADD CONSTRAINT "LmsCourse_campusId_fkey" FOREIGN KEY ("campusId") REFERENCES "Campus"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "LmsCourse" ADD CONSTRAINT "LmsCourse_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "LmsCategory"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "LmsEnrollment" (
    "id" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "paid" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "LmsEnrollment_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "LmsEnrollment_courseId_studentId_key" ON "LmsEnrollment"("courseId", "studentId");
ALTER TABLE "LmsEnrollment" ADD CONSTRAINT "LmsEnrollment_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "LmsCourse"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "LmsQuestion" (
    "id" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "options" JSONB NOT NULL,
    "answer" TEXT NOT NULL,
    CONSTRAINT "LmsQuestion_pkey" PRIMARY KEY ("id")
);
ALTER TABLE "LmsQuestion" ADD CONSTRAINT "LmsQuestion_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "LmsCourse"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "OnlineExamBank" (
    "id" TEXT NOT NULL,
    "campusId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "durationMin" INTEGER NOT NULL DEFAULT 60,
    "published" BOOLEAN NOT NULL DEFAULT true,
    CONSTRAINT "OnlineExamBank_pkey" PRIMARY KEY ("id")
);
ALTER TABLE "OnlineExamBank" ADD CONSTRAINT "OnlineExamBank_campusId_fkey" FOREIGN KEY ("campusId") REFERENCES "Campus"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "OnlineExamQuestion" (
    "id" TEXT NOT NULL,
    "examId" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "options" JSONB NOT NULL,
    "answer" TEXT NOT NULL,
    "marks" INTEGER NOT NULL DEFAULT 1,
    CONSTRAINT "OnlineExamQuestion_pkey" PRIMARY KEY ("id")
);
ALTER TABLE "OnlineExamQuestion" ADD CONSTRAINT "OnlineExamQuestion_examId_fkey" FOREIGN KEY ("examId") REFERENCES "OnlineExamBank"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "OnlineExamAttempt" (
    "id" TEXT NOT NULL,
    "examId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "answers" JSONB,
    "score" DECIMAL(8,2),
    "submittedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "OnlineExamAttempt_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "OnlineExamAttempt_examId_studentId_key" ON "OnlineExamAttempt"("examId", "studentId");
ALTER TABLE "OnlineExamAttempt" ADD CONSTRAINT "OnlineExamAttempt_examId_fkey" FOREIGN KEY ("examId") REFERENCES "OnlineExamBank"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "JobPosting" (
    "id" TEXT NOT NULL,
    "campusId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "department" TEXT,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "closesOn" DATE,
    CONSTRAINT "JobPosting_pkey" PRIMARY KEY ("id")
);
ALTER TABLE "JobPosting" ADD CONSTRAINT "JobPosting_campusId_fkey" FOREIGN KEY ("campusId") REFERENCES "Campus"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "JobApplicant" (
    "id" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "status" TEXT NOT NULL DEFAULT 'APPLIED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "JobApplicant_pkey" PRIMARY KEY ("id")
);
ALTER TABLE "JobApplicant" ADD CONSTRAINT "JobApplicant_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "JobPosting"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "ItemCategory" (
    "id" TEXT NOT NULL,
    "campusId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    CONSTRAINT "ItemCategory_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "ItemCategory_campusId_name_key" ON "ItemCategory"("campusId", "name");
ALTER TABLE "ItemCategory" ADD CONSTRAINT "ItemCategory_campusId_fkey" FOREIGN KEY ("campusId") REFERENCES "Campus"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "ItemStore" (
    "id" TEXT NOT NULL,
    "campusId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    CONSTRAINT "ItemStore_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "ItemStore_campusId_name_key" ON "ItemStore"("campusId", "name");
ALTER TABLE "ItemStore" ADD CONSTRAINT "ItemStore_campusId_fkey" FOREIGN KEY ("campusId") REFERENCES "Campus"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "ItemSupplier" (
    "id" TEXT NOT NULL,
    "campusId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT,
    CONSTRAINT "ItemSupplier_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "ItemSupplier_campusId_name_key" ON "ItemSupplier"("campusId", "name");
ALTER TABLE "ItemSupplier" ADD CONSTRAINT "ItemSupplier_campusId_fkey" FOREIGN KEY ("campusId") REFERENCES "Campus"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "InventoryItem" (
    "id" TEXT NOT NULL,
    "campusId" TEXT NOT NULL,
    "categoryId" TEXT,
    "name" TEXT NOT NULL,
    "unit" TEXT NOT NULL DEFAULT 'pcs',
    CONSTRAINT "InventoryItem_pkey" PRIMARY KEY ("id")
);
ALTER TABLE "InventoryItem" ADD CONSTRAINT "InventoryItem_campusId_fkey" FOREIGN KEY ("campusId") REFERENCES "Campus"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "InventoryItem" ADD CONSTRAINT "InventoryItem_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "ItemCategory"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "ItemStock" (
    "id" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "qty" INTEGER NOT NULL DEFAULT 0,
    "note" TEXT,
    CONSTRAINT "ItemStock_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "ItemStock_itemId_storeId_key" ON "ItemStock"("itemId", "storeId");
ALTER TABLE "ItemStock" ADD CONSTRAINT "ItemStock_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "InventoryItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ItemStock" ADD CONSTRAINT "ItemStock_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "ItemStore"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "ItemIssue" (
    "id" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "studentId" TEXT,
    "staffId" TEXT,
    "qty" INTEGER NOT NULL,
    "issuedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "returnedAt" TIMESTAMP(3),
    CONSTRAINT "ItemIssue_pkey" PRIMARY KEY ("id")
);
ALTER TABLE "ItemIssue" ADD CONSTRAINT "ItemIssue_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "InventoryItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "SupportTopic" (
    "id" TEXT NOT NULL,
    "campusId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    CONSTRAINT "SupportTopic_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "SupportTopic_campusId_name_key" ON "SupportTopic"("campusId", "name");
ALTER TABLE "SupportTopic" ADD CONSTRAINT "SupportTopic_campusId_fkey" FOREIGN KEY ("campusId") REFERENCES "Campus"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "SupportTicket" (
    "id" TEXT NOT NULL,
    "topicId" TEXT NOT NULL,
    "studentId" TEXT,
    "title" TEXT NOT NULL,
    "body" TEXT,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "SupportTicket_pkey" PRIMARY KEY ("id")
);
ALTER TABLE "SupportTicket" ADD CONSTRAINT "SupportTicket_topicId_fkey" FOREIGN KEY ("topicId") REFERENCES "SupportTopic"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "ChatThread" (
    "id" TEXT NOT NULL,
    "campusId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "studentId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ChatThread_pkey" PRIMARY KEY ("id")
);
ALTER TABLE "ChatThread" ADD CONSTRAINT "ChatThread_campusId_fkey" FOREIGN KEY ("campusId") REFERENCES "Campus"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "ChatMessage" (
    "id" TEXT NOT NULL,
    "threadId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ChatMessage_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "ChatMessage_threadId_createdAt_idx" ON "ChatMessage"("threadId", "createdAt");
ALTER TABLE "ChatMessage" ADD CONSTRAINT "ChatMessage_threadId_fkey" FOREIGN KEY ("threadId") REFERENCES "ChatThread"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "Alumnus" (
    "id" TEXT NOT NULL,
    "campusId" TEXT NOT NULL,
    "studentId" TEXT,
    "name" TEXT NOT NULL,
    "year" TEXT,
    "email" TEXT,
    "phone" TEXT,
    CONSTRAINT "Alumnus_pkey" PRIMARY KEY ("id")
);
ALTER TABLE "Alumnus" ADD CONSTRAINT "Alumnus_campusId_fkey" FOREIGN KEY ("campusId") REFERENCES "Campus"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "AlumniEvent" (
    "id" TEXT NOT NULL,
    "campusId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "heldOn" DATE,
    "venue" TEXT,
    CONSTRAINT "AlumniEvent_pkey" PRIMARY KEY ("id")
);
ALTER TABLE "AlumniEvent" ADD CONSTRAINT "AlumniEvent_campusId_fkey" FOREIGN KEY ("campusId") REFERENCES "Campus"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "MentorAssignment" (
    "id" TEXT NOT NULL,
    "campusId" TEXT NOT NULL,
    "staffId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    CONSTRAINT "MentorAssignment_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "MentorAssignment_campusId_staffId_studentId_key" ON "MentorAssignment"("campusId", "staffId", "studentId");
ALTER TABLE "MentorAssignment" ADD CONSTRAINT "MentorAssignment_campusId_fkey" FOREIGN KEY ("campusId") REFERENCES "Campus"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "MentorProject" (
    "id" TEXT NOT NULL,
    "campusId" TEXT NOT NULL,
    "staffId" TEXT,
    "studentId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "kind" TEXT NOT NULL DEFAULT 'PROJECT',
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "chapter" TEXT,
    CONSTRAINT "MentorProject_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CmsPage" (
    "id" TEXT NOT NULL,
    "campusId" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "kind" TEXT NOT NULL DEFAULT 'page',
    "published" BOOLEAN NOT NULL DEFAULT true,
    CONSTRAINT "CmsPage_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "CmsPage_campusId_slug_key" ON "CmsPage"("campusId", "slug");
ALTER TABLE "CmsPage" ADD CONSTRAINT "CmsPage_campusId_fkey" FOREIGN KEY ("campusId") REFERENCES "Campus"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "FinanceHead" (
    "id" TEXT NOT NULL,
    "campusId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    CONSTRAINT "FinanceHead_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "FinanceHead_campusId_kind_name_key" ON "FinanceHead"("campusId", "kind", "name");
ALTER TABLE "FinanceHead" ADD CONSTRAINT "FinanceHead_campusId_fkey" FOREIGN KEY ("campusId") REFERENCES "Campus"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "FinanceEntry" (
    "id" TEXT NOT NULL,
    "headId" TEXT NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "entryOn" DATE NOT NULL,
    "description" TEXT,
    CONSTRAINT "FinanceEntry_pkey" PRIMARY KEY ("id")
);
ALTER TABLE "FinanceEntry" ADD CONSTRAINT "FinanceEntry_headId_fkey" FOREIGN KEY ("headId") REFERENCES "FinanceHead"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "TnpCompany" (
    "id" TEXT NOT NULL,
    "campusId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "sector" TEXT,
    "contact" TEXT,
    CONSTRAINT "TnpCompany_pkey" PRIMARY KEY ("id")
);
ALTER TABLE "TnpCompany" ADD CONSTRAINT "TnpCompany_campusId_fkey" FOREIGN KEY ("campusId") REFERENCES "Campus"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "TnpDrive" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "heldOn" DATE,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    CONSTRAINT "TnpDrive_pkey" PRIMARY KEY ("id")
);
ALTER TABLE "TnpDrive" ADD CONSTRAINT "TnpDrive_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "TnpCompany"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "StudentResume" (
    "id" TEXT NOT NULL,
    "campusId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "headline" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    CONSTRAINT "StudentResume_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "StudentResume_campusId_studentId_key" ON "StudentResume"("campusId", "studentId");

CREATE TABLE "ActivityEvent" (
    "id" TEXT NOT NULL,
    "campusId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "heldOn" DATE,
    "venue" TEXT,
    "notes" TEXT,
    CONSTRAINT "ActivityEvent_pkey" PRIMARY KEY ("id")
);
ALTER TABLE "ActivityEvent" ADD CONSTRAINT "ActivityEvent_campusId_fkey" FOREIGN KEY ("campusId") REFERENCES "Campus"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "LessonPlan" (
    "id" TEXT NOT NULL,
    "campusId" TEXT NOT NULL,
    "classId" TEXT,
    "subjectId" TEXT,
    "title" TEXT NOT NULL,
    "topic" TEXT,
    "body" TEXT,
    "weekNo" INTEGER,
    CONSTRAINT "LessonPlan_pkey" PRIMARY KEY ("id")
);
ALTER TABLE "LessonPlan" ADD CONSTRAINT "LessonPlan_campusId_fkey" FOREIGN KEY ("campusId") REFERENCES "Campus"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "DownloadType" (
    "id" TEXT NOT NULL,
    "campusId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    CONSTRAINT "DownloadType_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "DownloadType_campusId_name_key" ON "DownloadType"("campusId", "name");
ALTER TABLE "DownloadType" ADD CONSTRAINT "DownloadType_campusId_fkey" FOREIGN KEY ("campusId") REFERENCES "Campus"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "SharedContent" (
    "id" TEXT NOT NULL,
    "typeId" TEXT,
    "campusId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "audience" TEXT NOT NULL DEFAULT 'all',
    CONSTRAINT "SharedContent_pkey" PRIMARY KEY ("id")
);
ALTER TABLE "SharedContent" ADD CONSTRAINT "SharedContent_typeId_fkey" FOREIGN KEY ("typeId") REFERENCES "DownloadType"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "BookableRoom" (
    "id" TEXT NOT NULL,
    "campusId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "capacity" INTEGER NOT NULL DEFAULT 20,
    CONSTRAINT "BookableRoom_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "BookableRoom_campusId_name_key" ON "BookableRoom"("campusId", "name");
ALTER TABLE "BookableRoom" ADD CONSTRAINT "BookableRoom_campusId_fkey" FOREIGN KEY ("campusId") REFERENCES "Campus"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "RoomBooking" (
    "id" TEXT NOT NULL,
    "roomId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "startAt" TIMESTAMP(3) NOT NULL,
    "endAt" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "requestedBy" TEXT,
    CONSTRAINT "RoomBooking_pkey" PRIMARY KEY ("id")
);
ALTER TABLE "RoomBooking" ADD CONSTRAINT "RoomBooking_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "BookableRoom"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
