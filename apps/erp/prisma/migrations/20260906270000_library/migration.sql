CREATE TABLE "Book" (
    "id" TEXT NOT NULL,
    "campusId" TEXT NOT NULL,
    "isbn" TEXT,
    "title" TEXT NOT NULL,
    "author" TEXT,
    "publisher" TEXT,
    "qty" INTEGER NOT NULL DEFAULT 1,
    "rack" TEXT,
    "price" DECIMAL(12,2) NOT NULL DEFAULT 0,
    CONSTRAINT "Book_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "LibraryMember" (
    "id" TEXT NOT NULL,
    "campusId" TEXT NOT NULL,
    "memberNo" TEXT NOT NULL,
    "studentId" TEXT,
    "staffId" TEXT,
    CONSTRAINT "LibraryMember_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "BookIssue" (
    "id" TEXT NOT NULL,
    "bookId" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "issuedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dueOn" DATE NOT NULL,
    "returnedAt" TIMESTAMP(3),
    "fine" DECIMAL(12,2) NOT NULL DEFAULT 0,
    CONSTRAINT "BookIssue_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "Book_campusId_title_idx" ON "Book"("campusId", "title");
CREATE UNIQUE INDEX "LibraryMember_studentId_key" ON "LibraryMember"("studentId");
CREATE UNIQUE INDEX "LibraryMember_staffId_key" ON "LibraryMember"("staffId");
CREATE UNIQUE INDEX "LibraryMember_campusId_memberNo_key" ON "LibraryMember"("campusId", "memberNo");
CREATE INDEX "BookIssue_memberId_returnedAt_idx" ON "BookIssue"("memberId", "returnedAt");
ALTER TABLE "Book" ADD CONSTRAINT "Book_campusId_fkey" FOREIGN KEY ("campusId") REFERENCES "Campus"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "LibraryMember" ADD CONSTRAINT "LibraryMember_campusId_fkey" FOREIGN KEY ("campusId") REFERENCES "Campus"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "LibraryMember" ADD CONSTRAINT "LibraryMember_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "LibraryMember" ADD CONSTRAINT "LibraryMember_staffId_fkey" FOREIGN KEY ("staffId") REFERENCES "Staff"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "BookIssue" ADD CONSTRAINT "BookIssue_bookId_fkey" FOREIGN KEY ("bookId") REFERENCES "Book"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "BookIssue" ADD CONSTRAINT "BookIssue_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "LibraryMember"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
