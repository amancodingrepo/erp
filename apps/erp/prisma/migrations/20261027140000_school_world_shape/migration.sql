-- School World fields and tables added onto the ERP schema.
-- Existing ERP tables and columns are kept.

ALTER TABLE "Campus" ADD COLUMN IF NOT EXISTS "slug" TEXT;
ALTER TABLE "Campus" ADD COLUMN IF NOT EXISTS "isActive" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "Campus" ADD COLUMN IF NOT EXISTS "logoFileName" TEXT;

ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "phone" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "firstName" TEXT NOT NULL DEFAULT '';
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "lastName" TEXT NOT NULL DEFAULT '';
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "mustChangePassword" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE "Student" ADD COLUMN IF NOT EXISTS "bloodGroup" TEXT;
ALTER TABLE "Student" ADD COLUMN IF NOT EXISTS "house" TEXT;
ALTER TABLE "Student" ADD COLUMN IF NOT EXISTS "pinCode" TEXT;
ALTER TABLE "Student" ADD COLUMN IF NOT EXISTS "alternatePhone" TEXT;
ALTER TABLE "Student" ADD COLUMN IF NOT EXISTS "feeDefaulter" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Student" ADD COLUMN IF NOT EXISTS "rfidNumber" TEXT;
ALTER TABLE "Student" ADD COLUMN IF NOT EXISTS "rfidMapped" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Student" ADD COLUMN IF NOT EXISTS "childIdActive" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "Student" ADD COLUMN IF NOT EXISTS "parentIdActive" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "Student" ADD COLUMN IF NOT EXISTS "motherName" TEXT;
ALTER TABLE "Student" ADD COLUMN IF NOT EXISTS "primaryParentName" TEXT;
ALTER TABLE "Student" ADD COLUMN IF NOT EXISTS "originalClass" TEXT;
ALTER TABLE "Student" ADD COLUMN IF NOT EXISTS "lastSeen" TEXT;
ALTER TABLE "Student" ADD COLUMN IF NOT EXISTS "details" JSONB;

ALTER TABLE "Subject" ADD COLUMN IF NOT EXISTS "categoryId" TEXT;
ALTER TABLE "Subject" ADD COLUMN IF NOT EXISTS "subjectTypeId" TEXT;

ALTER TABLE "Notice" ADD COLUMN IF NOT EXISTS "noticeType" TEXT NOT NULL DEFAULT 'News';
ALTER TABLE "Notice" ADD COLUMN IF NOT EXISTS "allowReply" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Notice" ADD COLUMN IF NOT EXISTS "authorName" TEXT NOT NULL DEFAULT '';
ALTER TABLE "Notice" ADD COLUMN IF NOT EXISTS "authorUserId" TEXT;
ALTER TABLE "Notice" ADD COLUMN IF NOT EXISTS "board" TEXT NOT NULL DEFAULT 'school';
ALTER TABLE "Notice" ADD COLUMN IF NOT EXISTS "audienceKey" TEXT NOT NULL DEFAULT 'all';
ALTER TABLE "Notice" ADD COLUMN IF NOT EXISTS "academicYear" TEXT NOT NULL DEFAULT '';

ALTER TABLE "StudentAttendance" ADD COLUMN IF NOT EXISTS "note" TEXT NOT NULL DEFAULT '';

ALTER TABLE "FeeType" ADD COLUMN IF NOT EXISTS "description" TEXT;
ALTER TABLE "FeeType" ADD COLUMN IF NOT EXISTS "isRecurring" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE "FeeMaster" ADD COLUMN IF NOT EXISTS "name" TEXT NOT NULL DEFAULT '';
ALTER TABLE "FeeMaster" ADD COLUMN IF NOT EXISTS "description" TEXT;
ALTER TABLE "FeeMaster" ADD COLUMN IF NOT EXISTS "classId" TEXT;

ALTER TABLE "FeeMasterLine" ADD COLUMN IF NOT EXISTS "installmentName" TEXT NOT NULL DEFAULT 'Single Installment';
ALTER TABLE "FeeMasterLine" ADD COLUMN IF NOT EXISTS "displayOrder" INTEGER NOT NULL DEFAULT 0;

ALTER TABLE "FeeInvoice" ADD COLUMN IF NOT EXISTS "reference" TEXT;

ALTER TABLE "FeeInvoiceLine" ADD COLUMN IF NOT EXISTS "installmentName" TEXT NOT NULL DEFAULT 'Single Installment';
ALTER TABLE "FeeInvoiceLine" ADD COLUMN IF NOT EXISTS "dueDate" DATE;
ALTER TABLE "FeeInvoiceLine" ADD COLUMN IF NOT EXISTS "reference" TEXT;
ALTER TABLE "FeeInvoiceLine" ADD COLUMN IF NOT EXISTS "metadata" JSONB;

ALTER TABLE "Payment" ADD COLUMN IF NOT EXISTS "cashDepositNumber" TEXT;
ALTER TABLE "Payment" ADD COLUMN IF NOT EXISTS "reversalReason" TEXT;

CREATE TABLE IF NOT EXISTS "AdmissionEnquiry" (
  "id" TEXT NOT NULL,
  "campusId" TEXT NOT NULL,
  "formNumber" TEXT NOT NULL,
  "academicYear" TEXT NOT NULL,
  "enquiryDate" DATE,
  "enquiryStatus" TEXT NOT NULL DEFAULT 'Cold Enquiry',
  "studentName" TEXT NOT NULL,
  "primaryContact" TEXT NOT NULL,
  "email" TEXT,
  "classApplied" TEXT,
  "data" JSONB NOT NULL DEFAULT '{}',
  "createdBy" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "AdmissionEnquiry_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "SchoolRoute" (
  "id" TEXT NOT NULL,
  "campusId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "stops" TEXT NOT NULL DEFAULT '',
  "vehicleNumber" TEXT NOT NULL DEFAULT '',
  "driverName" TEXT NOT NULL DEFAULT '',
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "SchoolRoute_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "NoticeAttachment" (
  "id" TEXT NOT NULL,
  "noticeId" TEXT NOT NULL,
  "fileName" TEXT NOT NULL,
  "contentType" TEXT NOT NULL DEFAULT 'application/octet-stream',
  "fileSize" INTEGER NOT NULL DEFAULT 0,
  "fileData" BYTEA NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "NoticeAttachment_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "NoticeView" (
  "id" TEXT NOT NULL,
  "noticeId" TEXT NOT NULL,
  "viewerUserId" TEXT NOT NULL,
  "viewedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "NoticeView_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "Event" (
  "id" TEXT NOT NULL,
  "campusId" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "detail" TEXT NOT NULL DEFAULT '',
  "eventDate" DATE,
  "createdBy" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Event_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "EventRecipient" (
  "id" TEXT NOT NULL,
  "eventId" TEXT NOT NULL,
  "userId" TEXT,
  "label" TEXT NOT NULL DEFAULT '',
  CONSTRAINT "EventRecipient_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "Message" (
  "id" TEXT NOT NULL,
  "campusId" TEXT NOT NULL,
  "batchId" TEXT NOT NULL,
  "senderId" TEXT,
  "subject" TEXT NOT NULL DEFAULT '',
  "body" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'sent',
  "scheduledAt" TIMESTAMP(3),
  "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Message_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "MessageRecipient" (
  "id" TEXT NOT NULL,
  "messageId" TEXT NOT NULL,
  "userId" TEXT,
  "readAt" TIMESTAMP(3),
  CONSTRAINT "MessageRecipient_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "MessageAttachment" (
  "id" TEXT NOT NULL,
  "messageId" TEXT NOT NULL,
  "fileName" TEXT NOT NULL,
  "contentType" TEXT NOT NULL DEFAULT 'application/octet-stream',
  "fileSize" INTEGER NOT NULL DEFAULT 0,
  "fileData" BYTEA NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "MessageAttachment_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "Questionnaire" (
  "id" TEXT NOT NULL,
  "campusId" TEXT NOT NULL,
  "title" TEXT NOT NULL DEFAULT '',
  "active" BOOLEAN NOT NULL DEFAULT true,
  "createdBy" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Questionnaire_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "QuestionnaireQuestion" (
  "id" TEXT NOT NULL,
  "questionnaireId" TEXT NOT NULL,
  "prompt" TEXT NOT NULL,
  "answerType" TEXT NOT NULL DEFAULT 'Text answer',
  "options" JSONB NOT NULL DEFAULT '[]',
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  CONSTRAINT "QuestionnaireQuestion_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "QuestionnaireResponse" (
  "id" TEXT NOT NULL,
  "questionnaireId" TEXT NOT NULL,
  "respondentUserId" TEXT NOT NULL,
  "answer" JSONB NOT NULL,
  "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "QuestionnaireResponse_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "StoreItem" (
  "id" TEXT NOT NULL,
  "campusId" TEXT NOT NULL,
  "itemCode" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "currentStock" INTEGER NOT NULL DEFAULT 0,
  "minimumStock" INTEGER NOT NULL DEFAULT 0,
  "metadata" JSONB NOT NULL DEFAULT '{}',
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "StoreItem_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "StoreVendor" (
  "id" TEXT NOT NULL,
  "campusId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "contactPerson" TEXT NOT NULL DEFAULT '',
  "phone" TEXT NOT NULL DEFAULT '',
  "email" TEXT NOT NULL DEFAULT '',
  "address" TEXT NOT NULL DEFAULT '',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "StoreVendor_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "StaffCategory" (
  "id" TEXT NOT NULL,
  "campusId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT NOT NULL DEFAULT '',
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  CONSTRAINT "StaffCategory_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "StaffCategoryAssignment" (
  "id" TEXT NOT NULL,
  "categoryId" TEXT NOT NULL,
  "staffId" TEXT NOT NULL,
  CONSTRAINT "StaffCategoryAssignment_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "CommunicationCategoryRestriction" (
  "id" TEXT NOT NULL,
  "campusId" TEXT NOT NULL,
  "categoryId" TEXT NOT NULL,
  "channel" TEXT NOT NULL,
  CONSTRAINT "CommunicationCategoryRestriction_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "ExternalLink" (
  "id" TEXT NOT NULL,
  "campusId" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "url" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ExternalLink_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "ExternalLinkClass" (
  "linkId" TEXT NOT NULL,
  "classId" TEXT NOT NULL,
  CONSTRAINT "ExternalLinkClass_pkey" PRIMARY KEY ("linkId","classId")
);

CREATE TABLE IF NOT EXISTS "SubjectCategory" (
  "id" TEXT NOT NULL,
  "campusId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  CONSTRAINT "SubjectCategory_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "SubjectType" (
  "id" TEXT NOT NULL,
  "campusId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  CONSTRAINT "SubjectType_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "SubjectTypeAssignment" (
  "subjectId" TEXT NOT NULL,
  "subjectTypeId" TEXT NOT NULL,
  CONSTRAINT "SubjectTypeAssignment_pkey" PRIMARY KEY ("subjectId","subjectTypeId")
);

CREATE TABLE IF NOT EXISTS "SubjectApplicableClass" (
  "subjectId" TEXT NOT NULL,
  "classId" TEXT NOT NULL,
  CONSTRAINT "SubjectApplicableClass_pkey" PRIMARY KEY ("subjectId","classId")
);

CREATE TABLE IF NOT EXISTS "StudentOptionalSubject" (
  "id" TEXT NOT NULL,
  "studentId" TEXT NOT NULL,
  "sessionId" TEXT NOT NULL,
  "classId" TEXT NOT NULL,
  "subjectId" TEXT NOT NULL,
  CONSTRAINT "StudentOptionalSubject_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "AdminTemplateCatalog" (
  "id" TEXT NOT NULL,
  "templateType" TEXT NOT NULL,
  "templateCode" TEXT NOT NULL,
  "templateName" TEXT NOT NULL,
  "version" INTEGER NOT NULL DEFAULT 1,
  "description" TEXT NOT NULL DEFAULT '',
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdByUserId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "AdminTemplateCatalog_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "FeeReceiptTemplateSettings" (
  "templateId" TEXT NOT NULL,
  "showSchoolLogo" BOOLEAN NOT NULL DEFAULT true,
  "showSchoolName" BOOLEAN NOT NULL DEFAULT true,
  "showSchoolAddress" BOOLEAN NOT NULL DEFAULT true,
  "showSchoolPhone" BOOLEAN NOT NULL DEFAULT true,
  "showSchoolEmail" BOOLEAN NOT NULL DEFAULT false,
  "showStudentName" BOOLEAN NOT NULL DEFAULT true,
  "showStudentCode" BOOLEAN NOT NULL DEFAULT true,
  "showClassSection" BOOLEAN NOT NULL DEFAULT true,
  "showAcademicYear" BOOLEAN NOT NULL DEFAULT true,
  "showParentName" BOOLEAN NOT NULL DEFAULT true,
  "showFeeBreakdown" BOOLEAN NOT NULL DEFAULT true,
  "showPaymentMethod" BOOLEAN NOT NULL DEFAULT true,
  "showReceiptNumber" BOOLEAN NOT NULL DEFAULT true,
  "showPaymentReference" BOOLEAN NOT NULL DEFAULT true,
  "showPaidAmount" BOOLEAN NOT NULL DEFAULT true,
  "showBalance" BOOLEAN NOT NULL DEFAULT false,
  "showSignatureLine" BOOLEAN NOT NULL DEFAULT true,
  "pageOrientation" TEXT NOT NULL DEFAULT 'portrait',
  "headerText" TEXT NOT NULL DEFAULT 'FEE RECEIPT',
  "footerText" TEXT NOT NULL DEFAULT 'Thank you for your payment.',
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "FeeReceiptTemplateSettings_pkey" PRIMARY KEY ("templateId")
);

CREATE TABLE IF NOT EXISTS "FeeReceiptTemplateNote" (
  "id" TEXT NOT NULL,
  "templateId" TEXT NOT NULL,
  "noteText" TEXT NOT NULL,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  CONSTRAINT "FeeReceiptTemplateNote_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "PerformanceTemplateSettings" (
  "templateId" TEXT NOT NULL,
  "academicYear" TEXT NOT NULL DEFAULT '',
  "reportTitle" TEXT NOT NULL DEFAULT 'Student Performance Report',
  "showStudentPhoto" BOOLEAN NOT NULL DEFAULT false,
  "showMarks" BOOLEAN NOT NULL DEFAULT true,
  "showGrade" BOOLEAN NOT NULL DEFAULT true,
  "showRemarks" BOOLEAN NOT NULL DEFAULT true,
  "footerText" TEXT NOT NULL DEFAULT '',
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "PerformanceTemplateSettings_pkey" PRIMARY KEY ("templateId")
);

CREATE TABLE IF NOT EXISTS "PerformanceTemplateTerm" (
  "id" TEXT NOT NULL,
  "templateId" TEXT NOT NULL,
  "termName" TEXT NOT NULL,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  CONSTRAINT "PerformanceTemplateTerm_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "PerformanceTemplateSubterm" (
  "id" TEXT NOT NULL,
  "templateId" TEXT NOT NULL,
  "subtermName" TEXT NOT NULL,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  CONSTRAINT "PerformanceTemplateSubterm_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "SchoolTemplateAssignment" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "templateType" TEXT NOT NULL,
  "templateId" TEXT NOT NULL,
  "appliedByUserId" TEXT NOT NULL,
  "appliedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "SchoolTemplateAssignment_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "AdmissionEnquiry_campusId_formNumber_key" ON "AdmissionEnquiry"("campusId", "formNumber");
CREATE UNIQUE INDEX IF NOT EXISTS "SchoolRoute_campusId_name_key" ON "SchoolRoute"("campusId", "name");
CREATE UNIQUE INDEX IF NOT EXISTS "NoticeView_noticeId_viewerUserId_key" ON "NoticeView"("noticeId", "viewerUserId");
CREATE UNIQUE INDEX IF NOT EXISTS "QuestionnaireResponse_questionnaireId_respondentUserId_key" ON "QuestionnaireResponse"("questionnaireId", "respondentUserId");
CREATE UNIQUE INDEX IF NOT EXISTS "StoreItem_campusId_itemCode_key" ON "StoreItem"("campusId", "itemCode");
CREATE UNIQUE INDEX IF NOT EXISTS "StaffCategory_campusId_name_key" ON "StaffCategory"("campusId", "name");
CREATE UNIQUE INDEX IF NOT EXISTS "StaffCategoryAssignment_categoryId_staffId_key" ON "StaffCategoryAssignment"("categoryId", "staffId");
CREATE UNIQUE INDEX IF NOT EXISTS "CommunicationCategoryRestriction_campusId_categoryId_channel_key" ON "CommunicationCategoryRestriction"("campusId", "categoryId", "channel");
CREATE UNIQUE INDEX IF NOT EXISTS "SubjectCategory_campusId_name_key" ON "SubjectCategory"("campusId", "name");
CREATE UNIQUE INDEX IF NOT EXISTS "SubjectType_campusId_name_key" ON "SubjectType"("campusId", "name");
CREATE UNIQUE INDEX IF NOT EXISTS "StudentOptionalSubject_studentId_sessionId_classId_subjectId_key" ON "StudentOptionalSubject"("studentId", "sessionId", "classId", "subjectId");
CREATE UNIQUE INDEX IF NOT EXISTS "AdminTemplateCatalog_templateType_templateCode_version_key" ON "AdminTemplateCatalog"("templateType", "templateCode", "version");
CREATE UNIQUE INDEX IF NOT EXISTS "PerformanceTemplateTerm_templateId_termName_key" ON "PerformanceTemplateTerm"("templateId", "termName");
CREATE UNIQUE INDEX IF NOT EXISTS "PerformanceTemplateSubterm_templateId_subtermName_key" ON "PerformanceTemplateSubterm"("templateId", "subtermName");
CREATE UNIQUE INDEX IF NOT EXISTS "SchoolTemplateAssignment_userId_templateType_key" ON "SchoolTemplateAssignment"("userId", "templateType");
CREATE INDEX IF NOT EXISTS "Message_campusId_batchId_idx" ON "Message"("campusId", "batchId");
CREATE INDEX IF NOT EXISTS "AdmissionEnquiry_campusId_enquiryDate_idx" ON "AdmissionEnquiry"("campusId", "enquiryDate");
