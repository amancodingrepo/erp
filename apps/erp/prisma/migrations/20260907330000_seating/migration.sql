CREATE TABLE "SeatingBlock" (
    "id" TEXT NOT NULL,
    "campusId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "capacity" INTEGER NOT NULL,
    CONSTRAINT "SeatingBlock_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "SeatAssignment" (
    "id" TEXT NOT NULL,
    "blockId" TEXT NOT NULL,
    "examSubjectId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "seatNo" TEXT NOT NULL,
    CONSTRAINT "SeatAssignment_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "SeatingBlock_campusId_name_key" ON "SeatingBlock"("campusId", "name");
CREATE UNIQUE INDEX "SeatAssignment_examSubjectId_studentId_key" ON "SeatAssignment"("examSubjectId", "studentId");
CREATE UNIQUE INDEX "SeatAssignment_examSubjectId_blockId_seatNo_key" ON "SeatAssignment"("examSubjectId", "blockId", "seatNo");
ALTER TABLE "SeatingBlock" ADD CONSTRAINT "SeatingBlock_campusId_fkey" FOREIGN KEY ("campusId") REFERENCES "Campus"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "SeatAssignment" ADD CONSTRAINT "SeatAssignment_blockId_fkey" FOREIGN KEY ("blockId") REFERENCES "SeatingBlock"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "SeatAssignment" ADD CONSTRAINT "SeatAssignment_examSubjectId_fkey" FOREIGN KEY ("examSubjectId") REFERENCES "ExamSubject"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "SeatAssignment" ADD CONSTRAINT "SeatAssignment_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
